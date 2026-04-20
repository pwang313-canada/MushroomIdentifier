// CameraScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Linking,
  Platform,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { globalStyles } from '../styles/globalStyles';
import DatabaseService from '../services/DatabaseService';
import { identifyMushroomWithNyckel, checkNyckelHealth } from '../services/NyckelService';
import { KindwiseService } from '../services/KindwiseService';
import { IdentificationServiceSelector } from '../components/IdentificationServiceSelector';

interface CameraScreenProps {
  navigation: any;
}

// 蘑菇名称中英文映射
const mushroomNameMap: { [key: string]: string } = {
  'Agaricus Bisporus': '双孢蘑菇',
  'Agaricus bisporus': '双孢蘑菇',
  'Ganoderma Lucidum': '灵芝',
  'Ganoderma lucidum': '灵芝',
  'Amanita Muscaria': '毒蝇伞',
  'Amanita muscaria': '毒蝇伞',
  'Boletus Edulis': '牛肝菌',
  'Boletus edulis': '牛肝菌',
  'Cantharellus Cibarius': '鸡油菌',
  'Cantharellus cibarius': '鸡油菌',
  'Pleurotus Ostreatus': '平菇',
  'Pleurotus ostreatus': '平菇',
  'Lentinula Edodes': '香菇',
  'Lentinula edodes': '香菇',
  'Tuber Magnatum': '白松露',
  'Tuber magnatum': '白松露',
  'Hericium Erinaceus': '猴头菇',
  'Hericium erinaceus': '猴头菇',
  'Cordyceps Sinensis': '冬虫夏草',
  'Cordyceps sinensis': '冬虫夏草',
  'Tremella Fuciformis': '银耳',
  'Tremella fuciformis': '银耳',
  'Auricularia Auricula': '黑木耳',
  'Auricularia auricula': '黑木耳',
  'Flammulina Velutipes': '金针菇',
  'Flammulina velutipes': '金针菇',
  'Coprinus Comatus': '鸡腿菇',
  'Coprinus comatus': '鸡腿菇',
};

const formatWikiUrlName = (scientificName: string): string => {
  return scientificName.toLowerCase().replace(/ /g, '_');
};

const getDisplayName = (scientificName: string, currentLanguage: string): string => {
  if (currentLanguage === 'zh') {
    return mushroomNameMap[scientificName] || scientificName;
  }
  return scientificName;
};

const getChineseName = (scientificName: string): string => {
  return mushroomNameMap[scientificName] || scientificName;
};

const openWikipedia = async (mushroomName: string, language: string) => {
  const formattedName = formatWikiUrlName(mushroomName);

  if (language === 'zh') {
    const chineseName = getChineseName(mushroomName);
    const formattedChineseName = formatWikiUrlName(chineseName);
    try {
      const zhUrl = `https://zh.wikipedia.org/wiki/${formattedChineseName}`;
      await Linking.openURL(zhUrl);
      return;
    } catch (error) {
      console.log('中文失败，尝试英文');
    }
  }

  try {
    const enUrl = `https://en.wikipedia.org/wiki/${formattedName}`;
    await Linking.openURL(enUrl);
  } catch (error) {
    console.error('无法打开 Wikipedia:', error);
    Alert.alert('Error', 'Cannot open Wikipedia');
  }
};

