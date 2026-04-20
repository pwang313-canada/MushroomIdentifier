// src/screens/MapScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { globalStyles } from '../styles/globalStyles';
import DatabaseService from '../services/DatabaseService';

interface Identification {
  id: number;
  name: string;
  scientificName: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  imageUri: string;
}

export function MapScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const [identifications, setIdentifications] = useState<Identification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 39.9042,
    longitude: 116.4074,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    loadIdentifications();
    getCurrentLocation();
  }, []);

  const loadIdentifications = async () => {
    setLoading(true);
    try {
      const history = await DatabaseService.getAllIdentifications();
      // Filter only identifications with valid coordinates
      const withLocation = history.filter(
        (item: any) => item.latitude && item.longitude
      );
      setIdentifications(withLocation);
    } catch (error) {
      console.error('Error loading identifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          currentLanguage === 'zh' ? '权限被拒绝' : 'Permission Denied',
          currentLanguage === 'zh'
            ? '无法获取您的位置来显示地图'
            : 'Cannot get your location to show on map'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ lat: latitude, lon: longitude });

      // Update map region to current location
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleMarkerPress = (identification: Identification) => {
    Alert.alert(
      identification.name || identification.scientificName,
      currentLanguage === 'zh'
        ? `发现时间: ${new Date(identification.timestamp).toLocaleString()}\n\n点击查看详情`
        : `Found: ${new Date(identification.timestamp).toLocaleString()}\n\nTap to view details`,
      [
        {
          text: currentLanguage === 'zh' ? '查看详情' : 'View Details',
          onPress: () => navigation.navigate('MushroomDetail', { mushroom: identification }),
        },
        {
          text: currentLanguage === 'zh' ? '取消' : 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const centerToCurrentLocation = () => {
    if (currentLocation) {
      setRegion({
        latitude: currentLocation.lat,
        longitude: currentLocation.lon,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } else {
      getCurrentLocation();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {currentLanguage === 'zh' ? '发现地图' : 'Discovery Map'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4caf50" />
          <Text style={styles.loadingText}>
            {currentLanguage === 'zh' ? '加载地图中...' : 'Loading map...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentLanguage === 'zh' ? '发现地图' : 'Discovery Map'}
        </Text>
        <TouchableOpacity onPress={centerToCurrentLocation} style={styles.locationButton}>
          <Text style={styles.locationButtonText}>📍</Text>
        </TouchableOpacity>
      </View>

      <MapView
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {identifications.map((item) => (
          <Marker
            key={item.id}
            coordinate={{
              latitude: item.latitude,
              longitude: item.longitude,
            }}
            title={item.name || item.scientificName}
            description={new Date(item.timestamp).toLocaleDateString()}
            onPress={() => handleMarkerPress(item)}
            pinColor="#4caf50"
          />
        ))}
      </MapView>

      {identifications.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyText}>
            {currentLanguage === 'zh'
              ? '暂无蘑菇发现记录'
              : 'No mushroom discoveries yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {currentLanguage === 'zh'
              ? '去拍照识别蘑菇，记录您的位置吧！'
              : 'Go take photos of mushrooms and record your locations!'}
          </Text>
          <TouchableOpacity
            style={styles.goToCameraButton}
            onPress={() => navigation.navigate('Camera')}
          >
            <Text style={styles.goToCameraButtonText}>
              {currentLanguage === 'zh' ? '📷 去拍照' : '📷 Take Photo'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {identifications.length > 0 && (
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            🍄 {identifications.length}{' '}
            {currentLanguage === 'zh' ? '个发现地点' : 'discovery locations'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  locationButton: {
    padding: 8,
    marginRight: -8,
  },
  locationButtonText: {
    fontSize: 24,
  },
  placeholder: {
    width: 40,
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
  emptyContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
    marginBottom: 24,
  },
  goToCameraButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  goToCameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  statsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});