import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { globalStyles } from '../styles/globalStyles';
import { MushroomService } from '../services/MushroomService';
import { Platform } from 'react-native';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import DatabaseService from '../services/DatabaseService';
import * as Location from 'expo-location';
import { identifyMushroomWithNyckel, checkNyckelHealth } from '../services/NyckelService';

interface CameraScreenProps {
  navigation: any;
}

export function CameraScreen({ navigation }: CameraScreenProps) {
  const { t } = useTranslation();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Function to save identification to database with location
  const saveIdentificationWithLocation = async (scientificName: string, commonName: string, imageUri: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission not granted, skipping save');
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
      console.log('Identification saved successfully!');
    } catch (error) {
      console.error('Failed to save identification:', error);
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
      await identifyMushroom(result.assets[0].uri);
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
      await identifyMushroom(result.assets[0].uri);
    }
  };

    useEffect(() => {
      const checkApi = async () => {
        const isHealthy = await checkNyckelHealth();
        console.log('Nyckel API 状态:', isHealthy);
      };
      checkApi();
    }, []);

const identifyMushroom = async (uri: string) => {
  setIdentifying(true);
  try {
    // 调用 Nyckel API
    const result = await identifyMushroomWithNyckel(uri);

    console.log('===== 调试信息 =====');
    console.log('result.success:', result?.success);
    console.log('result.suggestions 长度:', result?.suggestions?.length);
    console.log('result.suggestions:', JSON.stringify(result?.suggestions, null, 2));
    console.log('===================');

    // 检查结果是否有效
    if (!result) {
      throw new Error('未收到识别结果');
    }

    if (!result.success) {
      throw new Error(result.error || '识别失败');
    }

    if (!result.suggestions || result.suggestions.length === 0) {
      throw new Error('未识别到蘑菇');
    }

    // 更新结果列表（这样 UI 会显示）
    setResults(result.suggestions);

    // 获取最佳匹配
    const bestMatch = result.suggestions[0];
    const confidencePercent = Math.round((bestMatch.score || 0) * 100);
    const mushroomName = bestMatch.taxon?.preferred_common_name || bestMatch.taxon?.name || '未知蘑菇';

    // 保存到数据库
    await saveIdentificationWithLocation(
      bestMatch.taxon?.scientific_name || mushroomName,
      mushroomName,
      uri
    );

    // 显示成功弹窗
    Alert.alert(
      '✅ 识别成功',
      `${mushroomName}\n置信度: ${confidencePercent}%`,
      [{ text: '确定' }]
    );

  } catch (error: any) {
    console.error('识别错误详情:', error);
    Alert.alert(
      '❌ 识别失败',
      error.message || '请确保图片清晰并重试',
      [{ text: '确定' }]
    );
  } finally {
    setIdentifying(false);
  }
};

  const resetIdentifier = () => {
    setImageUri(null);
    setResults([]);
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      {/* 修改后的 Header：移除了返回按钮，让标题居中显示 */}
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

            {/* 显示识别结果列表 */}
            {!identifying && results.length > 0 && (
              <View style={styles.resultsSection}>
                <Text style={styles.resultsTitle}>🎯 识别结果</Text>
                {results.map((item, index) => {
                  const confidence = Math.round((item.score || 0) * 100);
                  const mushroomName = item.taxon?.preferred_common_name || item.taxon?.name || '未知蘑菇';

                  return (
                    <View key={index} style={styles.resultItem}>
                      <Text style={styles.resultRank}>{index + 1}</Text>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultName}>{mushroomName}</Text>
                        <Text style={styles.resultConfidence}>
                          置信度: {confidence}%
                        </Text>
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

// Styles
const styles = StyleSheet.create({
  // 新增一个专门用于头部的样式，使其居中
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
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    fontStyle: 'italic',
  },
  resultConfidence: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  resultCommonName: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 2,
  },
});