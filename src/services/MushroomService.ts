// src/services/MushroomService.ts
import { Mushroom } from '../types';
import { EDIBLE_MUSHROOMS_DB } from '../data/edibleMushrooms';
import { TOXIC_MUSHROOMS_DB } from '../data/toxicMushrooms';

export class MushroomService {
  // 获取可食用蘑菇（直接返回本地数据库）
  static async getEdibleMushrooms(latitude?: number, longitude?: number): Promise<Mushroom[]> {
    console.log('🍽️ 获取可食用蘑菇列表...');
    
    // 为每个蘑菇获取图片（异步）
    const mushroomsWithImages = await Promise.all(
      EDIBLE_MUSHROOMS_DB.map(async (mushroom) => {
        if (!mushroom.imageUrl) {
          const imageUrl = await this.fetchMushroomImage(mushroom.scientificName);
          return { ...mushroom, imageUrl };
        }
        return mushroom;
      })
    );
    
    console.log(`✅ 找到 ${mushroomsWithImages.length} 种可食用蘑菇`);
    return mushroomsWithImages;
  }

  // 获取有毒蘑菇（直接返回本地数据库）
  static async getToxicMushrooms(latitude?: number, longitude?: number): Promise<Mushroom[]> {
    console.log('☠️ 获取有毒蘑菇列表...');
    
    // 为每个蘑菇获取图片（异步）
    const mushroomsWithImages = await Promise.all(
      TOXIC_MUSHROOMS_DB.map(async (mushroom) => {
        if (!mushroom.imageUrl) {
          const imageUrl = await this.fetchMushroomImage(mushroom.scientificName);
          return { ...mushroom, imageUrl };
        }
        return mushroom;
      })
    );
    
    console.log(`✅ 找到 ${mushroomsWithImages.length} 种有毒蘑菇`);
    return mushroomsWithImages;
  }

  // 获取蘑菇图片（从 iNaturalist）
  static async fetchMushroomImage(scientificName: string): Promise<string | null> {
    try {
      console.log(`📷 获取图片: ${scientificName}`);
      
      const searchUrl = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&per_page=1`;
      const searchRes = await fetch(searchUrl);
      const searchJson = await searchRes.json();
      
      if (!searchJson.results || searchJson.results.length === 0) {
        console.log(`未找到学名: ${scientificName}`);
        return null;
      }
      
      const taxonId = searchJson.results[0].id;
      const taxonUrl = `https://api.inaturalist.org/v1/taxa/${taxonId}`;
      const taxonRes = await fetch(taxonUrl);
      const taxonJson = await taxonRes.json();
      const taxon = taxonJson.results?.[0];
      
      const imageUrl = taxon?.default_photo?.medium_url || null;
      console.log(`✅ 获取图片成功: ${imageUrl ? '有' : '无'}`);
      return imageUrl;
    } catch (error) {
      console.error(`获取图片失败 ${scientificName}:`, error);
      return null;
    }
  }

