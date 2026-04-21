// src/services/GeminiService.ts
import * as FileSystem from 'expo-file-system/legacy';
import APIManagerService from './APIManagerService';

export interface GeminiSuggestion {
  name: string;
  scientificName: string;
  confidence: number;
  description?: string;
}

export class GeminiService {
  private static startTime: number = 0;
  private static retryAttempts: Map<string, number> = new Map();
  private static MAX_RETRIES = 2; // 最多重试2次，避免无限循环

  static async identifyMushroom(imageUri: string, attempt: number = 0): Promise<GeminiSuggestion | null> {
    this.startTime = Date.now();

    // 防止无限重试
    if (attempt >= this.MAX_RETRIES) {
      console.error('Max retry attempts reached, giving up');
      return null;
    }

    try {
      // 获取可用的 Google API
      const apiConfig = await APIManagerService.getAvailableGoogleAPI();

      if (!apiConfig) {
        console.error('No available Google API keys');
        throw new Error('No available API keys. Please try again later.');
      }

      console.log(`Using API: ${apiConfig.id} (${apiConfig.model}) - Attempt ${attempt + 1}`);

      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      let mimeType = 'image/jpeg';
      if (imageUri.endsWith('.png')) {
        mimeType = 'image/png';
      }

      // 使用正确的模型名称 - 根据 API 文档，gemini-1.5-flash 是有效的
      // 但需要确认正确的端点
      let modelName = apiConfig.model;
      let apiUrl = apiConfig.baseUrl;

      // 如果 baseUrl 包含模型名称，直接使用；否则构建正确的 URL
      if (!apiUrl.includes(modelName)) {
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
      }

      const prompt = `Identify this mushroom. Return ONLY a valid JSON object. Format: {"commonName": "name", "scientificName": "Genus species"}`;

      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 1024,
        }
      };

      console.log(`Request URL: ${apiUrl}?key=${apiConfig.apiKey.substring(0, 10)}...`);

      const response = await fetch(`${apiUrl}?key=${apiConfig.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseTime = Date.now() - this.startTime;

      if (!response.ok) {
        const errorText = await response.text();
        let errorJson;
        try {
          errorJson = JSON.parse(errorText);
        } catch (e) {
          errorJson = { message: errorText };
        }

        console.error(`API ${apiConfig.id} error:`, response.status, errorJson);

        // 报告错误
        await APIManagerService.reportAPIError(apiConfig.id, {
          status: response.status,
          message: errorJson.error?.message || errorText
        });

        // 如果是配额错误，等待后重试
        if (response.status === 429) {
          const retryDelay = errorJson.error?.details?.find((d: any) => d['@type']?.includes('RetryInfo'))?.retryDelay;
          if (retryDelay) {
            const delayMs = this.parseRetryDelay(retryDelay);
            console.log(`Rate limited, waiting ${delayMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }

        // 重试
        console.log(`Retrying with next available API... (Attempt ${attempt + 1}/${this.MAX_RETRIES})`);
        return this.identifyMushroom(imageUri, attempt + 1);
      }

      const data = await response.json();

      // 记录成功使用
      await APIManagerService.recordAPIUsage(apiConfig.id, true, responseTime);

      if (data.candidates && data.candidates.length > 0) {
        const textResponse = data.candidates[0].content.parts[0].text;
        const result = this.extractMushroomInfo(textResponse);

        if (result) {
          console.log(`✅ Success with API: ${apiConfig.id} (${apiConfig.model})`);
          return result;
        }
      }

      return null;
    } catch (error) {
      console.error('Error identifying mushroom with Gemini:', error);
      return null;
    }
  }

  private static parseRetryDelay(delayStr: string): number {
    // 解析 "34s" 或 "34.42741501s" 格式
    const match = delayStr.match(/(\d+(?:\.\d+)?)s/);
    if (match) {
      return Math.ceil(parseFloat(match[1]) * 1000);
    }
    return 35000; // 默认 35 秒
  }

  private static extractMushroomInfo(text: string): GeminiSuggestion | null {
    try {
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          name: parsed.commonName || 'Unknown',
          scientificName: parsed.scientificName || 'Unknown',
          confidence: 85,
        };
      }
      return null;
    } catch (error) {
      console.error('Error parsing response:', error);
      return null;
    }
  }
}