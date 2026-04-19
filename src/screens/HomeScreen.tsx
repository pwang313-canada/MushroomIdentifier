// src/screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { globalStyles } from '../styles/globalStyles';
import { MushroomService } from '../services/MushroomService';
import { Mushroom } from '../types';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export function HomeScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState<string>(t('home.fetchingLocation'));
  const [nearbyMushrooms, setNearbyMushrooms] = useState<Mushroom[]>([]);
  const [nearbyEdible, setNearbyEdible] = useState<Mushroom[]>([]);
  const [nearbyToxic, setNearbyToxic] = useState<Mushroom[]>([]);

  useEffect(() => {
    getLocationAndLoadMushrooms();
  }, []);

  const getLocationAndLoadMushrooms = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName(t('home.locationDenied'));
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });

      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocode.length > 0) {
        setLocationName(`${geocode[0].city || geocode[0].region || t('home.location')}`);
      }

      const nearby = await MushroomService.getNearbyMushrooms(loc.coords.latitude, loc.coords.longitude);
      setNearbyMushrooms(nearby);

      const edible = nearby.filter(m => m.type === 'edible');
      const toxic = nearby.filter(m => m.type === 'toxic');
      setNearbyEdible(edible);
      setNearbyToxic(toxic);

    } catch (error) {
      console.error('获取位置失败:', error);
      setLocationName(t('home.unableToGetLocation'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewNearbyMushrooms = () => {
    if (nearbyMushrooms.length === 0) {
      Alert.alert(t('home.noMushroomsFound'), '');
      return;
    }

    navigation.navigate('MushroomList', {
      mushrooms: nearbyMushrooms,
      type: 'nearby',
    });
  };

  const handleViewEdibleMushrooms = () => {
    if (nearbyEdible.length === 0) {
      Alert.alert(t('home.noEdibleFound'), '');
      return;
    }

    navigation.navigate('MushroomList', {
      mushrooms: nearbyEdible,
      type: 'edible',
    });
  };

  const handleViewToxicMushrooms = () => {
    if (nearbyToxic.length === 0) {
      Alert.alert(t('home.noToxicFound'), '');
      return;
    }

    navigation.navigate('MushroomList', {
      mushrooms: nearbyToxic,
      type: 'toxic',
    });
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>{t('app.name')}</Text>
        <View style={styles.languageContainer}>
          <LanguageSwitcher />
        </View>
      </View>

      <View style={styles.locationCard}>
        <Text style={styles.locationIcon}>📍</Text>
        <View style={styles.locationInfo}>
          <Text style={styles.locationLabel}>{t('home.location')}</Text>
          <Text style={styles.locationName}>{locationName}</Text>
          {nearbyMushrooms.length > 0 && (
            <Text style={styles.nearbyCount}>
              {t('home.mushroomsFound', { count: nearbyMushrooms.length })}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={getLocationAndLoadMushrooms} style={styles.refreshButton}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
        {loading && <ActivityIndicator size="small" />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.mainMenu}>
          <TouchableOpacity
            style={[styles.menuButton, styles.edibleButton]}
            onPress={handleViewEdibleMushrooms}
            disabled={loading}>
            <Text style={styles.menuIcon}>🍽️</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>{t('home.edible')}</Text>
              <Text style={styles.menuDesc}>
                {nearbyEdible.length > 0
                  ? t('home.mushroomsFound', { count: nearbyEdible.length })
                  : t('home.noEdibleFound')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, styles.toxicButton]}
            onPress={handleViewToxicMushrooms}
            disabled={loading}>
            <Text style={styles.menuIcon}>☠️</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>{t('home.toxic')}</Text>
              <Text style={styles.menuDesc}>
                {nearbyToxic.length > 0
                  ? t('home.mushroomsFound', { count: nearbyToxic.length })
                  : t('home.noToxicFound')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, styles.cameraButton]}
            onPress={() => navigation.navigate('Camera')}>
            <Text style={styles.menuIcon}>📸</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>{t('home.camera')}</Text>
              <Text style={styles.menuDesc}>
                {currentLanguage === 'zh' ? 'AI 智能识别蘑菇' : 'AI Smart Recognition'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, styles.searchButton]}
            onPress={() => navigation.navigate('Search')}>
            <Text style={styles.menuIcon}>🔍</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>{t('home.search')}</Text>
              <Text style={styles.menuDesc}>
                {currentLanguage === 'zh' ? '按名称搜索' : 'Search by name'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={globalStyles.warningBox}>
          <Text style={globalStyles.warningText}>{t('home.warning')}</Text>
          <Text style={globalStyles.warningSubtext}>{t('home.warningText')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  header: {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#fff',
    paddingTop: 30,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  languageContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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