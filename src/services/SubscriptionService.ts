// src/services/SubscriptionService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  freeUsageCount: number;
  remainingFreeUses: number;
  subscriptionExpiryDate: string | null;
}

class SubscriptionService {
  private FREE_TRIAL_LIMIT = 3;
  private STORAGE_KEYS = {
    IS_SUBSCRIBED: '@subscription_is_subscribed',
    FREE_USAGE_COUNT: '@subscription_free_usage_count',
    SUBSCRIPTION_EXPIRY: '@subscription_expiry_date',
  };

  // 获取当前订阅状态
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const isSubscribed = await AsyncStorage.getItem(this.STORAGE_KEYS.IS_SUBSCRIBED) === 'true';
      const freeUsageCount = parseInt(await AsyncStorage.getItem(this.STORAGE_KEYS.FREE_USAGE_COUNT) || '0', 10);
      const subscriptionExpiryDate = await AsyncStorage.getItem(this.STORAGE_KEYS.SUBSCRIPTION_EXPIRY);

      // 检查订阅是否过期
      let isValidSubscription = isSubscribed;
      if (isSubscribed && subscriptionExpiryDate) {
        const expiry = new Date(subscriptionExpiryDate);
        if (expiry < new Date()) {
          isValidSubscription = false;
          await this.cancelSubscription();
        }
      }

      return {
        isSubscribed: isValidSubscription,
        freeUsageCount,
        remainingFreeUses: Math.max(0, this.FREE_TRIAL_LIMIT - freeUsageCount),
        subscriptionExpiryDate: subscriptionExpiryDate,
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return {
        isSubscribed: false,
        freeUsageCount: 0,
        remainingFreeUses: this.FREE_TRIAL_LIMIT,
        subscriptionExpiryDate: null,
      };
    }
  }

  // 检查是否可以继续使用识别功能
  async canUseFeature(): Promise<boolean> {
    const status = await this.getSubscriptionStatus();
    return status.isSubscribed || status.remainingFreeUses > 0;
  }

  // 记录一次使用
  async recordUsage(): Promise<{ allowed: boolean; remainingFreeUses: number }> {
    const status = await this.getSubscriptionStatus();

    // 如果已订阅，总是允许
    if (status.isSubscribed) {
      return { allowed: true, remainingFreeUses: -1 };
    }

    // 检查免费次数
    if (status.freeUsageCount < this.FREE_TRIAL_LIMIT) {
      const newCount = status.freeUsageCount + 1;
      await AsyncStorage.setItem(this.STORAGE_KEYS.FREE_USAGE_COUNT, newCount.toString());
      return { allowed: true, remainingFreeUses: this.FREE_TRIAL_LIMIT - newCount };
    }

    return { allowed: false, remainingFreeUses: 0 };
  }

  // 激活订阅（月付 $4.99 或年付 $49.99）
  async activateSubscription(plan: 'monthly' | 'yearly'): Promise<boolean> {
    try {
      // 这里应该集成真实的支付系统（如 Stripe, RevenueCat, Google Play Billing 等）
      // 这里模拟订阅激活
      const expiryDate = new Date();
      if (plan === 'monthly') {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }

      await AsyncStorage.setItem(this.STORAGE_KEYS.IS_SUBSCRIBED, 'true');
      await AsyncStorage.setItem(this.STORAGE_KEYS.SUBSCRIPTION_EXPIRY, expiryDate.toISOString());

      return true;
    } catch (error) {
      console.error('Error activating subscription:', error);
      return false;
    }
  }

  // 取消订阅
  async cancelSubscription(): Promise<void> {
    await AsyncStorage.setItem(this.STORAGE_KEYS.IS_SUBSCRIBED, 'false');
    await AsyncStorage.removeItem(this.STORAGE_KEYS.SUBSCRIPTION_EXPIRY);
  }

  // 重置免费试用（用于测试）
  async resetFreeTrial(): Promise<void> {
    await AsyncStorage.setItem(this.STORAGE_KEYS.FREE_USAGE_COUNT, '0');
  }

  // 获取订阅价格
  getSubscriptionPrices() {
    return {
      monthly: { price: 4.99, currency: 'USD', period: 'month' },
      yearly: { price: 49.99, currency: 'USD', period: 'year', savings: 'Save 16%' },
    };
  }
}

export default new SubscriptionService();