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
  static async fetchWikiDescription(scientificName: string): Promise<string> {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName)}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.extract || `${scientificName} - 暂无详细描述`;
    } catch (error) {
      console.error('获取维基百科描述失败:', error);
      return `${scientificName} - 请参考专业图鉴`;
    }
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