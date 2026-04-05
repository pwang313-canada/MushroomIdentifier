import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, Platform } from 'react-native';
import { globalStyles } from '../styles/globalStyles';

interface HomeScreenProps {
  navigation: any;
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.header}>
        <Text style={globalStyles.appTitle}>🍄 蘑菇识别助手</Text>
        <Text style={globalStyles.subtitle}>识别蘑菇 · 了解毒性 · 安全食用</Text>
      </View>

      <View style={styles.mainMenu}>
        <TouchableOpacity
          style={[styles.menuButton, styles.edibleButton]}
          onPress={() => navigation.navigate('MushroomList', { type: 'edible' })}>
          <Text style={styles.menuIcon}>🍽️</Text>
          <Text style={styles.menuTitle}>可食用蘑菇</Text>
          <Text style={styles.menuDesc}>常见食用菌种类</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuButton, styles.toxicButton]}
          onPress={() => navigation.navigate('MushroomList', { type: 'toxic' })}>
          <Text style={styles.menuIcon}>☠️</Text>
          <Text style={styles.menuTitle}>有毒蘑菇</Text>
          <Text style={styles.menuDesc}>警惕有毒种类</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuButton, styles.cameraButton]}
          onPress={() => navigation.navigate('Camera')}>
          <Text style={styles.menuIcon}>📸</Text>
          <Text style={styles.menuTitle}>拍照识别</Text>
          <Text style={styles.menuDesc}>AI 智能识别蘑菇</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuButton, styles.searchButton]}
          onPress={() => navigation.navigate('Search')}>
          <Text style={styles.menuIcon}>🔍</Text>
          <Text style={styles.menuTitle}>搜索蘑菇</Text>
          <Text style={styles.menuDesc}>按名称搜索</Text>
        </TouchableOpacity>
      </View>

      <View style={globalStyles.warningBox}>
        <Text style={globalStyles.warningText}>⚠️ 重要提醒</Text>
        <Text style={globalStyles.warningSubtext}>
          识别结果仅供参考，请勿仅凭此App食用任何野生蘑菇。
          如有疑问，请咨询专业菌类学家。
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainMenu: {
    padding: 20,
    gap: 15,
  },
  menuButton: {
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row' as 'row',
    alignItems: 'center' as 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  edibleButton: {
    backgroundColor: '#e8f5e9',
  },
  toxicButton: {
    backgroundColor: '#ffebee',
  },
  cameraButton: {
    backgroundColor: '#e3f2fd',
  },
  searchButton: {
    backgroundColor: '#fff3e0',
  },
  menuIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  menuDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

