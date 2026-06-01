// src/services/APIManagerService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface APIKeyConfig {
  id: string;
  provider: 'google' | 'nyckel' | 'kindwise';
  model: string;
  apiKey: string;
  baseUrl: string;
  dailyLimit: number;
  usedCount: number;
  lastResetDate: string;
  isActive: boolean;
  priority: number;
  retryCount?: number;
  lastRetryTime?: number;
}

export interface APIMetrics {
  successRate: number;
  avgResponseTime: number;
  lastError: string | null;
}

class APIManagerService {
  private apiKeys: APIKeyConfig[] = [];
  private metrics: Map<string, APIMetrics> = new Map();
  private MAX_RETRIES = 3;
  private RETRY_DELAY = 5000;

  // 从后台获取的 API 密钥配置
  async loadAPIKeysFromBackend(): Promise<void> {
    try {
      // TODO: 替换为你的后端 API 地址
      // const response = await fetch('https://your-backend.com/api/keys');
      // const data = await response.json();

      // ============================================
      // 把 API 密钥配置放在这里！！！
      // ============================================
      const keys: APIKeyConfig[] = [
        {
          id: 'gemini_2.5_flash_1',
          provider: 'google',
          model: 'gemini-2.5-flash',           // ✅ valid
          apiKey: 'AIzaSyDTsUNmtri7JjE92ZFgNd3obccu2LaFh8A',
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
          dailyLimit: 50,
          usedCount: 0,
          lastResetDate: new Date().toDateString(),
          isActive: true,
          priority: 1,
        },
        {
          id: 'gemini_2.5_pro_1',               // changed name
          provider: 'google',
          model: 'gemini-2.5-pro',              // ✅ valid fallback
          apiKey: 'AIzaSyCC2W01kdo6X6YQrerCnQjtvT_VIfIrQ-4',
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
          dailyLimit: 20,
          usedCount: 0,
          lastResetDate: new Date().toDateString(),
          isActive: true,
          priority: 2,
        },
        // Kindwise 配置
        {
          id: 'kindwise_1',
          provider: 'kindwise',
          model: 'kindwise',
          apiKey: '6rGapzoX9VI9nOG7erd4oks1CMX2vrAXnIgC4EEbBfQdKo5ERj',
          baseUrl: 'https://mushroom.kindwise.com/api/v1/identification',
          dailyLimit: 500,
          usedCount: 0,
          lastResetDate: new Date().toDateString(),
          isActive: true,
          priority: 4,
        },
      ];
      // ============================================

      // 检查是否需要重置每日计数
      for (const key of keys) {
        if (key.provider === 'google') {
          key.retryCount = 0;
          key.usedCount = 0;
          key.isActive = true;
          await this.saveKeyData(key.id, 0, new Date().toDateString(), 0);
        }
        const today = new Date().toDateString();
        const savedData = await this.getKeyData(key.id);
        if (savedData && savedData.lastResetDate === today) {
          key.usedCount = savedData.usedCount;
          key.retryCount = savedData.retryCount || 0;
        } else {
          key.usedCount = 0;
          key.retryCount = 0;
          await this.saveKeyData(key.id, key.usedCount, today, key.retryCount);
        }
      }

      this.apiKeys = keys;
      await this.saveKeysToCache();
    } catch (error) {
      console.error('Error loading API keys:', error);
      await this.loadKeysFromCache();
    }
  }

  // 获取可用的 API（带重试限制）
  async getAvailableAPI(provider?: 'google' | 'nyckel' | 'kindwise'): Promise<APIKeyConfig | null> {
    await this.ensureKeysLoaded();

    let candidates = [...this.apiKeys];

    if (provider) {
      candidates = candidates.filter(k => k.provider === provider);
    }

    // 过滤：活跃的、未超限的、未超过重试次数的
    const available = candidates
      .filter(k => {
        if (!k.isActive || k.usedCount >= k.dailyLimit) return false;

        const retryCount = k.retryCount || 0;
        if (retryCount >= this.MAX_RETRIES) return false;

        const lastRetry = k.lastRetryTime || 0;
        if (Date.now() - lastRetry < this.RETRY_DELAY) return false;

        return true;
      })
      .sort((a, b) => a.priority - b.priority);

    if (available.length === 0) {
      console.warn('No available API keys, all keys exhausted or in cooldown');
      return null;
    }

    return available[0];
  }

