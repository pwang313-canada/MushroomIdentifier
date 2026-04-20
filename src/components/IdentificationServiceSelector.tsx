// src/components/IdentificationServiceSelector.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface IdentificationServiceSelectorProps {
  onSelectService: (service: 'nyckel' | 'kindwise') => void;
  visible: boolean;
  onClose: () => void;
}

export function IdentificationServiceSelector({
  onSelectService,
  visible,
  onClose,
}: IdentificationServiceSelectorProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const handleSelect = (service: 'nyckel' | 'kindwise') => {
    onSelectService(service);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {currentLanguage === 'zh' ? '选择识别服务' : 'Select Identification Service'}
          </Text>
          <Text style={styles.modalSubtitle}>
            {currentLanguage === 'zh'
              ? '请选择用于识别蘑菇的AI服务'
              : 'Choose which AI service to identify the mushroom'}
          </Text>

          <TouchableOpacity
            style={[styles.serviceButton, styles.nyckelButton]}
            onPress={() => handleSelect('nyckel')}
          >
            <Text style={styles.serviceIcon}>🤖</Text>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>Nyckel</Text>
              <Text style={styles.serviceDescription}>
                {currentLanguage === 'zh'
                  ? '快速识别，支持自定义模型'
                  : 'Fast identification with custom model'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.serviceButton, styles.kindwiseButton]}
            onPress={() => handleSelect('kindwise')}
          >
            <Text style={styles.serviceIcon}>🍄</Text>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>Kindwise</Text>
              <Text style={styles.serviceDescription}>
                {currentLanguage === 'zh'
                  ? '专业蘑菇数据库，提供详细信息和可食用性'
                  : 'Professional mushroom database with detailed info & edibility'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>
              {currentLanguage === 'zh' ? '取消' : 'Cancel'}
            </Text>
          </TouchableOpacity>
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
    borderRadius: 20,
    padding: 24,
    width: '85%',
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  serviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  nyckelButton: {
    backgroundColor: '#f0f8ff',
  },
  kindwiseButton: {
    backgroundColor: '#e8f5e9',
  },
  serviceIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 12,
    color: '#666',
  },
  cancelButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#999',
  },
});