  // 获取维基百科描述
// src/services/MushroomService.ts

// 获取维基百科描述（修复版）
static async fetchWikiDescription(scientificName: string): Promise<string> {
  try {
    // 清理科学名称
    let cleanName = scientificName.trim();
    if (/spp\.?$/i.test(cleanName) || /sp\.?$/i.test(cleanName)) {
      const parts = cleanName.split(/\s+/);
      if (parts.length > 0) cleanName = parts[0];
    }
    
    console.log(`📖 获取维基百科描述: ${cleanName}`);
    
    // 方法1: 使用 Wikipedia Action API (最稳定)
    const actionUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&format=json&titles=${encodeURIComponent(cleanName)}&origin=*&redirects=1`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(actionUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'MushroomIdentifierApp/1.0 (https://github.com/your-app; your-email@example.com)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const text = await response.text();
    
    // 尝试解析 JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.log(`JSON 解析失败，响应前100字符: ${text.substring(0, 100)}`);
      return this.getLocalDescription(cleanName);
    }
    
    const pages = data.query?.pages;
    if (pages) {
      const pageId = Object.keys(pages)[0];
      const extract = pages[pageId]?.extract;
      
      if (extract && extract !== '' && extract !== ' ' && extract !== '\n') {
        console.log(`✅ 成功获取描述: ${cleanName}, 长度: ${extract.length}`);
        // 清理描述，限制长度
        const cleanedExtract = extract
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        // 限制描述长度，避免太长
        if (cleanedExtract.length > 500) {
          return cleanedExtract.substring(0, 500) + '...';
        }
        return cleanedExtract;
      }
    }
    
    // 如果没有找到，尝试搜索
    console.log(`未找到直接匹配，尝试搜索: ${cleanName}`);
    return await this.searchWikipedia(cleanName);
    
  } catch (error: any) {
    console.error(`维基百科获取失败 ${scientificName}:`, error.message);
    return this.getLocalDescription(scientificName);
  }
}

// 搜索维基百科（修复版）
static async searchWikipedia(query: string): Promise<string> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'MushroomIdentifierApp/1.0',
        'Accept': 'application/json',
      },
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      return this.getLocalDescription(query);
    }
    
    if (data.query?.search && data.query.search.length > 0) {
      const title = data.query.search[0].title;
      console.log(`找到搜索结果: ${title}`);
      
      // 获取搜索结果的摘要
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const summaryResponse = await fetch(summaryUrl, {
        headers: {
          'User-Agent': 'MushroomIdentifierApp/1.0',
          'Accept': 'application/json',
        },
      });
      
      if (summaryResponse.ok) {
        const summaryText = await summaryResponse.text();
        try {
          const summaryData = JSON.parse(summaryText);
          if (summaryData && summaryData.extract) {
            return summaryData.extract;
          }
        } catch (e) {
          console.log('解析摘要失败');
        }
      }
    }
    
    return this.getLocalDescription(query);
    
  } catch (error) {
    console.error('搜索失败:', error);
    return this.getLocalDescription(query);
  }
}

// 本地描述库（当无法获取网络描述时使用）
static getLocalDescription(scientificName: string): string {
  const descriptions: { [key: string]: string } = {
    'Morchella esculenta': '羊肚菌是世界著名的食用菌，味道鲜美，营养丰富。菌盖呈蜂窝状，形似羊肚。春末至秋初生于阔叶林或混交林中地上。',
    'Cantharellus cibarius': '鸡油菌呈杏黄色，菌肉肥厚，香气浓郁，是高档食用菌。夏秋季生于针叶林或混交林中地上。',
    'Boletus edulis': '牛肝菌菌盖厚实，菌肉白色，味道鲜美，是世界著名的食用菌。夏秋季生于针叶林或混交林中地上。',
    'Tricholoma matsutake': '松茸具有独特的香气，是珍贵的食用菌，营养价值极高。秋初生于松林或针阔混交林中地上。',
    'Lentinula edodes': '香菇是世界第二大食用菌，香气独特，营养丰富。冬春季生于阔叶树倒木上。',
    'Pleurotus ostreatus': '平菇肉质肥厚，口感鲜美，是最常见的食用菌之一。四季生于阔叶树枯木上。',
    'Amanita muscaria': '毒蝇伞是最著名的毒蘑菇，菌盖红色带白点，含有神经毒性物质。夏秋季生于针叶林或混交林中地上。',
    'Amanita phalloides': '死亡帽是最危险的蘑菇之一，含有鹅膏毒素，可导致肝衰竭死亡。夏秋季生于阔叶林中地上。',
    'Amanita virosa': '毁灭天使通体白色，含有剧毒，误食后果严重。夏秋季生于针叶林或混交林中地上。',
    'Psilocybe cubensis': '含有裸盖菇素，具有致幻作用，禁止食用。生于牛粪或肥沃土壤上。',
  };
  
  return descriptions[scientificName] || `${scientificName} - 请参考专业菌类图鉴获取详细描述。`;
}

  // 获取附近蘑菇（保留用于其他功能）
  static async getNearbyMushrooms(latitude: number, longitude: number): Promise<Mushroom[]> {
    // 返回可食用和有毒蘑菇的合并列表
    const edible = await this.getEdibleMushrooms();
    const toxic = await this.getToxicMushrooms();
    return [...edible, ...toxic];
  }

  // iNaturalist API v2 - 图片识别（保留）
  static async identifyMushroom(imageUri: string): Promise<any[]> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: 'mushroom.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      const response = await fetch('https://api.inaturalist.org/v1/computervision/score_image', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('iNaturalist API error:', error);
      throw new Error('识别失败，请重试');
    }
  }

  // 搜索蘑菇（保留）
  static async searchMushroomByName(name: string): Promise<any[]> {
    try {
      const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(name)}&per_page=10`;
      const response = await fetch(url);
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }
}