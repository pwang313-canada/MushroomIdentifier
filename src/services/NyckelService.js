// services/NyckelService.js
import { File, Paths } from 'expo-file-system';

// 你的 Nyckel 凭证
const CLIENT_ID = 'ki0r5ualvhji3y0jhub3pr7a4d1jrnd6';
const CLIENT_SECRET = 'xxamqx4i26x1oxpk4iycolfsbqmrsqu83dk6oeskpt1jt5m6nge8o1hbhhb0bdpb';
const FUNCTION_ID = 'mushroom-species';

// 缓存 Access Token
let cachedToken = null;
let tokenExpiryTime = null;

// 获取 Access Token
const getAccessToken = async () => {
  if (cachedToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return cachedToken;
  }

  try {
    const response = await fetch('https://www.nyckel.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`,
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiryTime = Date.now() + 55 * 60 * 1000;
    return cachedToken;
  } catch (error) {
    console.error('Failed to get access token:', error);
    throw new Error('Authentication failed. Please check your API credentials.');
  }
};

// 图片转 Base64 - 使用新的 File API
const imageToBase64 = async (uri) => {
  try {
    const file = new File(uri);

    if (!file.exists) {
      throw new Error('图片文件不存在: ' + uri);
    }

    const base64String = await file.base64();
    return `data:image/jpeg;base64,${base64String}`;
  } catch (error) {
    console.error('图片转 Base64 失败:', error);
    throw new Error(`图片处理失败: ${error.message}`);
  }
};

// 使用 Nyckel API 识别蘑菇
export const identifyMushroomWithNyckel = async (imageUri) => {
  try {
    const accessToken = await getAccessToken();
    const base64Image = await imageToBase64(imageUri);

    console.log('正在调用 Nyckel API，函数 ID:', FUNCTION_ID);

    const response = await fetch(`https://www.nyckel.com/v1/functions/${FUNCTION_ID}/invoke?labelCount=3`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: base64Image,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nyckel API 错误:', response.status, errorText);

      if (response.status === 401) {
        console.log('Token 过期，正在刷新...');
        cachedToken = null;
        tokenExpiryTime = null;
        return identifyMushroomWithNyckel(imageUri);
      }

      throw new Error(`API 错误: ${response.status}`);
    }

    const result = await response.json();
    console.log('Nyckel 响应:', JSON.stringify(result, null, 2));
    return transformNyckelResponse(result);
  } catch (error) {
    console.error('识别过程出错:', error);
    throw error;
  }
};

// 转换 Nyckel 响应格式 - 解析 labelConfidences 数组
const transformNyckelResponse = (nyckelResult) => {
  console.log('转换原始响应:', nyckelResult);

  const suggestions = [];

  // 格式: { labelConfidences: [{ labelName: "Agaricus Bisporus", confidence: 0.675 }, ...] }
  if (nyckelResult.labelConfidences && Array.isArray(nyckelResult.labelConfidences)) {
    // 按置信度排序（从高到低）
    const sortedLabels = [...nyckelResult.labelConfidences].sort((a, b) => b.confidence - a.confidence);

    for (const label of sortedLabels) {
      suggestions.push({
        taxon: {
          name: label.labelName || 'Unknown',
          preferred_common_name: label.labelName || 'Unknown',
          scientific_name: label.labelName,
          source: 'Nyckel AI',
        },
        score: label.confidence || 0,
      });
    }

    console.log('转换后的建议列表:', suggestions);

    return {
      success: true,
      suggestions: suggestions,
      topResult: suggestions[0] || null,
      count: suggestions.length
    };
  }

  // 单个结果格式（兼容）
  if (nyckelResult.labelName) {
    const suggestion = {
      taxon: {
        name: nyckelResult.labelName,
        preferred_common_name: nyckelResult.labelName,
        scientific_name: nyckelResult.labelName,
        source: 'Nyckel AI',
      },
      score: nyckelResult.confidence || 0,
    };

    return {
      success: true,
      suggestions: [suggestion],
      topResult: suggestion,
      count: 1
    };
  }

  // 错误或未知格式
  console.error('未知的响应格式:', nyckelResult);
  return {
    success: false,
    suggestions: [],
    topResult: null,
    count: 0,
    error: '未知的响应格式'
  };
};

// 检查 API 健康状态
export const checkNyckelHealth = async () => {
  try {
    const token = await getAccessToken();
    console.log('Nyckel 认证成功');
    return !!token;
  } catch (error) {
    console.error('健康检查失败:', error);
    return false;
  }
};

export default {
  identifyMushroomWithNyckel,
  checkNyckelHealth,
};