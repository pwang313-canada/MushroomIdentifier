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

// 使用 Nyckel API 识别蘑菇（发霉检测）
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

// 转换 Nyckel 响应格式（专门处理发霉检测结果）
const transformNyckelResponse = (nyckelResult) => {
  console.log('原始响应:', nyckelResult);

  // 处理 labels 数组格式
  if (nyckelResult.labels && Array.isArray(nyckelResult.labels)) {
    const moldResult = nyckelResult.labels.find(label =>
      label.labelName === 'moldy' || label.labelName === 'Moldy' ||
      label.labelName === 'yes' || label.labelName === 'Yes'
    );

    const freshResult = nyckelResult.labels.find(label =>
      label.labelName === 'fresh' || label.labelName === 'Fresh' ||
      label.labelName === 'no' || label.labelName === 'No'
    );

    if (moldResult) {
      return {
        isMoldy: true,
        confidence: moldResult.confidence || moldResult.score || 0,
        label: '发霉',
        rawResults: nyckelResult.labels
      };
    } else if (freshResult) {
      return {
        isMoldy: false,
        confidence: freshResult.confidence || freshResult.score || 0,
        label: '新鲜',
        rawResults: nyckelResult.labels
      };
    }
  }

  // 处理直接的对象格式
  if (typeof nyckelResult === 'object') {
    // 查找发霉相关的键
    const moldyKeys = ['moldy', 'Moldy', 'yes', 'Yes', 'true', 'True'];
    const freshKeys = ['fresh', 'Fresh', 'no', 'No', 'false', 'False'];

    for (const [key, value] of Object.entries(nyckelResult)) {
      if (!['requestId', 'modelId', 'modelVersionId', 'elapsedTime'].includes(key)) {
        const confidence = typeof value === 'number' ? value :
                          (value && typeof value === 'object' && value.confidence) ? value.confidence : 0;

        if (moldyKeys.includes(key)) {
          return {
            isMoldy: true,
            confidence: confidence,
            label: '发霉',
            rawResults: nyckelResult
          };
        }
        if (freshKeys.includes(key)) {
          return {
            isMoldy: false,
            confidence: confidence,
            label: '新鲜',
            rawResults: nyckelResult
          };
        }
      }
    }
  }

  // 默认返回
  return {
    isMoldy: false,
    confidence: 0,
    label: '未知',
    rawResults: nyckelResult
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