import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { globalStyles } from '../styles/globalStyles';
import { MushroomService } from '../services/MushroomService';
import { Platform } from 'react-native';import { StyleSheet } from 'react-native';

interface CameraScreenProps {
  navigation: any;
}

export function CameraScreen({ navigation }: CameraScreenProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请允许相机访问');
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
      Alert.alert('需要权限', '请允许访问相册');
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

  const identifyMushroom = async (uri: string) => {
    setIdentifying(true);
    try {
      const suggestions = await MushroomService.identifyMushroom(uri);
      setResults(suggestions);
      if (suggestions.length === 0) {
        Alert.alert('未识别成功', '未能识别出蘑菇，请尝试拍摄更清晰的照片');
      }
    } catch (error: any) {
      Alert.alert('识别失败', error.message);
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
      <View style={globalStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={globalStyles.backButton}>
          <Text style={globalStyles.backButtonText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={globalStyles.screenTitle}>拍照识别</Text>
      </View>

      <ScrollView contentContainerStyle={styles.cameraContent}>
        {!imageUri ? (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cameraActionButton} onPress={takePhoto}>
              <Text style={styles.cameraActionIcon}>📷</Text>
              <Text style={styles.cameraActionText}>拍照</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraActionButton} onPress={pickImage}>
              <Text style={styles.cameraActionIcon}>🖼️</Text>
              <Text style={styles.cameraActionText}>从相册选择</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.resetButton} onPress={resetIdentifier}>
              <Text style={styles.resetButtonText}>重新选择</Text>
            </TouchableOpacity>
          </View>
        )}

        {identifying && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4caf50" />
            <Text style={styles.loadingText}>正在识别中...</Text>
          </View>
        )}

        {!identifying && results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>🎯 识别结果</Text>
            {results.map((item, index) => (
              <View key={index} style={styles.resultItem}>
                <Text style={styles.resultRank}>{index + 1}</Text>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{item.taxon?.name || '未知'}</Text>
                  <Text style={styles.resultConfidence}>
                    置信度: {Math.round((item.score || 0) * 100)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// 在组件外部定义样式
const styles = StyleSheet.create({
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
});
