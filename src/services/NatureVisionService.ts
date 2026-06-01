// services/NatureVisionService.ts
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Nature Vision API 配置
// 免费 token 允许每分钟 1 次请求
// 获取 token: https://cvp.twenty.co/signup (需要注册)

const NATURE_VISION_API_URL = 'https://api.trynectar.com/v1/species';
const API_TOKEN = 'YOUR_API_TOKEN_HERE'; // 替换为你的实际 token

export interface SpeciesSuggestion {
  taxon: {
    name: string;           // 拉丁学名
    preferred_common_name: string | null;
    rank: string;           // species, genus, family 等
    source: string;         // GBIF, ITIS 等
  };
  score: number;            // 置信度 (0-1)
}

export interface IdentificationResponse {
  suggestions: SpeciesSuggestion[];
  image: {
    url: string;
    width: number;
    height: number;
  };
}

export class NatureVisionService {
  
    // 替换服务类中的识别方法
static async identifyMushroom(imageUri: string): Promise<SpeciesSuggestion[]> {
  // 1. 图片转base64 (代码不变)
  const base64Image = await this.imageToBase64(imageUri);
  
  // 2. 构建Pl@ntNet专用表单数据
  const formData = new FormData();
  formData.append('images', {
    uri: imageUri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as any);
  formData.append('organs', 'auto'); // 自动检测器官

  // 3. 调用Pl@ntNet API
  const response = await fetch(
    `https://my-api.plantnet.org/v2/identify/all?api-key=2b10xmDZWuCkR3QvlNEjAgklq&lang=en`,
    {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  // 4. 解析返回结果 (格式需按Pl@ntNet文档适配)
  const data = await response.json();
  return this.transformPlantNetResponse(data);
}

// 添加响应格式转换函数
private static transformPlantNetResponse(data: any): SpeciesSuggestion[] {
  // 根据 Pl@ntNet API 文档编写转换逻辑
  return data.results?.map((result: any) => ({
    taxon: {
      name: result.species?.scientificNameWithoutAuthor,
      preferred_common_name: result.species?.commonNames?.[0],
      rank: 'species',
      source: 'Pl@ntNet',
    },
    score: result.score,
  })) || [];
}

  /**
   * 识别蘑菇图片
   * @param imageUri 本地图片 URI
   * @returns 识别建议列表
   */
  /*
    访问 https://cvp.twenty.co/signup 注册账号

    登录后获取你的 API Token

    将 services/NatureVisionService.ts 中的 YOUR_API_TOKEN_HERE 替换为实际 Token
    */
//   static async identifyMushroom(imageUri: string): Promise<SpeciesSuggestion[]> {
//     try {
//       // 1. 将图片转换为 base64
//       const base64Image = await this.imageToBase64(imageUri);
      
//       // 2. 移除 data:image/...;base64, 前缀（如果存在）
//       const cleanBase64 = base64Image.includes(',') 
//         ? base64Image.split(',')[1] 
//         : base64Image;
      
//       // 3. 构建请求体
//       const requestBody = {
//         image: cleanBase64,
//         limit: 5,              // 返回前5个建议
//         include_common_names: true,
//       };
      
//       console.log('Sending request to Nature Vision API...');
      
//       // 4. 发送请求
//       const response = await fetch(NATURE_VISION_API_URL, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${API_TOKEN}`,
//           'Accept': 'application/json',
//         },
//         body: JSON.stringify(requestBody),
//       });
      
//       // 5. 检查响应状态
//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error('API Error:', response.status, errorText);
        
//         if (response.status === 429) {
//           throw new Error('API 请求频率限制 (1次/分钟)，请稍后再试');
//         } else if (response.status === 401) {
//           throw new Error('API Token 无效，请检查配置');
//         } else {
//           throw new Error(`API 请求失败: ${response.status}`);
//         }
//       }
      
//       // 6. 解析响应
//       const data = await response.json();
//       console.log('API Response:', JSON.stringify(data, null, 2));
      
//       // 7. 转换响应格式以兼容现有代码
//       return this.transformResponse(data);
      
//     } catch (error: any) {
//       console.error('Nature Vision API Error:', error);
//       throw new Error(`识别失败: ${error.message || '网络错误'}`);
//     }
//   }
  
  /**
   * 将本地图片转换为 base64
   */
  private static async imageToBase64(uri: string): Promise<string> {
    try {
      // Expo 的文件系统方法
        const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
        });

      return base64;
    } catch (error) {
      console.error('Image to base64 conversion failed:', error);
      throw new Error('图片处理失败');
    }
  }
  
  /**
   * 转换 API 响应格式以兼容现有代码
   */
  private static transformResponse(data: any): SpeciesSuggestion[] {
    // Nature Vision API 响应格式示例:
    // {
    //   "suggestions": [
    //     {
    //       "taxon": {
    //         "name": "Amanita muscaria",
    //         "preferred_common_name": "Fly Agaric",
    //         "rank": "species",
    //         "source": "GBIF"
    //       },
    //       "score": 0.95
    //     }
    //   ]
    // }
    
    if (!data.suggestions || !Array.isArray(data.suggestions)) {
      console.warn('Unexpected API response format:', data);
      return [];
    }
    
    return data.suggestions.map((suggestion: any) => ({
      taxon: {
        name: suggestion.taxon?.name || 'Unknown',
        preferred_common_name: suggestion.taxon?.preferred_common_name || null,
        rank: suggestion.taxon?.rank || 'unknown',
        source: suggestion.taxon?.source || 'Nature Vision',
      },
      score: suggestion.score || 0,
    }));
  }
  
  /**
   * 检查 API 可用性
   */
  static async checkApiHealth(): Promise<boolean> {
    try {
      // 使用一个简单的测试请求（最小尺寸的空白图片）
      const testImage = 'iVBORw0CcijrCfZBuqDzBWp3qSrBEZCqBUfQVz4CWGHWF91iaEwlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const response = await fetch(NATURE_VISION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          image: testImage,
          limit: 1,
        }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }
}

// 导出别名以兼容现有代码
export const MushroomService = NatureVisionService;