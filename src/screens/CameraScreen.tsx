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
  const [selectedApi, setSelectedApi] = useState<'nyckel' | 'kindwise'>('nyckel');
  const [showDropdown, setShowDropdown] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

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

      const topSuggestions = result.suggestions.slice(0, 3);
      setResults(topSuggestions);

      const topResult = topSuggestions[0];
      if (topResult) {
        const scientificName = topResult.taxon.scientific_name || topResult.taxon.name;
        const commonName = getChineseName(topResult.taxon.name);
        await saveIdentificationWithLocation(scientificName, commonName, uri);
      }
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
        const topSuggestions = KindwiseService.getTopSuggestions(result, 3);

        const formattedResults = topSuggestions.map(suggestion => ({
          taxon: {
            name: suggestion.name,
            scientific_name: suggestion.name,
            preferred_common_name: suggestion.name
          },
          score: suggestion.probability,
        }));

        setResults(formattedResults);

        const bestSuggestion = topSuggestions[0];
        if (bestSuggestion) {
          await saveIdentificationWithLocation(bestSuggestion.name, bestSuggestion.name, uri);
        }
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

  const executeIdentification = async () => {
    if (!imageUri) {
      Alert.alert(
        currentLanguage === 'zh' ? '请先选择图片' : 'Please select an image first',
        currentLanguage === 'zh' ? '请先拍照或从相册选择一张图片' : 'Please take a photo or select an image from gallery'
      );
      return;
    }

    if (!disclaimerAccepted) {
      Alert.alert(
        currentLanguage === 'zh' ? '请确认免责声明' : 'Please accept the disclaimer',
        currentLanguage === 'zh' ? '请勾选"结果仅供参考"复选框后再进行识别' : 'Please check the "Results for reference only" checkbox before identifying'
      );
      return;
    }

    if (selectedApi === 'nyckel') {
      await identifyWithNyckel(imageUri);
    } else {
      await identifyWithKindwise(imageUri);
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
      setResults([]);
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
      setResults([]);
    }
  };

  const selectApi = (api: 'nyckel' | 'kindwise') => {
    setSelectedApi(api);
    setShowDropdown(false);
  };

  const isExecuteDisabled = () => {
    return !imageUri || identifying || !disclaimerAccepted;
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.headerCentered}>
        <Text style={globalStyles.screenTitle}>{t('home.camera')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.cameraContent}>
        {/* Image Selection Buttons */}
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

        {/* Selected Image Preview */}
        {imageUri && (
          <View style={styles.resultContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          </View>
        )}

        {/* API Selection Dropdown */}
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownLabel}>
            {currentLanguage === 'zh' ? '选择识别服务:' : 'Select API Service:'}
          </Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text style={styles.dropdownButtonText}>
              {selectedApi === 'nyckel' ? '🤖 Nyckel' : '🍄 Kindwise'}
            </Text>
            <Text style={styles.dropdownArrow}>{showDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showDropdown && (
            <View style={styles.dropdownList}>
              <TouchableOpacity
                style={[styles.dropdownItem, selectedApi === 'nyckel' && styles.dropdownItemSelected]}
                onPress={() => selectApi('nyckel')}
              >
                <Text style={styles.dropdownItemText}>🤖 Nyckel</Text>
                {selectedApi === 'nyckel' && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dropdownItem, selectedApi === 'kindwise' && styles.dropdownItemSelected]}
                onPress={() => selectApi('kindwise')}
              >
                <Text style={styles.dropdownItemText}>🍄 Kindwise</Text>
                {selectedApi === 'kindwise' && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Disclaimer Checkbox */}
        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
          >
            <View style={[styles.checkboxBox, disclaimerAccepted && styles.checkboxChecked]}>
              {disclaimerAccepted && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              {currentLanguage === 'zh'
                ? '我确认识别结果仅供参考，不用于食用决策'
                : 'I confirm that the results are for reference only, not for consumption decisions'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Execute Button */}
        <TouchableOpacity
          style={[styles.executeButton, isExecuteDisabled() && styles.executeButtonDisabled]}
          onPress={executeIdentification}
          disabled={isExecuteDisabled()}
        >
          <Text style={styles.executeButtonText}>
            {identifying
              ? (currentLanguage === 'zh' ? '识别中...' : 'Identifying...')
              : (currentLanguage === 'zh' ? '🔍 开始识别' : '🔍 Start Identification')
            }
          </Text>
        </TouchableOpacity>

        {/* Loading Indicator */}
        {identifying && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4caf50" />
            <Text style={styles.loadingText}>{t('mushroom.identifying')}</Text>
          </View>
        )}

        {/* Results Section */}
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

            {/* Warning message after results */}
            <View style={styles.resultWarning}>
              <Text style={styles.resultWarningIcon}>⚠️</Text>
              <Text style={styles.resultWarningText}>
                {currentLanguage === 'zh'
                  ? '识别结果仅供参考，请勿仅凭此结果食用任何蘑菇。如有疑问，请咨询蘑菇专家。'
                  : 'Results are for reference only. Do not eat any mushroom based solely on this identification. Consult an expert if in doubt.'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
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
    marginBottom: 20,
  },
  cameraActionButton: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '45%',
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
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
  },
  dropdownContainer: {
    marginBottom: 20,
    position: 'relative',
    zIndex: 100,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#999',
  },
  dropdownList: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#e8f5e9',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  checkMark: {
    fontSize: 16,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  checkboxContainer: {
    marginBottom: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4caf50',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#4caf50',
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  executeButton: {
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  executeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  executeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  resultsSection: {
    marginTop: 10,
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
  resultWarning: {
    flexDirection: 'row',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    alignItems: 'center',
  },
  resultWarningIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  resultWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#e65100',
    lineHeight: 16,
  },
});