  // 获取 Google Gemini 可用密钥
  async getAvailableGoogleAPI(): Promise<APIKeyConfig | null> {
    return this.getAvailableAPI('google');
  }

  // 记录 API 使用情况
  async recordAPIUsage(apiId: string, success: boolean, responseTime?: number): Promise<void> {
    const api = this.apiKeys.find(k => k.id === apiId);
    if (api) {
      api.usedCount++;
      await this.saveKeyData(api.id, api.usedCount, api.lastResetDate, api.retryCount || 0);

      const metrics = this.metrics.get(apiId) || {
        successRate: 1,
        avgResponseTime: 1000,
        lastError: null,
      };

      const newSuccessRate = (metrics.successRate * 9 + (success ? 1 : 0)) / 10;
      if (responseTime) {
        const newAvgTime = (metrics.avgResponseTime * 9 + responseTime) / 10;
        metrics.avgResponseTime = newAvgTime;
      }
      metrics.successRate = newSuccessRate;
      if (!success) {
        metrics.lastError = new Date().toISOString();
      }

      this.metrics.set(apiId, metrics);

      if (metrics.successRate < 0.5 && api.usedCount > 10) {
        api.isActive = false;
        console.warn(`API ${apiId} disabled due to low success rate: ${metrics.successRate}`);
      }
    }
  }

  // 报告错误，触发切换
  async reportAPIError(apiId: string, error: any): Promise<void> {
    const api = this.apiKeys.find(k => k.id === apiId);
    if (api) {
      api.retryCount = (api.retryCount || 0) + 1;
      api.lastRetryTime = Date.now();

      await this.recordAPIUsage(apiId, false);

      if (error?.message?.includes('quota') || error?.status === 429) {
        api.isActive = false;
        console.log(`API ${api.id} temporarily disabled due to quota/error`);
      }

      if (error?.status === 404) {
        api.isActive = false;
        console.log(`API ${api.id} disabled due to model not found (404)`);
      }
    }
  }

  // 获取使用统计
  async getUsageStats(): Promise<any> {
    const stats: any = {};
    for (const api of this.apiKeys) {
      stats[api.id] = {
        usedCount: api.usedCount,
        dailyLimit: api.dailyLimit,
        remaining: api.dailyLimit - api.usedCount,
        isActive: api.isActive,
        retryCount: api.retryCount || 0,
        metrics: this.metrics.get(api.id),
      };
    }
    return stats;
  }

  // 私有辅助方法
  private async ensureKeysLoaded(): Promise<void> {
    if (this.apiKeys.length === 0) {
      await this.loadAPIKeysFromBackend();
    }
  }

  private async saveKeyData(keyId: string, usedCount: number, date: string, retryCount: number): Promise<void> {
    await AsyncStorage.setItem(`api_key_${keyId}`, JSON.stringify({ usedCount, lastResetDate: date, retryCount }));
  }

  private async getKeyData(keyId: string): Promise<{ usedCount: number; lastResetDate: string; retryCount: number } | null> {
    const data = await AsyncStorage.getItem(`api_key_${keyId}`);
    return data ? JSON.parse(data) : null;
  }

  private async saveKeysToCache(): Promise<void> {
    await AsyncStorage.setItem('api_keys_cache', JSON.stringify(this.apiKeys));
  }

  private async loadKeysFromCache(): Promise<void> {
    const cached = await AsyncStorage.getItem('api_keys_cache');
    if (cached) {
      this.apiKeys = JSON.parse(cached);
    }
  }
}

export default new APIManagerService();