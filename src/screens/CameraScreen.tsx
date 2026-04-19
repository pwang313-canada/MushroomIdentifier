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

// 格式化 Wikipedia URL 的蘑菇名称（将空格替换为下划线）
const formatWikiUrlName = (scientificName: string): string => {
  // Wikipedia 科学名称通常使用小写格式（除了第一个属名首字母大写）
  // 但为了兼容，统一转为小写
  return scientificName.toLowerCase().replace(/ /g, '_');
};

// 获取显示名称（根据当前语言）
const getDisplayName = (scientificName: string, currentLanguage: string): string => {
  if (currentLanguage === 'zh') {
    return mushroomNameMap[scientificName] || scientificName;
  }
  // 英文模式返回英文名称
  return scientificName;
};

// 获取中文名称（用于数据库保存）
const getChineseName = (scientificName: string): string => {
  return mushroomNameMap[scientificName] || scientificName;
};

// 打开 Wikipedia 页面（根据语言偏好）
const openWikipedia = async (mushroomName: string, language: string) => {
  // 格式化名称用于 URL（空格转下划线）
  const formattedName = formatWikiUrlName(mushroomName);

  // 如果当前是中文模式，优先打开中文 Wikipedia
  if (language === 'zh') {
    const chineseName = getChineseName(mushroomName);
    const formattedChineseName = formatWikiUrlName(chineseName);
    try {
      const zhUrl = `https://zh.wikipedia.org/wiki/${formattedChineseName}`;
      console.log('Opening Chinese Wikipedia:', zhUrl);
      const canOpen = await Linking.canOpenURL(zhUrl);
      if (canOpen) {
        await Linking.openURL(zhUrl);
        return;
      }
    } catch (error) {
      console.log('中文 Wikipedia 打开失败，尝试英文:', error);
    }
  }

  // 英文模式或中文失败时，打开英文 Wikipedia
  try {
    // 使用正确的科学名称格式：Agaricus_bisporus
    const enUrl = `https://en.wikipedia.org/wiki/${formattedName}`;
    console.log('Opening English Wikipedia:', enUrl);
    await Linking.openURL(enUrl);
  } catch (error) {
    console.error('无法打开 Wikipedia:', error);
    const errorMessage = language === 'zh'
      ? '无法打开 Wikipedia，请检查网络连接'
      : 'Cannot open Wikipedia, please check your network connection';
    Alert.alert('Error', errorMessage);
  }
};

export function CameraScreen({ navigation }: CameraScreenProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language; // 获取当前语言 'en' 或 'zh'

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // 检查 API 健康状态
  useEffect(() => {
    const checkApi = async () => {
      const isHealthy = await checkNyckelHealth();
      console.log('Nyckel API 状态:', isHealthy);
    };
    checkApi();
  }, []);

  // 保存识别结果到数据库（带位置信息）
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

  // 拍照
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
      await identifyMushroom(result.assets[0].uri);
    }
  };

  // 从相册选择图片
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
      await identifyMushroom(result.assets[0].uri);
    }
  };

  // 识别蘑菇
  const identifyMushroom = async (uri: string) => {
    setIdentifying(true);
    try {
      const result = await identifyMushroomWithNyckel(uri);

      console.log('识别结果:', result);

      if (!result || !result.success || result.suggestions.length === 0) {
        Alert.alert(
          t('mushroom.identificationFailed') || 'Identification Failed',
          t('mushroom.tryClearerPhoto') || 'Cannot identify mushroom in the image, please try a clearer photo'
        );
        setIdentifying(false);
        return;
      }

      // 更新结果列表
      setResults(result.suggestions);

      // 保存最佳结果到数据库
      const topResult = result.topResult || result.suggestions[0];
      if (topResult) {
        const scientificName = topResult.taxon.scientific_name || topResult.taxon.name;
        const commonName = getChineseName(topResult.taxon.name);
        const displayName = getDisplayName(topResult.taxon.name, currentLanguage);
        const confidencePercent = Math.round((topResult.score || 0) * 100);

        await saveIdentificationWithLocation(scientificName, commonName, uri);

        // 根据当前语言显示不同的 Alert 文本
        const alertTitle = currentLanguage === 'zh' ? '🍄 识别结果' : '🍄 Identification Result';
        const alertMessage = currentLanguage === 'zh'
          ? `${displayName}\n置信度: ${confidencePercent}%\n\n是否查看 Wikipedia 详情？`
          : `${displayName}\nConfidence: ${confidencePercent}%\n\nView Wikipedia details?`;
        const viewDetailsText = currentLanguage === 'zh' ? '查看详情' : 'View Details';
        const confirmText = currentLanguage === 'zh' ? '确定' : 'OK';

        // 显示识别结果弹窗，带 Wikipedia 选项
        Alert.alert(
          alertTitle,
          alertMessage,
          [
            { text: viewDetailsText, onPress: () => openWikipedia(topResult.taxon.name, currentLanguage) },
            { text: confirmText, style: 'cancel' }
          ]
        );
      }

    } catch (error: any) {
      console.error('识别错误:', error);
      Alert.alert(
        t('mushroom.identifyFailed') || 'Identification Failed',
        error.message || 'Please try again'
      );
    } finally {
      setIdentifying(false);
    }
  };

  // 重置识别器
  const resetIdentifier = () => {
    setImageUri(null);
    setResults([]);
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      {/* 头部 */}
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
              {currentLanguage === 'zh' ? '🎯 识别结果' : '🎯 Identification Results'}
            </Text>
            {results.map((item, index) => {
              const confidence = Math.round((item.score || 0) * 100);
              const englishName = item.taxon?.preferred_common_name || item.taxon?.name || 'Unknown Mushroom';
              const displayName = getDisplayName(englishName, currentLanguage);

              // 只在中文模式下显示学名
              const showScientificName = currentLanguage === 'zh' && displayName !== englishName;

              return (
                <View key={index} style={styles.resultItem}>
                  <Text style={styles.resultRank}>{index + 1}</Text>
                  <View style={styles.resultInfo}>
                    <TouchableOpacity
                      onPress={() => openWikipedia(englishName, currentLanguage)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.resultNameLink}>
                        {displayName} 🔗
                      </Text>
                    </TouchableOpacity>
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
    </SafeAreaView>
  );
}

// 样式
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
    alignItems: 'center',
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
  resultNameLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    textDecorationLine: 'underline',
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