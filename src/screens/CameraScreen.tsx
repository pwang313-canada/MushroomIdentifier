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
import { GeminiService } from '../services/GeminiService';
import SubscriptionService from '../services/SubscriptionService';
import { SubscriptionModal } from '../components/SubscriptionModal';
import APIManagerService from '../services/APIManagerService';

interface CameraScreenProps {
  navigation: any;
}

const formatWikiUrlName = (scientificName: string): string => {
  return scientificName.toLowerCase().replace(/ /g, '_');
};

const openWikipedia = async (scientificName: string) => {
  const formattedName = formatWikiUrlName(scientificName);
  const url = `https://en.wikipedia.org/wiki/${formattedName}`;
  await Linking.openURL(url);
};

export function CameraScreen({ navigation }: CameraScreenProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedApi, setSelectedApi] = useState<'nyckel' | 'kindwise' | 'gemini'>('gemini');
  const [showDropdown, setShowDropdown] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [remainingFreeUses, setRemainingFreeUses] = useState(3);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [apiStats, setApiStats] = useState<any>(null);

  // Location saving state
  const [locationSaved, setLocationSaved] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  // Store current location for save screen
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Helper: save photo location immediately
  const savePhotoLocation = async (uri: string) => {
    setSavingLocation(true);
    setLocationSaved(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission not granted');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      await DatabaseService.savePhotoLocation(uri, loc.coords.latitude, loc.coords.longitude);
      setLocationSaved(true);
      // Store location for later use in save screen
      setCurrentLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      console.log('Photo location saved');
    } catch (error) {
      console.error('Failed to save photo location:', error);
      setLocationSaved(false);
    } finally {
      setSavingLocation(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await DatabaseService.createPhotoLocationsTable();
        const isHealthy = await checkNyckelHealth();
        console.log('Nyckel API status:', isHealthy);
        await loadSubscriptionStatus();
        await APIManagerService.loadAPIKeysFromBackend();
        const stats = await APIManagerService.getUsageStats();
        console.log('API key pool status:', stats);
        setApiStats(stats);
        const googleAPI = await APIManagerService.getAvailableGoogleAPI();
        if (googleAPI) {
          console.log(`Available Google API: ${googleAPI.id} (${googleAPI.model})`);
        } else {
          console.warn('No available Google API key');
        }
      } catch (error) {
        console.error('Initialization failed:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const loadSubscriptionStatus = async () => {
    const status = await SubscriptionService.getSubscriptionStatus();
    setIsSubscribed(status.isSubscribed);
    setRemainingFreeUses(status.remainingFreeUses);
  };

  // Get current location for saving (used after identification)
  const getCurrentLocation = async (): Promise<{ lat: number; lon: number } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({});
      return { lat: loc.coords.latitude, lon: loc.coords.longitude };
    } catch (error) {
      console.error('Location error:', error);
      return null;
    }
  };

  // Navigate to save screen with the top result
  const handleSaveResult = async () => {
    if (!results.length) return;
    const top = results[0];
    const name = top.taxon?.preferred_common_name || top.taxon?.name || 'Unknown';
    const scientific = top.taxon?.scientific_name || top.taxon?.name || 'Unknown';
    const confidence = Math.round((top.score || 0) * 100);
    let location = currentLocation;
    if (!location) {
      location = await getCurrentLocation();
    }
    navigation.navigate('SaveIdentification', {
      scientificName: scientific,
      commonName: name,
      confidence,
      imageUri,
      latitude: location?.lat || 0,
      longitude: location?.lon || 0,
    });
  };

  // Identification functions (no longer auto-save)
  const identifyWithNyckel = async (uri: string) => {
    setIdentifying(true);
    try {
      const result = await identifyMushroomWithNyckel(uri);
      if (result && result.success && result.suggestions.length > 0) {
        setResults(result.suggestions.slice(0, 3));
      } else {
        Alert.alert(
          currentLanguage === 'zh' ? '识别失败' : 'Identification Failed',
          currentLanguage === 'zh' ? '无法识别图片中的蘑菇' : 'Cannot identify mushroom in the image'
        );
      }
    } catch (error) {
      console.error('Nyckel identification error:', error);
      Alert.alert('Error', 'Identification failed with Nyckel');
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
      } else {
        Alert.alert(
          currentLanguage === 'zh' ? '识别失败' : 'Identification Failed',
          currentLanguage === 'zh' ? '无法识别图片中的蘑菇' : 'Cannot identify mushroom in the image'
        );
      }
    } catch (error) {
      console.error('Kindwise identification error:', error);
      Alert.alert('Error', 'Identification failed with Kindwise');
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
      } else {
        Alert.alert(
          currentLanguage === 'zh' ? '识别失败' : 'Identification Failed',
          currentLanguage === 'zh' ? '无法识别图片中的蘑菇' : 'Cannot identify mushroom in the image'
        );
      }
    } catch (error) {
      console.error('Gemini identification error:', error);
      Alert.alert('Error', 'Identification failed with Gemini');
    } finally {
      setIdentifying(false);
    }
  };

  const executeIdentification = async () => {
    if (selectedApi === 'nyckel') {
      await identifyWithNyckel(imageUri!);
    } else if (selectedApi === 'kindwise') {
      await identifyWithKindwise(imageUri!);
    } else {
      await identifyWithGemini(imageUri!);
    }
  };

  const checkAndExecuteIdentification = async () => {
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

    const canUse = await SubscriptionService.canUseFeature();
    if (!canUse) {
      setShowSubscriptionModal(true);
      return;
    }

    const usage = await SubscriptionService.recordUsage();
    if (usage.allowed) {
      if (usage.remainingFreeUses !== -1) {
        setRemainingFreeUses(usage.remainingFreeUses);
        Alert.alert(
          currentLanguage === 'zh' ? '免费试用' : 'Free Trial',
          currentLanguage === 'zh'
            ? `您还剩 ${usage.remainingFreeUses} 次免费识别机会`
            : `You have ${usage.remainingFreeUses} free identifications left`,
          [{ text: currentLanguage === 'zh' ? '继续' : 'Continue' }]
        );
      }
      await executeIdentification();
    } else {
      setShowSubscriptionModal(true);
    }
  };

  // Image pickers (save location immediately)
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
      const uri = result.assets[0].uri;
      setImageUri(uri);
      setResults([]);
      await savePhotoLocation(uri);
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
      const uri = result.assets[0].uri;
      setImageUri(uri);
      setResults([]);
      await savePhotoLocation(uri);
    }
  };

  const selectApi = (api: 'nyckel' | 'kindwise' | 'gemini') => {
    setSelectedApi(api);
    setShowDropdown(false);
  };

  const isExecuteDisabled = () => !imageUri || identifying || !disclaimerAccepted;

  if (isInitializing) {
    return (
      <SafeAreaView style={globalStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4caf50" />
          <Text style={styles.loadingText}>
            {currentLanguage === 'zh' ? '初始化中...' : 'Initializing...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('home.camera')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Image Selection Buttons */}
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

        {/* Selected Image Preview */}
        {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}

        {/* Location saving status indicator */}
        {imageUri && (
          <View style={styles.locationStatus}>
            {savingLocation ? (
              <ActivityIndicator size="small" color="#4caf50" />
            ) : locationSaved ? (
              <Text style={styles.locationSavedText}>
                📍 {currentLanguage === 'zh' ? '位置已保存' : 'Location saved'}
              </Text>
            ) : (
              <Text style={styles.locationFailedText}>
                ⚠️ {currentLanguage === 'zh' ? '无法保存位置' : 'Could not save location'}
              </Text>
            )}
          </View>
        )}

        {/* Subscription Status */}
        {!isSubscribed && (
          <View style={styles.trialBadge}>
            <Text style={styles.trialText}>
              🔥 {currentLanguage === 'zh'
                ? `免费试用剩余: ${remainingFreeUses} 次`
                : `Free trial: ${remainingFreeUses} left`}
            </Text>
          </View>
        )}

        {isSubscribed && (
          <View style={styles.subscribedBadge}>
            <Text style={styles.subscribedText}>
              ⭐ {currentLanguage === 'zh' ? '会员已订阅' : 'Subscribed'}
            </Text>
          </View>
        )}

        {/* API Selection Dropdown */}
        <View style={styles.dropdownWrapper}>
          <Text style={styles.dropdownLabel}>
            {currentLanguage === 'zh' ? '选择识别服务:' : 'Select API Service:'}
          </Text>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowDropdown(!showDropdown)}>
            <Text style={styles.dropdownButtonText}>
              {selectedApi === 'nyckel' ? '🤖 Nyckel' : selectedApi === 'kindwise' ? '🍄 Kindwise' : '✨ Gemini (Auto-Switch)'}
            </Text>
            <Text>{showDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showDropdown && (
            <View style={styles.dropdownList}>
              <TouchableOpacity onPress={() => selectApi('nyckel')} style={styles.dropdownItem}>
                <Text>🤖 Nyckel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => selectApi('kindwise')} style={styles.dropdownItem}>
                <Text>🍄 Kindwise</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => selectApi('gemini')} style={styles.dropdownItem}>
                <Text>✨ Gemini (Auto 1.5/2.5)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Disclaimer Checkbox */}
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}>
          <View style={[styles.checkbox, disclaimerAccepted && styles.checkboxChecked]}>
            {disclaimerAccepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            {currentLanguage === 'zh'
              ? '我确认识别结果仅供参考，不用于食用决策'
              : 'I confirm that the results are for reference only, not for consumption decisions'}
          </Text>
        </TouchableOpacity>

        {/* Execute Button */}
        <TouchableOpacity
          style={[styles.executeButton, isExecuteDisabled() && styles.disabled]}
          onPress={checkAndExecuteIdentification}
          disabled={isExecuteDisabled()}
        >
          <Text style={styles.executeButtonText}>
            {identifying
              ? (currentLanguage === 'zh' ? '识别中...' : 'Identifying...')
              : (currentLanguage === 'zh' ? '🔍 开始识别' : '🔍 Start Identification')
            }
          </Text>
        </TouchableOpacity>

        {identifying && <ActivityIndicator size="large" color="#4caf50" style={styles.loader} />}

        {/* Results Section */}
        {!identifying && results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              {currentLanguage === 'zh' ? '🎯 识别结果' : '🎯 Results'}
            </Text>
            {results.map((item, idx) => {
              const name = item.taxon?.preferred_common_name || item.taxon?.name || 'Unknown';
              const scientific = item.taxon?.scientific_name || item.taxon?.name || 'Unknown';
              const confidence = Math.round((item.score || 0) * 100);
              return (
                <View key={idx} style={styles.resultCard}>
                  <Text style={styles.rank}>{idx + 1}</Text>
                  <View style={styles.resultContent}>
                    <Text style={styles.commonName}>{name}</Text>
                    <Text style={styles.scientificName}>
                      {currentLanguage === 'zh' ? '学名: ' : 'Scientific: '}
                      <Text style={styles.italic}>{scientific}</Text>
                    </Text>
                    <View style={styles.confidenceBar}>
                      <View style={[styles.confidenceFill, { width: `${confidence}%` }]} />
                    </View>
                    <Text style={styles.confidenceText}>
                      {currentLanguage === 'zh' ? `置信度: ${confidence}%` : `Confidence: ${confidence}%`}
                    </Text>
                    <TouchableOpacity onPress={() => openWikipedia(scientific)} style={styles.wikiBtn}>
                      <Text style={styles.wikiBtnText}>🔗 Wikipedia</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* Save button – shown only when there are results */}
            <TouchableOpacity style={styles.saveResultButton} onPress={handleSaveResult}>
              <Text style={styles.saveResultButtonText}>
                💾 {currentLanguage === 'zh' ? '保存识别结果' : 'Save this mushroom'}
              </Text>
            </TouchableOpacity>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ {currentLanguage === 'zh'
                  ? '识别结果仅供参考，请勿仅凭此结果食用任何蘑菇。如有疑问，请咨询蘑菇专家。'
                  : 'Results are for reference only. Do not eat any mushroom based solely on this identification. Consult an expert if in doubt.'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Subscription Modal */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={(subscribed) => {
          setShowSubscriptionModal(false);
          if (subscribed) {
            setIsSubscribed(true);
            executeIdentification();
          }
        }}
        remainingUses={remainingFreeUses}
      />
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
  locationStatus: { alignItems: 'center', marginVertical: 8 },
  locationSavedText: { fontSize: 12, color: '#4caf50' },
  locationFailedText: { fontSize: 12, color: '#e65100' },
  trialBadge: { backgroundColor: '#fff3e0', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  trialText: { fontSize: 14, color: '#e65100', fontWeight: '600' },
  subscribedBadge: { backgroundColor: '#e8f5e9', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  subscribedText: { fontSize: 14, color: '#4caf50', fontWeight: '600' },
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
  saveResultButton: { backgroundColor: '#4caf50', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 12 },
  saveResultButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  warningBox: { backgroundColor: '#fff3e0', padding: 12, borderRadius: 10, marginTop: 8 },
  warningText: { fontSize: 12, color: '#e65100', lineHeight: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
});