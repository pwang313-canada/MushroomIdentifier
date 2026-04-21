// src/components/SubscriptionModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import SubscriptionService from '../services/SubscriptionService';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: (subscribed: boolean) => void;
  remainingUses?: number;
}

export function SubscriptionModal({ visible, onClose, remainingUses = 0 }: SubscriptionModalProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  const prices = SubscriptionService.getSubscriptionPrices();

  const handleSubscribe = async () => {
    setLoading(true);
    const success = await SubscriptionService.activateSubscription(selectedPlan);
    setLoading(false);
    if (success) {
      onClose(true);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    // 这里应该实现恢复购买的逻辑
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    // 检查是否有有效的订阅
    const status = await SubscriptionService.getSubscriptionStatus();
    if (status.isSubscribed) {
      onClose(true);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => onClose(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* 关闭按钮 */}
          <TouchableOpacity style={styles.closeButton} onPress={() => onClose(false)}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* 标题 */}
          <View style={styles.header}>
            <Text style={styles.title}>🍄 {currentLanguage === 'zh' ? '订阅会员' : 'Subscribe'}</Text>
            <Text style={styles.subtitle}>
              {remainingUses === 0 && currentLanguage === 'zh'
                ? '您的免费试用次数已用完'
                : remainingUses === 0 && currentLanguage === 'en'
                ? 'Your free trial has ended'
                : currentLanguage === 'zh'
                ? `您还剩 ${remainingUses} 次免费识别`
                : `You have ${remainingUses} free identifications left`}
            </Text>
          </View>

          {/* 功能列表 */}
          <View style={styles.features}>
            <Text style={styles.featureItem}>✅ {currentLanguage === 'zh' ? '无限次蘑菇识别' : 'Unlimited mushroom identification'}</Text>
            <Text style={styles.featureItem}>✅ {currentLanguage === 'zh' ? '三种AI识别引擎' : 'Three AI recognition engines'}</Text>
            <Text style={styles.featureItem}>✅ {currentLanguage === 'zh' ? '识别历史记录保存' : 'Save identification history'}</Text>
            <Text style={styles.featureItem}>✅ {currentLanguage === 'zh' ? '位置标记和地图' : 'Location tagging & map'}</Text>
            <Text style={styles.featureItem}>✅ {currentLanguage === 'zh' ? 'Wikipedia 详情链接' : 'Wikipedia details link'}</Text>
          </View>

          {/* 套餐选择 */}
          <View style={styles.plansContainer}>
            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <Text style={styles.planName}>{currentLanguage === 'zh' ? '月度会员' : 'Monthly'}</Text>
              <Text style={styles.planPrice}>${prices.monthly.price}</Text>
              <Text style={styles.planPeriod}>/{prices.monthly.period}</Text>
              {selectedPlan === 'monthly' && <Text style={styles.selectedBadge}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('yearly')}
            >
              <Text style={styles.planName}>{currentLanguage === 'zh' ? '年度会员' : 'Yearly'}</Text>
              <Text style={styles.planPrice}>${prices.yearly.price}</Text>
              <Text style={styles.planPeriod}>/{prices.yearly.period}</Text>
              <Text style={styles.savingsBadge}>{prices.yearly.savings}</Text>
              {selectedPlan === 'yearly' && <Text style={styles.selectedBadge}>✓</Text>}
            </TouchableOpacity>
          </View>

          {/* 订阅按钮 */}
          <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.subscribeButtonText}>
                {currentLanguage === 'zh' ? '订阅并继续' : 'Subscribe & Continue'}
              </Text>
            )}
          </TouchableOpacity>

          {/* 恢复购买 */}
          <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
            <Text style={styles.restoreButtonText}>
              {currentLanguage === 'zh' ? '恢复购买' : 'Restore Purchase'}
            </Text>
          </TouchableOpacity>

          {/* 条款 */}
          <Text style={styles.termsText}>
            {currentLanguage === 'zh'
              ? '订阅将自动续订，可随时取消。付款将记入您的账户。'
              : 'Subscription auto-renews, cancel anytime. Payment will be charged to your account.'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#999',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  features: {
    marginBottom: 24,
  },
  featureItem: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
  },
  plansContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#4caf50',
    backgroundColor: '#e8f5e9',
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  planPeriod: {
    fontSize: 12,
    color: '#999',
  },
  savingsBadge: {
    fontSize: 10,
    color: '#ff9800',
    marginTop: 4,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 16,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  subscribeButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restoreButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#2196f3',
    fontSize: 14,
  },
  termsText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});