import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, isEnglish, isChinese } = useLanguage();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.languageButton, isEnglish && styles.activeButton]}
        onPress={() => setLanguage('en')}>
        <Text style={[styles.languageText, isEnglish && styles.activeText]}>EN</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.languageButton, isChinese && styles.activeButton]}
        onPress={() => setLanguage('zh')}>
        <Text style={[styles.languageText, isChinese && styles.activeText]}>中文</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    padding: 4,
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    minWidth: 50,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#4caf50',
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeText: {
    color: '#fff',
  },
});