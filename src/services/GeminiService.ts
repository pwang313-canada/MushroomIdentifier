// src/services/GeminiService.ts
import * as FileSystem from 'expo-file-system/legacy';

const API_KEY = 'AIzaSyDTsUNmtri7JjE92ZFgNd3obccu2LaFh8A';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface GeminiSuggestion {
  name: string;
  scientificName: string;
  confidence: number;
  description?: string;
}

export class GeminiService {
  static async identifyMushroom(imageUri: string): Promise<GeminiSuggestion | null> {
    try {
      console.log('Reading image file...');

      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      let mimeType = 'image/jpeg';
      if (imageUri.endsWith('.png')) {
        mimeType = 'image/png';
      }

      // 改进的提示词 - 明确要求只返回 JSON
      const prompt = `Identify this mushroom.
Return ONLY a valid JSON object. Do not include any other text, explanation, or markdown.

Required JSON format:
{
  "commonName": "the common name of the mushroom",
  "scientificName": "the scientific name with genus and species"
}

Example for a button mushroom:
{
  "commonName": "Button Mushroom",
  "scientificName": "Agaricus bisporus"
}

Now identify the mushroom in the image:`;

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
          temperature: 0.1, // 降低温度以获得更一致的输出
          topK: 1,
          topP: 1,
        }
      };

      console.log('Sending request to Gemini API...');

      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('Gemini response status:', response.status);

      if (data.candidates && data.candidates.length > 0) {
        const textResponse = data.candidates[0].content.parts[0].text;
        console.log('Gemini raw response:', textResponse);

        const result = GeminiService.extractScientificName(textResponse);
        if (result && result.scientificName && result.scientificName !== 'based_on' && result.scientificName !== 'this_mushroom') {
          console.log('✅ Extracted - Name:', result.name);
          console.log('✅ Extracted - Scientific:', result.scientificName);
          return result;
        }
      }

      console.error('Failed to extract valid scientific name from response');
      return null;
    } catch (error) {
      console.error('Error identifying mushroom with Gemini:', error);
      return null;
    }
  }

  private static extractScientificName(text: string): GeminiSuggestion | null {
    try {
      let commonName = '';
      let scientificName = '';

      // 首先尝试解析 JSON
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          commonName = parsed.commonName || '';
          scientificName = parsed.scientificName || '';
          if (scientificName && this.isValidScientificName(scientificName)) {
            return {
              name: commonName || scientificName.split(' ')[0],
              scientificName: scientificName,
              confidence: 85,
            };
          }
        } catch (e) {
          console.log('JSON parsing failed, trying regex extraction');
        }
      }

      // 使用更精确的正则表达式查找科学名称
      // 科学名称格式: 两个单词，首字母大写，如 "Agaricus bisporus"
      const scientificPatterns = [
        /scientific name is \*\*([A-Z][a-z]+(?:\s+[a-z]+)?)\*\*/i,
        /scientific name is ([A-Z][a-z]+(?:\s+[a-z]+)?)/i,
        /\*\*([A-Z][a-z]+\s+[a-z]+)\*\*/i,
        /([A-Z][a-z]+\s+[a-z]+)(?=\s|\.|$)/,
      ];

      for (const pattern of scientificPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const candidate = match[1].trim();
          if (this.isValidScientificName(candidate)) {
            scientificName = candidate;
            break;
          }
        }
      }

      // 提取常见名称
      if (!commonName) {
        const commonPatterns = [
          /common name is \*\*([^*]+)\*\*/i,
          /is a \*\*([^*]+)\*\*/i,
          /this is a \*\*([^*]+)\*\*/i,
          /\*\*([^*]+)\s+Mushroom\*\*/i,
        ];

        for (const pattern of commonPatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            commonName = match[1].trim().replace(/\*\*/g, '');
            break;
          }
        }
      }

      if (scientificName && this.isValidScientificName(scientificName)) {
        return {
          name: commonName || scientificName.split(' ')[0],
          scientificName: scientificName,
          confidence: 85,
        };
      }

      return null;
    } catch (error) {
      console.error('Error extracting scientific name:', error);
      return null;
    }
  }

  private static isValidScientificName(name: string): boolean {
    if (!name) return false;
    // 排除常见的错误匹配
    const invalidNames = ['based_on', 'this_mushroom', 'based on', 'this mushroom', 'image', 'the image', 'picture'];
    if (invalidNames.includes(name.toLowerCase().replace(/\s/g, '_'))) {
      return false;
    }
    // 科学名称应该包含两个单词（属名和种名）
    const parts = name.trim().split(/\s+/);
    if (parts.length !== 2) return false;
    // 第一个单词应该首字母大写
    if (parts[0][0] !== parts[0][0].toUpperCase()) return false;
    // 不应该包含特殊字符
    if (/[^a-zA-Z\s]/.test(name)) return false;
    return true;
  }
}