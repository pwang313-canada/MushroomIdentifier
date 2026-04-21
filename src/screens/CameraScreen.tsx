// src/screens/CameraScreen.tsx
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
import { GeminiService } from '../services/GeminiService';

interface CameraScreenProps {
  navigation: any;
}

const formatWikiUrlName = (scientificName: string): string => {
  return scientificName.toLowerCase().replace(/ /g, '_');
};

const openWikipedia = async (scientificName: string) => {
  const formattedName = formatWikiUrlName(scientificName);
  const url = `https://en.wikipedia.org/wiki/${formattedName}`;
  console.log('Opening Wikipedia URL:', url);
  await Linking.openURL(url);
};

export function CameraScreen({ navigation }: CameraScreenProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedApi, setSelectedApi] = useState<'nyckel' | 'kindwise' | 'gemini'>('nyckel');
  const [showDropdown, setShowDropdown] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const saveIdentificationWithLocation = async (scientificName: string, commonName: string, imageUri: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({});
      await DatabaseService.saveIdentification({
        name: commonName || scientificName,
        scientificName: scientificName,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: new Date().toISOString(),
        imageUri: imageUri,
      });
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const identifyWithNyckel = async (uri: string) => {
    setIdentifying(true);
    try {
      const result = await identifyMushroomWithNyckel(uri);
      if (result && result.success && result.suggestions.length > 0) {
        setResults(result.suggestions.slice(0, 3));
        const top = result.suggestions[0];
        if (top) {
          await saveIdentificationWithLocation(top.taxon.name, top.taxon.name, uri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Nyckel识别失败');
    } finally {
      setIdentifying(false);
    }
  };

  const identifyWithKindwise = async (uri: string) => {
    setIdentifying(true);
    try {
      const result = await KindwiseService.identifyMushroom(uri);
      if (result && result.suggestions && result.suggestions.length > 0) {
        const formatted = result.suggestions.slice(0, 3).map((s: any) => ({
          taxon: { name: s.name, scientific_name: s.name },
          score: s.probability
        }));
        setResults(formatted);
        await saveIdentificationWithLocation(result.suggestions[0].name, result.suggestions[0].name, uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Kindwise识别失败');
    } finally {
      setIdentifying(false);
    }
  };

  const identifyWithGemini = async (uri: string) => {
    setIdentifying(true);
    try {
      const result = await GeminiService.identifyMushroom(uri);
      if (result && result.scientificName) {
        setResults([{
          taxon: { name: result.name, scientific_name: result.scientificName },
          score: result.confidence / 100
        }]);
        await saveIdentificationWithLocation(result.scientificName, result.name, uri);
      } else {
        Alert.alert('识别失败', '无法识别图片中的蘑菇');
      }
    } catch (error) {
      Alert.alert('Error', 'Gemini识别失败');
    } finally {
      setIdentifying(false);
    }
  };

  const executeIdentification = async () => {
    if (!imageUri) {
      Alert.alert('请先选择图片', '请先拍照或从相册选择一张图片');
      return;
    }
    if (!disclaimerAccepted) {
      Alert.alert('请确认免责声明', '请勾选"结果仅供参考"复选框后再进行识别');
      return;
    }

    if (selectedApi === 'nyckel') await identifyWithNyckel(imageUri);
    else if (selectedApi === 'kindwise') await identifyWithKindwise(imageUri);
    else await identifyWithGemini(imageUri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
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
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
      setResults([]);
    }
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('home.camera')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionText}>{t('mushroom.takePhoto')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
            <Text style={styles.actionIcon}>🖼️</Text>
            <Text style={styles.actionText}>{t('mushroom.selectPhoto')}</Text>
          </TouchableOpacity>
        </View>

        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        )}

        <View style={styles.dropdownWrapper}>
          <Text style={styles.dropdownLabel}>选择识别服务:</Text>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowDropdown(!showDropdown)}>
            <Text style={styles.dropdownButtonText}>
              {selectedApi === 'nyckel' ? '🤖 Nyckel' : selectedApi === 'kindwise' ? '🍄 Kindwise' : '✨ Gemini'}
            </Text>
            <Text>{showDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showDropdown && (
            <View style={styles.dropdownList}>
              <TouchableOpacity onPress={() => { setSelectedApi('nyckel'); setShowDropdown(false); }} style={styles.dropdownItem}>
                <Text>🤖 Nyckel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setSelectedApi('kindwise'); setShowDropdown(false); }} style={styles.dropdownItem}>
                <Text>🍄 Kindwise</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setSelectedApi('gemini'); setShowDropdown(false); }} style={styles.dropdownItem}>
                <Text>✨ Gemini</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.checkboxRow} onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}>
          <View style={[styles.checkbox, disclaimerAccepted && styles.checkboxChecked]}>
            {disclaimerAccepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>我确认识别结果仅供参考，不用于食用决策</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.executeButton, (!imageUri || identifying || !disclaimerAccepted) && styles.disabled]}
          onPress={executeIdentification}
          disabled={!imageUri || identifying || !disclaimerAccepted}
        >
          <Text style={styles.executeButtonText}>{identifying ? '识别中...' : '🔍 开始识别'}</Text>
        </TouchableOpacity>

        {identifying && <ActivityIndicator size="large" color="#4caf50" style={styles.loader} />}

        {!identifying && results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>🎯 识别结果</Text>
            {results.map((item, idx) => {
              const name = item.taxon?.preferred_common_name || item.taxon?.name || 'Unknown';
              const scientific = item.taxon?.scientific_name || item.taxon?.name || 'Unknown';
              const confidence = Math.round((item.score || 0) * 100);
              return (
                <View key={idx} style={styles.resultCard}>
                  <Text style={styles.rank}>{idx + 1}</Text>
                  <View style={styles.resultContent}>
                    <Text style={styles.commonName}>{name}</Text>
                    <Text style={styles.scientificName}>学名: <Text style={styles.italic}>{scientific}</Text></Text>
                    <View style={styles.confidenceBar}>
                      <View style={[styles.confidenceFill, { width: `${confidence}%` }]} />
                    </View>
                    <Text style={styles.confidenceText}>置信度: {confidence}%</Text>
                    <TouchableOpacity onPress={() => openWikipedia(scientific)} style={styles.wikiBtn}>
                      <Text style={styles.wikiBtnText}>🔗 Wikipedia</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>⚠️ 识别结果仅供参考，请勿仅凭此结果食用任何蘑菇。</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
  content: { padding: 20 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  actionButton: { alignItems: 'center', padding: 20, backgroundColor: '#fff', borderRadius: 12, width: '45%', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 }, android: { elevation: 3 } }) },
  actionIcon: { fontSize: 40 },
  actionText: { fontSize: 14, marginTop: 10, color: '#2c3e50' },
  preview: { width: '100%', height: 250, borderRadius: 12, marginBottom: 20 },
  dropdownWrapper: { marginBottom: 20, position: 'relative', zIndex: 100 },
  dropdownLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#2c3e50' },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  dropdownButtonText: { fontSize: 16 },
  dropdownList: { position: 'absolute', top: 80, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', zIndex: 1000 },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#4caf50', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#4caf50' },
  checkmark: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  checkboxLabel: { flex: 1, fontSize: 13, color: '#666' },
  executeButton: { backgroundColor: '#4caf50', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  disabled: { backgroundColor: '#ccc' },
  executeButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loader: { marginVertical: 20 },
  resultsSection: { marginTop: 10 },
  resultsTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#2c3e50' },
  resultCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 }, android: { elevation: 2 } }) },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4caf50', color: '#fff', textAlign: 'center', textAlignVertical: 'center', fontSize: 16, fontWeight: 'bold', marginRight: 12 },
  resultContent: { flex: 1 },
  commonName: { fontSize: 18, fontWeight: 'bold', marginBottom: 6, color: '#2c3e50' },
  scientificName: { fontSize: 14, color: '#666', marginBottom: 10 },
  italic: { fontStyle: 'italic' },
  confidenceBar: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, marginBottom: 4 },
  confidenceFill: { height: '100%', backgroundColor: '#4caf50', borderRadius: 3 },
  confidenceText: { fontSize: 12, color: '#666', marginBottom: 10 },
  wikiBtn: { backgroundColor: '#e3f2fd', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start' },
  wikiBtnText: { fontSize: 12, color: '#2196f3', fontWeight: '500' },
  warningBox: { flexDirection: 'row', backgroundColor: '#fff3e0', padding: 12, borderRadius: 10, marginTop: 16 },
  warningText: { flex: 1, fontSize: 12, color: '#e65100' },
});