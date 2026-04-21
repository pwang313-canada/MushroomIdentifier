// src/services/WikipediaService.ts

export interface WikipediaSearchResult {
  title: string;
  pageid: number;
  snippet: string;
  url: string;
  thumbnail?: string;
  extract?: string;
  description?: string;
}

export interface WikipediaPageInfo {
  title: string;
  pageid: number;
  extract: string;
  thumbnail?: string;
  fullurl: string;
  description?: string;
}

class WikipediaService {
  private baseUrl = 'https://en.wikipedia.org/w/api.php';
  private chineseBaseUrl = 'https://zh.wikipedia.org/w/api.php';
  private userAgent = 'MushroomIdentifier/1.0 (https://github.com/your-repo)';

  // 搜索蘑菇 - 支持中英文
  async searchMushrooms(query: string, limit: number = 20): Promise<WikipediaSearchResult[]> {
    try {
      // 检测是否为中文查询
      const isChinese = /[\u4e00-\u9fa5]/.test(query);
      const apiUrl = isChinese ? this.chineseBaseUrl : this.baseUrl;

      console.log(`Searching for: ${query} (${isChinese ? 'Chinese' : 'English'}) using ${apiUrl}`);

      // 使用 opensearch API 进行搜索（更可靠）
      const searchUrl = `${apiUrl}?action=opensearch&search=${encodeURIComponent(query)}&limit=${limit}&namespace=0&format=json&origin=*`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        }
      });

      const data = await response.json();

      if (!data || !Array.isArray(data) || data.length < 4) {
        console.log('No results from opensearch, trying regular search...');
        return this.searchWithQueryAPI(query, isChinese);
      }

      // opensearch 返回格式: [query, [titles], [descriptions], [urls]]
      const titles = data[1] || [];
      const descriptions = data[2] || [];
      const urls = data[3] || [];

      const results: WikipediaSearchResult[] = [];

      for (let i = 0; i < titles.length; i++) {
        const title = titles[i];
        const description = descriptions[i];
        const url = urls[i];

        // 检查是否与蘑菇相关
        if (this.isMushroomRelated(title, description)) {
          // 获取页面摘要和图片
          const pageInfo = await this.getPageInfo(title, isChinese);

          results.push({
            title: title,
            pageid: i,
            snippet: description || pageInfo?.extract || '',
            url: url,
            thumbnail: pageInfo?.thumbnail,
            extract: pageInfo?.extract,
            description: description,
          });
        }
      }

      console.log(`Found ${results.length} mushroom results for "${query}"`);
      return results;

    } catch (error) {
      console.error('Wikipedia search error:', error);
      return [];
    }
  }

  // 备用搜索方法：使用 query API
  private async searchWithQueryAPI(query: string, isChinese: boolean): Promise<WikipediaSearchResult[]> {
    try {
      const apiUrl = isChinese ? this.chineseBaseUrl : this.baseUrl;
      const searchUrl = `${apiUrl}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=0&srlimit=20&format=json&origin=*`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        }
      });

      const data = await response.json();

      if (!data.query || !data.query.search) {
        return [];
      }

      const pageIds = data.query.search.map((item: any) => item.pageid).join('|');

      // 获取详细信息
      const detailUrl = `${apiUrl}?action=query&pageids=${pageIds}&prop=extracts|pageimages|info&exintro=1&explaintext=1&exsentences=3&pithumbsize=200&inprop=url&format=json&origin=*`;

      const detailResponse = await fetch(detailUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        }
      });

      const detailData = await detailResponse.json();
      const pages = detailData.query.pages;

      const results: WikipediaSearchResult[] = [];

      for (const item of data.query.search) {
        const page = pages[item.pageid];
        if (page && this.isMushroomRelated(page.title, page.extract || item.snippet)) {
          results.push({
            title: page.title,
            pageid: item.pageid,
            snippet: this.cleanSnippet(page.extract || item.snippet),
            url: page.fullurl || `https://${isChinese ? 'zh' : 'en'}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
            thumbnail: page.thumbnail?.source,
            extract: page.extract,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Query API search error:', error);
      return [];
    }
  }

  // 获取页面详细信息
  async getPageInfo(title: string, isChinese: boolean = false): Promise<{ extract: string; thumbnail?: string } | null> {
    try {
      const apiUrl = isChinese ? this.chineseBaseUrl : this.baseUrl;
      const url = `${apiUrl}?action=query&titles=${encodeURIComponent(title)}&prop=extracts|pageimages&exintro=1&explaintext=1&pithumbsize=200&format=json&origin=*`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        }
      });

      const data = await response.json();
      const pages = data.query.pages;
      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];

      if (page && page.pageid) {
        return {
          extract: page.extract || '',
          thumbnail: page.thumbnail?.source,
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching page info:', error);
      return null;
    }
  }

  // 检查是否与蘑菇相关
  private isMushroomRelated(title: string, content: string): boolean {
    const mushroomKeywords = [
      // 英文关键词
      'mushroom', 'fungus', 'fungi', 'agaricus', 'boletus', 'pleurotus',
      'ganoderma', 'amanita', 'cantharellus', 'lentinula', 'tuber',
      'hericium', 'cordyceps', 'tremella', 'auricularia', 'flammulina',
      'coprinus', 'mycena', 'russula', 'lactarius', 'cortinarius',
      'morchella', 'hydnum', 'craterellus', 'calocybe', 'hypsizygus',
      'volvariella', 'pholiota', 'armillaria', 'lycoperdon',
      // 中文关键词
      '香菇', '蘑菇', '灵芝', '牛肝菌', '鸡油菌', '平菇', '金针菇', '木耳', '银耳',
      '冬虫夏草', '猴头菇', '松露', '杏鲍菇', '茶树菇', '滑子菇', '草菇',
      '口蘑', '松茸', '竹荪', '马勃', '红菇', '乳菇', '丝膜菌'
    ];

    const titleLower = title.toLowerCase();
    const contentLower = (content || '').toLowerCase();

    for (const keyword of mushroomKeywords) {
      if (titleLower.includes(keyword.toLowerCase()) || contentLower.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    // 对于中文标题，放宽条件
    if (/[\u4e00-\u9fa5]/.test(title)) {
      // 如果标题包含"菌"或"菇"，很可能是蘑菇
      if (title.includes('菌') || title.includes('菇')) {
        return true;
      }
    }

    return false;
  }

  // 清理摘要文本
  private cleanSnippet(snippet: string): string {
    return snippet
      .replace(/<span class="searchmatch">/g, '')
      .replace(/<\/span>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  // 按分类获取蘑菇列表
  async getMushroomsByCategory(category: string = 'Edible_mushrooms', limit: number = 50): Promise<string[]> {
    try {
      const url = `${this.baseUrl}?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(category)}&cmtype=page&cmlimit=${limit}&format=json&origin=*`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        }
      });

      const data = await response.json();

      if (data.query && data.query.categorymembers) {
        return data.query.categorymembers.map((item: any) => item.title);
      }

      return [];
    } catch (error) {
      console.error('Error fetching category pages:', error);
      return [];
    }
  }

  // 搜索特定语言的维基百科
  async searchInLanguage(query: string, language: string = 'zh', limit: number = 10): Promise<WikipediaSearchResult[]> {
    try {
      const apiUrl = `https://${language}.wikipedia.org/w/api.php`;
      const searchUrl = `${apiUrl}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=0&srlimit=${limit}&format=json&origin=*`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': this.userAgent,
        }
      });

      const data = await response.json();

      if (!data.query || !data.query.search) {
        return [];
      }

      const results: WikipediaSearchResult[] = [];

      for (const item of data.query.search) {
        results.push({
          title: item.title,
          pageid: item.pageid,
          snippet: this.cleanSnippet(item.snippet),
          url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
        });
      }

      return results;
    } catch (error) {
      console.error(`Search in ${language} error:`, error);
      return [];
    }
  }
}

export default new WikipediaService();