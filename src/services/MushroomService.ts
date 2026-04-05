// src/services/MushroomService.ts
import { Mushroom } from '../types';

export class MushroomService {
  // 获取蘑菇图片（从 iNaturalist）
  static async fetchMushroomImage(scientificName: string): Promise<string | null> {
    try {
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
      
      if (!taxon) return null;
      
      return taxon.default_photo?.medium_url || null;
    } catch (error) {
      console.error(`Fetch error for ${scientificName}:`, error);
      return null;
    }
  }

  // 获取维基百科描述（改进版）
// src/services/MushroomService.ts

static async fetchWikiDescription(scientificName: string): Promise<string> {
  try {
    // 清理科学名称
    let cleanName = scientificName.trim();
    if (/spp\.?$/i.test(cleanName) || /sp\.?$/i.test(cleanName)) {
      const parts = cleanName.split(/\s+/);
      if (parts.length > 0) cleanName = parts[0];
    }
    
    console.log(`Fetching Wikipedia for: ${cleanName}`);
    
    // 方法1: 使用 Action API (最稳定)
    const actionUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&format=json&titles=${encodeURIComponent(cleanName)}&origin=*&redirects=1`;
    
    const response = await fetch(actionUrl, {
      headers: {
        'User-Agent': 'MushroomIdentifierApp/1.0 (https://github.com/yourusername/mushroom-app; your-email@example.com) ReactNative',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const text = await response.text();
    
    // 尝试解析 JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse JSON, response starts with:', text.substring(0, 100));
      throw new Error('Invalid JSON response');
    }
    
    const pages = data.query?.pages;
    if (pages) {
      const pageId = Object.keys(pages)[0];
      const extract = pages[pageId]?.extract;
      
      if (extract && extract !== '') {
        console.log(`Found Wikipedia description for ${cleanName}, length: ${extract.length}`);
        return extract;
      }
    }
    
    // 如果没有找到，尝试搜索
    console.log(`No direct page found for ${cleanName}, trying search...`);
    return await this.searchWikipedia(cleanName);
    
  } catch (error) {
    console.error(`Wikipedia fetch error for ${scientificName}:`, error);
    return this.getLocalDescription(scientificName);
  }
}

// 搜索维基百科
static async searchWikipedia(query: string): Promise<string> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'MushroomIdentifierApp/1.0 (ReactNative)',
        'Accept': 'application/json',
      },
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Search response parse error');
      return this.getLocalDescription(query);
    }
    
    if (data.query?.search && data.query.search.length > 0) {
      const title = data.query.search[0].title;
      console.log(`Found search result: ${title}`);
      
      // 获取搜索结果的摘要
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const summaryResponse = await fetch(summaryUrl, {
        headers: {
          'User-Agent': 'MushroomIdentifierApp/1.0 (ReactNative)',
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
          console.error('Summary parse error');
        }
      }
    }
    
    return this.getLocalDescription(query);
    
  } catch (error) {
    console.error(`Wikipedia search error:`, error);
    return this.getLocalDescription(query);
  }
}

// 本地描述（当无法获取维基百科描述时使用）
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
  
  return descriptions[scientificName] || `${scientificName} - 请参考专业菌类图鉴获取详细描述。该蘑菇的详细信息可以通过维基百科或其他专业数据库查询。`;
}

  // 同时获取图片和描述
  static async fetchMushroomDetails(scientificName: string): Promise<{ imageUrl: string | null; description: string | null }> {
    const [imageUrl, description] = await Promise.all([
      this.fetchMushroomImage(scientificName),
      this.fetchWikiDescription(scientificName),
    ]);
    
    return { imageUrl, description };
  }

  // iNaturalist API v2 - 图片识别
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

  // 按名称搜索蘑菇
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