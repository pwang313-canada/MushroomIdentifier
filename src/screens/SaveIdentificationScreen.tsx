// src/screens/SaveIdentificationScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import DatabaseService from '../services/DatabaseService';

export default function SaveIdentificationScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const { scientificName, commonName, confidence, imageUri, latitude, longitude } = route.params;
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await DatabaseService.saveIdentification({
        name: commonName || scientificName,
        scientificName,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
        imageUri,
        notes: notes.trim() || undefined,
      });
      Alert.alert(
        t('common.saved'),
        t('identification.savedSuccess'),
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert(t('common.error'), t('identification.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('identification.saveTitle')}</Text>
      <Image source={{ uri: imageUri }} style={styles.image} />
      <View style={styles.resultCard}>
        <Text style={styles.label}>{t('identification.commonName')}</Text>
        <Text style={styles.value}>{commonName || scientificName}</Text>
        <Text style={styles.label}>{t('identification.scientificName')}</Text>
        <Text style={styles.italic}>{scientificName}</Text>
        <Text style={styles.label}>{t('identification.confidence')}</Text>
        <Text style={styles.value}>{Math.round(confidence)}%</Text>
        <Text style={styles.label}>{t('identification.location')}</Text>
        <Text style={styles.value}>{`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}</Text>
      </View>
      <Text style={styles.label}>{t('identification.notes')}</Text>
      <TextInput
        style={styles.notesInput}
        multiline
        placeholder={t('identification.notesPlaceholder')}
        value={notes}
        onChangeText={setNotes}
      />
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{t('common.save')}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  image: { width: '100%', height: 200, borderRadius: 12, marginBottom: 20 },
  resultCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginTop: 10 },
  value: { fontSize: 16, color: '#333', marginTop: 4 },
  italic: { fontSize: 16, fontStyle: 'italic', color: '#333', marginTop: 4 },
  notesInput: { backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 20 },
  saveButton: { backgroundColor: '#4caf50', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});