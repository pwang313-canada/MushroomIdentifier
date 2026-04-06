// src/screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { globalStyles } from '../styles/globalStyles';
import { MushroomService } from '../services/MushroomService';
import { Mushroom } from '../types';

export function HomeScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('获取位置中...');
  const [nearbyMushrooms, setNearbyMushrooms] = useState<Mushroom[]>([]);
  const [nearbyEdible, setNearbyEdible] = useState<Mushroom[]>([]);
  const [nearbyToxic, setNearbyToxic] = useState<Mushroom[]>([]);

  useEffect(() => {
    getLocationAndLoadMushrooms();
  }, []);

  const getLocationAndLoadMushrooms = async () => {
    setLoading(true);
    try {
      // 请求位置权限
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName('位置权限未授予');
        setLoading(false);
        return;
      }
      
      // 获取当前位置
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      
      // 获取地理位置名称
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      
      if (geocode.length > 0) {
        setLocationName(`${geocode[0].city || geocode[0].region || '当前位置'}`);
      }
      
      // 获取附近的蘑菇（从 API）
      const nearby = await MushroomService.getNearbyMushrooms(loc.coords.latitude, loc.coords.longitude);
      setNearbyMushrooms(nearby);
      
      // 分离可食用和有毒蘑菇
      const edible = nearby.filter(m => m.type === 'edible');
      const toxic = nearby.filter(m => m.type === 'toxic');
      setNearbyEdible(edible);
      setNearbyToxic(toxic);
      
      console.log(`📍 附近找到 ${nearby.length} 种蘑菇 (可食用: ${edible.length}, 有毒: ${toxic.length})`);
      
    } catch (error) {
      console.error('获取位置失败:', error);
      setLocationName('无法获取位置');
    } finally {
      setLoading(false);
    }
  };

  // 查看所有附近蘑菇
  const handleViewNearbyMushrooms = () => {
    if (nearbyMushrooms.length === 0) {
      Alert.alert('暂无数据', '您附近暂未发现蘑菇');
      return;
    }
    
    navigation.navigate('MushroomList', {
      mushrooms: nearbyMushrooms,
      type: 'nearby',
      title: `${locationName}附近的蘑菇`,
    });
  };

  // 查看附近可食用蘑菇
  const handleViewEdibleMushrooms = () => {
    if (nearbyEdible.length === 0) {
      Alert.alert('暂无数据', '您附近暂未发现可食用蘑菇');
      return;
    }
    
    navigation.navigate('MushroomList', {
      mushrooms: nearbyEdible,
      type: 'edible',
      title: `${locationName}附近的可食用蘑菇`,
    });
  };

  // 查看附近有毒蘑菇
  const handleViewToxicMushrooms = () => {
    if (nearbyToxic.length === 0) {
      Alert.alert('暂无数据', '您附近暂未发现有毒蘑菇');
      return;
    }
    
    navigation.navigate('MushroomList', {
      mushrooms: nearbyToxic,
      type: 'toxic',
      title: `${locationName}附近的有毒蘑菇`,
    });
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.header}>
        <Text style={globalStyles.appTitle}>🍄 蘑菇识别助手</Text>
        <Text style={globalStyles.subtitle}>基于您的位置推荐附近蘑菇</Text>
      </View>

      {/* 位置信息卡片 */}
      <View style={styles.locationCard}>
        <Text style={styles.locationIcon}>📍</Text>
        <View style={styles.locationInfo}>
          <Text style={styles.locationLabel}>当前位置</Text>
          <Text style={styles.locationName}>{locationName}</Text>
          {nearbyMushrooms.length > 0 && (
            <Text style={styles.nearbyCount}>发现 {nearbyMushrooms.length} 种蘑菇</Text>
          )}
        </View>
        <TouchableOpacity onPress={getLocationAndLoadMushrooms} style={styles.refreshButton}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
        {loading && <ActivityIndicator size="small" />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 附近蘑菇统计卡片 */}
        {nearbyMushrooms.length > 0 && (
          <TouchableOpacity style={styles.statsCard} onPress={handleViewNearbyMushrooms}>
            <Text style={styles.statsEmoji}>🍄</Text>
            <View style={styles.statsInfo}>
              <Text style={styles.statsTitle}>附近蘑菇</Text>
              <Text style={styles.statsCount}>{nearbyMushrooms.length} 种</Text>
            </View>
            <Text style={styles.statsArrow}>→</Text>
          </TouchableOpacity>
        )}

        <View style={styles.mainMenu}>
          <TouchableOpacity
            style={[styles.menuButton, styles.edibleButton]}
            onPress={handleViewEdibleMushrooms}
            disabled={loading}>
            <Text style={styles.menuIcon}>🍽️</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>可食用蘑菇</Text>
              <Text style={styles.menuDesc}>
                {nearbyEdible.length > 0 ? `发现 ${nearbyEdible.length} 种` : '暂无发现'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, styles.toxicButton]}
            onPress={handleViewToxicMushrooms}
            disabled={loading}>
            <Text style={styles.menuIcon}>☠️</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>有毒蘑菇</Text>
              <Text style={styles.menuDesc}>
                {nearbyToxic.length > 0 ? `发现 ${nearbyToxic.length} 种` : '暂无发现'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, styles.cameraButton]}
            onPress={() => navigation.navigate('Camera')}>
            <Text style={styles.menuIcon}>📸</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>拍照识别</Text>
              <Text style={styles.menuDesc}>AI 智能识别蘑菇</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, styles.searchButton]}
            onPress={() => navigation.navigate('Search')}>
            <Text style={styles.menuIcon}>🔍</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>搜索蘑菇</Text>
              <Text style={styles.menuDesc}>按名称搜索</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={globalStyles.warningBox}>
          <Text style={globalStyles.warningText}>⚠️ 重要提醒</Text>
          <Text style={globalStyles.warningSubtext}>
            识别结果仅供参考，请勿仅凭此App食用任何野生蘑菇。
            如有疑问，请咨询专业菌类学家。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  locationCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#fff',
    margin: 20,
    padding: 15,
    borderRadius: 12,
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

  locationIcon: {
    fontSize: 30,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
  },
  nearbyCount: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
  },
  refreshIcon: {
    fontSize: 20,
  },
  statsCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#4caf50',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
  },
  statsEmoji: {
    fontSize: 30,
    marginRight: 12,
  },
  statsInfo: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  statsCount: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#fff',
  },
  statsArrow: {
    fontSize: 20,
    color: '#fff',
  },
  mainMenu: {
    paddingHorizontal: 20,
    gap: 12,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  menuInfo: {
    flex: 1,
    marginLeft: 12,
  },
  menuIcon: {
    fontSize: 32,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
  },
  menuDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
};

import { Platform } from 'react-native';