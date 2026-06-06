import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { globalStyles } from '../styles/globalStyles';
import DatabaseService from '../services/DatabaseService';

interface Waypoint {
  id?: number;
  uri: string;
  latitude: number;
  longitude: number;
  timestamp?: string;
}

export function FindingHistoryScreen() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);

  // Load saved waypoints from database
  const loadWaypoints = async () => {
    try {
      const points = await DatabaseService.getAllPhotoLocations();
      setWaypoints(points);
      return points;
    } catch (error) {
      console.error('Failed to load waypoints:', error);
      Alert.alert(
        currentLanguage === 'zh' ? '加载失败' : 'Load Failed',
        currentLanguage === 'zh'
          ? '无法加载保存的位置'
          : 'Could not load saved locations'
      );
      return [];
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          currentLanguage === 'zh' ? '位置权限未授予' : 'Location permission denied',
          currentLanguage === 'zh'
            ? '请在设置中允许位置权限以显示当前位置'
            : 'Please enable location permission to see your current position'
        );
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCurrentLocation(coords);
      return coords;
    } catch (error) {
      console.error('Location error:', error);
      return null;
    }
  };

  // Determine map region to show all points + current location
  const calculateRegion = (
    points: Waypoint[],
    current: { latitude: number; longitude: number } | null
  ): Region => {
    const allLats: number[] = [];
    const allLngs: number[] = [];

    points.forEach((p) => {
      allLats.push(p.latitude);
      allLngs.push(p.longitude);
    });
    if (current) {
      allLats.push(current.latitude);
      allLngs.push(current.longitude);
    }

    if (allLats.length === 0) {
      // Default fallback region (center of your area, e.g., a park)
      return {
        latitude: 40.7128,
        longitude: -74.006,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);

    const latitudeDelta = (maxLat - minLat) * 1.2; // add padding
    const longitudeDelta = (maxLng - minLng) * 1.2;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latitudeDelta, 0.01),
      longitudeDelta: Math.max(longitudeDelta, 0.01),
    };
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const points = await loadWaypoints();
      const current = await getCurrentLocation();
      if (points.length > 0 || current) {
        const newRegion = calculateRegion(points, current);
        setRegion(newRegion);
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={globalStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4caf50" />
          <Text style={styles.loadingText}>
            {currentLanguage === 'zh' ? '加载地图...' : 'Loading map...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {currentLanguage === 'zh' ? '发现历史' : 'Finding History'}
        </Text>
      </View>
      {region && (
        <MapView
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={region}
          onMapReady={() => setMapReady(true)}
        >
          {/* Current location marker */}
          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              title={currentLanguage === 'zh' ? '我的位置' : 'My Location'}
              pinColor="#2196f3"
            />
          )}
          {/* Saved waypoints */}
          {waypoints.map((point, index) => (
            <Marker
              key={point.id || index}
              coordinate={{
                latitude: point.latitude,
                longitude: point.longitude,
              }}
              title={
                currentLanguage === 'zh'
                  ? `发现地点 ${index + 1}`
                  : `Waypoint ${index + 1}`
              }
              description={
                point.timestamp
                  ? new Date(point.timestamp).toLocaleString()
                  : undefined
              }
              pinColor="#4caf50"
            />
          ))}
        </MapView>
      )}
      {!region && (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            {currentLanguage === 'zh'
              ? '暂无保存的发现地点'
              : 'No saved waypoints yet'}
          </Text>
          <Text style={styles.hintText}>
            {currentLanguage === 'zh'
              ? '拍照识别后，位置会自动保存'
              : 'Locations are saved automatically after taking a photo'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    fontSize: 18,
    color: '#2c3e50',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});