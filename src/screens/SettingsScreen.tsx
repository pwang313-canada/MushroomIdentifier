// src/screens/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { globalStyles } from '../styles/globalStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from '../services/DatabaseService';

export function SettingsScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const [notifications, setNotifications] = useState(false);
  const [saveLocation, setSaveLocation] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [identificationCount, setIdentificationCount] = useState(0);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      const savedNotifications = await AsyncStorage.getItem('notifications');
      const savedLocation = await AsyncStorage.getItem('saveLocation');
      const savedDarkMode = await AsyncStorage.getItem('darkMode');

      if (savedNotifications !== null) setNotifications(savedNotifications === 'true');
      if (savedLocation !== null) setSaveLocation(savedLocation === 'true');
      if (savedDarkMode !== null) setDarkMode(savedDarkMode === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadStats = async () => {
    try {
      const history = await DatabaseService.getAllIdentifications();
      setIdentificationCount(history.length);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const saveSetting = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  const handleNotificationsChange = (value: boolean) => {
    setNotifications(value);
    saveSetting('notifications', value);
    if (value) {
      Alert.alert(
        currentLanguage === 'zh' ? '通知已开启' : 'Notifications Enabled',
        currentLanguage === 'zh'
          ? '您将收到蘑菇识别相关的通知'
          : 'You will receive mushroom identification notifications'
      );
    }
  };

  const handleSaveLocationChange = (value: boolean) => {
    setSaveLocation(value);
    saveSetting('saveLocation', value);
  };

  const handleDarkModeChange = (value: boolean) => {
    setDarkMode(value);
    saveSetting('darkMode', value);
    Alert.alert(
      currentLanguage === 'zh' ? '主题已更改' : 'Theme Changed',
      currentLanguage === 'zh'
        ? '请重启应用以查看主题变化'
        : 'Please restart the app to see the theme changes'
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      currentLanguage === 'zh' ? '清空历史记录' : 'Clear History',
      currentLanguage === 'zh'
        ? '确定要清空所有识别历史记录吗？此操作不可恢复。'
        : 'Are you sure you want to clear all identification history? This action cannot be undone.',
      [
        { text: currentLanguage === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: currentLanguage === 'zh' ? '清空' : 'Clear',
          style: 'destructive',
          onPress: async () => {
            await DatabaseService.clearAllIdentifications();
            setIdentificationCount(0);
            Alert.alert(
              currentLanguage === 'zh' ? '已清空' : 'Cleared',
              currentLanguage === 'zh'
                ? '所有历史记录已清空'
                : 'All history records have been cleared'
            );
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const history = await DatabaseService.getAllIdentifications();
      if (history.length === 0) {
        Alert.alert(
          currentLanguage === 'zh' ? '无数据' : 'No Data',
          currentLanguage === 'zh'
            ? '没有可导出的数据'
            : 'No data to export'
        );
        return;
      }

      const dataStr = JSON.stringify(history, null, 2);
      Alert.alert(
        currentLanguage === 'zh' ? '导出数据' : 'Export Data',
        currentLanguage === 'zh'
          ? `共 ${history.length} 条记录，数据已准备就绪`
          : `${history.length} records ready for export`,
        [
          { text: currentLanguage === 'zh' ? '确定' : 'OK' }
        ]
      );
      console.log('Export data:', dataStr);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleAbout = () => {
    Alert.alert(
      currentLanguage === 'zh' ? '关于应用' : 'About',
      `${currentLanguage === 'zh' ? '蘑菇识别器' : 'Mushroom Identifier'} v1.0.0\n\n${
        currentLanguage === 'zh'
          ? '一款基于AI的蘑菇识别应用，帮助您识别各种蘑菇品种。'
          : 'An AI-powered mushroom identification app to help you identify various mushroom species.'
      }`,
      [{ text: currentLanguage === 'zh' ? '确定' : 'OK' }]
    );
  };

  const handleLanguage = () => {
    const currentLang = i18n.language;
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
    Alert.alert(
      currentLanguage === 'zh' ? '语言已切换' : 'Language Switched',
      currentLanguage === 'zh'
        ? '应用语言已切换为英文'
        : 'App language switched to Chinese'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentLanguage === 'zh' ? '设置' : 'Settings'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.statsCard}>
          <Text style={styles.statsEmoji}>🍄</Text>
          <View style={styles.statsInfo}>
            <Text style={styles.statsLabel}>
              {currentLanguage === 'zh' ? '总识别次数' : 'Total Identifications'}
            </Text>
            <Text style={styles.statsValue}>{identificationCount}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {currentLanguage === 'zh' ? '偏好设置' : 'Preferences'}
          </Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔔</Text>
              <View>
                <Text style={styles.settingName}>
                  {currentLanguage === 'zh' ? '通知' : 'Notifications'}
                </Text>
                <Text style={styles.settingDescription}>
                  {currentLanguage === 'zh'
                    ? '接收识别结果通知'
                    : 'Receive identification result notifications'}
                </Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={handleNotificationsChange}
              trackColor={{ false: '#767577', true: '#4caf50' }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>📍</Text>
              <View>
                <Text style={styles.settingName}>
                  {currentLanguage === 'zh' ? '保存位置' : 'Save Location'}
                </Text>
                <Text style={styles.settingDescription}>
                  {currentLanguage === 'zh'
                    ? '识别时自动保存地理位置'
                    : 'Automatically save location when identifying'}
                </Text>
              </View>
            </View>
            <Switch
              value={saveLocation}
              onValueChange={handleSaveLocationChange}
              trackColor={{ false: '#767577', true: '#4caf50' }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🌙</Text>
              <View>
                <Text style={styles.settingName}>
                  {currentLanguage === 'zh' ? '深色模式' : 'Dark Mode'}
                </Text>
                <Text style={styles.settingDescription}>
                  {currentLanguage === 'zh'
                    ? '切换应用主题'
                    : 'Switch app theme'}
                </Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={handleDarkModeChange}
              trackColor={{ false: '#767577', true: '#4caf50' }}
            />
          </View>

          <TouchableOpacity style={styles.settingItem} onPress={handleLanguage}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🌐</Text>
              <View>
                <Text style={styles.settingName}>
                  {currentLanguage === 'zh' ? '语言' : 'Language'}
                </Text>
                <Text style={styles.settingDescription}>
                  {currentLanguage === 'zh' ? '切换应用语言' : 'Switch app language'}
                </Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {currentLanguage === 'zh' ? '数据管理' : 'Data Management'}
          </Text>

          <TouchableOpacity style={styles.settingItem} onPress={handleExportData}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>📤</Text>
              <View>
                <Text style={styles.settingName}>
                  {currentLanguage === 'zh' ? '导出数据' : 'Export Data'}
                </Text>
                <Text style={styles.settingDescription}>
                  {currentLanguage === 'zh'
                    ? '导出识别历史记录'
                    : 'Export identification history'}
                </Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleClearHistory}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🗑️</Text>
              <View>
                <Text style={[styles.settingName, styles.dangerText]}>
                  {currentLanguage === 'zh' ? '清空历史' : 'Clear History'}
                </Text>
                <Text style={styles.settingDescription}>
                  {currentLanguage === 'zh'
                    ? '删除所有识别记录'
                    : 'Delete all identification records'}
                </Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {currentLanguage === 'zh' ? '关于' : 'About'}
          </Text>

          <TouchableOpacity style={styles.settingItem} onPress={handleAbout}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>ℹ️</Text>
              <View>
                <Text style={styles.settingName}>
                  {currentLanguage === 'zh' ? '关于应用' : 'About App'}
                </Text>
                <Text style={styles.settingDescription}>
                  {currentLanguage === 'zh'
                    ? '版本信息和使用说明'
                    : 'Version info and usage guide'}
                </Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {currentLanguage === 'zh' ? '蘑菇识别器 v1.0.0' : 'Mushroom Identifier v1.0.0'}
          </Text>
          <Text style={styles.footerSubtext}>
            {currentLanguage === 'zh' ? '© 2024 智能蘑菇识别' : '© 2024 Smart Mushroom Identifier'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#4caf50',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  placeholder: {
    width: 40,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4caf50',
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  statsEmoji: {
    fontSize: 40,
    marginRight: 15,
  },
  statsInfo: {
    flex: 1,
  },
  statsLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  settingName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
  },
  dangerText: {
    color: '#f44336',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#ccc',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#bbb',
  },
});