export function CameraScreen({ navigation }: CameraScreenProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [showServiceSelector, setShowServiceSelector] = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  useEffect(() => {
    const checkApi = async () => {
      const isHealthy = await checkNyckelHealth();
      console.log('Nyckel API 状态:', isHealthy);
    };
    checkApi();
  }, []);

  const saveIdentificationWithLocation = async (scientificName: string, commonName: string, imageUri: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('位置权限未授予，跳过保存');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      await DatabaseService.saveIdentification({
        name: commonName || scientificName,
        scientificName: scientificName,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: new Date().toISOString(),
        imageUri: imageUri,
      });
      console.log('识别结果保存成功！');
    } catch (error) {
      console.error('保存识别结果失败:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        return { lat: loc.coords.latitude, lon: loc.coords.longitude };
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
    return null;
  };

  const identifyWithNyckel = async (uri: string) => {
    setIdentifying(true);
    try {
      const result = await identifyMushroomWithNyckel(uri);

      if (!result || !result.success || result.suggestions.length === 0) {
        Alert.alert(
          t('mushroom.identificationFailed') || 'Identification Failed',
          t('mushroom.tryClearerPhoto') || 'Cannot identify mushroom'
        );
        setIdentifying(false);
        return;
      }

      // Get top 3 suggestions from Nyckel
      const topSuggestions = result.suggestions.slice(0, 3);
      setResults(topSuggestions);

      // Save the best result to database
      const topResult = topSuggestions[0];
      if (topResult) {
        const scientificName = topResult.taxon.scientific_name || topResult.taxon.name;
        const commonName = getChineseName(topResult.taxon.name);
        await saveIdentificationWithLocation(scientificName, commonName, uri);
      }

      // No alert - just show results in the UI
    } catch (error: any) {
      console.error('Nyckel识别错误:', error);
      Alert.alert('Error', 'Identification failed with Nyckel');
    } finally {
      setIdentifying(false);
    }
  };

  const identifyWithKindwise = async (uri: string) => {
    setIdentifying(true);
    try {
      const location = await getCurrentLocation();
      const result = await KindwiseService.identifyMushroom(uri, location?.lat, location?.lon);

      if (result && result.suggestions && result.suggestions.length > 0) {
        // Get top 3 suggestions
        const topSuggestions = KindwiseService.getTopSuggestions(result, 3);

        // Format results for display
        const formattedResults = topSuggestions.map(suggestion => ({
          taxon: {
            name: suggestion.name,
            scientific_name: suggestion.name,
            preferred_common_name: suggestion.name
          },
          score: suggestion.probability,
        }));

        setResults(formattedResults);

        // Save the best result to database
        const bestSuggestion = topSuggestions[0];
        if (bestSuggestion) {
          await saveIdentificationWithLocation(bestSuggestion.name, bestSuggestion.name, uri);
        }

        // No alert - just show results in the UI
      } else {
        Alert.alert(
          currentLanguage === 'zh' ? '识别失败' : 'Identification Failed',
          currentLanguage === 'zh' ? '无法识别图片中的蘑菇' : 'Cannot identify mushroom in the image'
        );
      }
    } catch (error) {
      console.error('Kindwise识别错误:', error);
      Alert.alert('Error', 'Identification failed with Kindwise');
    } finally {
      setIdentifying(false);
    }
  };

  const handleServiceSelection = (service: 'nyckel' | 'kindwise') => {
    if (pendingImageUri) {
      if (service === 'nyckel') {
        identifyWithNyckel(pendingImageUri);
      } else {
        identifyWithKindwise(pendingImageUri);
      }
      setPendingImageUri(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('mushroom.permissionRequired'), t('mushroom.cameraPermissionRequired'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
      setPendingImageUri(result.assets[0].uri);
      setShowServiceSelector(true);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('mushroom.permissionRequired'), t('mushroom.galleryPermissionRequired'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
      setPendingImageUri(result.assets[0].uri);
      setShowServiceSelector(true);
    }
  };

  const resetIdentifier = () => {
    setImageUri(null);
    setResults([]);
    setPendingImageUri(null);
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.headerCentered}>
        <Text style={globalStyles.screenTitle}>{t('home.camera')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.cameraContent}>
        {!imageUri ? (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cameraActionButton} onPress={takePhoto}>
              <Text style={styles.cameraActionIcon}>📷</Text>
              <Text style={styles.cameraActionText}>{t('mushroom.takePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraActionButton} onPress={pickImage}>
              <Text style={styles.cameraActionIcon}>🖼️</Text>
              <Text style={styles.cameraActionText}>{t('mushroom.selectPhoto')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.resetButton} onPress={resetIdentifier}>
              <Text style={styles.resetButtonText}>{t('buttons.reset')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {identifying && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4caf50" />
            <Text style={styles.loadingText}>{t('mushroom.identifying')}</Text>
          </View>
        )}

        {!identifying && results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              {currentLanguage === 'zh' ? '🎯 识别结果' : '🎯 Results'}
            </Text>
            {results.map((item, index) => {
              const confidence = Math.round((item.score || 0) * 100);
              const englishName = item.taxon?.preferred_common_name || item.taxon?.name || 'Unknown Mushroom';
              const displayName = getDisplayName(englishName, currentLanguage);
              const showScientificName = currentLanguage === 'zh' && displayName !== englishName;

              return (
                <View key={index} style={styles.resultItem}>
                  <Text style={styles.resultRank}>{index + 1}</Text>
                  <View style={styles.resultInfo}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultName}>{displayName}</Text>
                      <TouchableOpacity
                        onPress={() => openWikipedia(englishName, currentLanguage)}
                        style={styles.wikiButton}
                      >
                        <Text style={styles.wikiButtonText}>🔗 Wikipedia</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.resultConfidence}>
                      {currentLanguage === 'zh' ? `置信度: ${confidence}%` : `Confidence: ${confidence}%`}
                    </Text>
                    {showScientificName && (
                      <Text style={styles.resultScientificName}>
                        {currentLanguage === 'zh' ? `学名: ${englishName}` : `Scientific name: ${englishName}`}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <IdentificationServiceSelector
        visible={showServiceSelector}
        onSelectService={handleServiceSelection}
        onClose={() => {
          setShowServiceSelector(false);
          setPendingImageUri(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerCentered: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  cameraContent: {
    padding: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
  },
  cameraActionButton: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '40%',
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
  cameraActionIcon: {
    fontSize: 40,
  },
  cameraActionText: {
    fontSize: 14,
    color: '#2c3e50',
    marginTop: 10,
  },
  resultContainer: {
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 15,
  },
  resetButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  resultsSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
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
  resultRank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
    marginRight: 12,
    width: 30,
  },
  resultInfo: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  wikiButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  wikiButtonText: {
    fontSize: 11,
    color: '#2196f3',
    fontWeight: '500',
  },
  resultConfidence: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  resultScientificName: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
});