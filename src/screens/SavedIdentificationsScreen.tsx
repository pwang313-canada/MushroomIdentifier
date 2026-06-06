// src/screens/SavedIdentificationsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Image, ScrollView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import DatabaseService, { Identification } from '../services/DatabaseService';

export default function SavedIdentificationsScreen() {
  const { t } = useTranslation();
  const [identifications, setIdentifications] = useState<Identification[]>([]);
  const [selectedItem, setSelectedItem] = useState<Identification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await DatabaseService.getAllIdentifications();
      setIdentifications(data);
    } catch (error) {
      console.error('Failed to load identifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const initialRegion = identifications.length > 0
    ? {
        latitude: identifications[0].latitude,
        longitude: identifications[0].longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }
    : {
        latitude: 43.6532,
        longitude: -79.3832,
        latitudeDelta: 10,
        longitudeDelta: 10,
      };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {identifications.map((item) => (
          <Marker
            key={item.id}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            title={item.name}
            description={`${t('identification.scientific')}: ${item.scientificName}`}
            onPress={() => setSelectedItem(item)}
          />
        ))}
      </MapView>
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>{t('identification.savedList')}</Text>
        <FlatList
          data={identifications}
          keyExtractor={(item) => item.id!.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.listItem} onPress={() => setSelectedItem(item)}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
      <Modal visible={!!selectedItem} animationType="slide" transparent={false}>
        {selectedItem && (
          <ScrollView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedItem.name}</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Image source={{ uri: selectedItem.imageUri }} style={styles.modalImage} />
            <Text style={styles.modalLabel}>{t('identification.scientificName')}</Text>
            <Text style={styles.modalValue}>{selectedItem.scientificName}</Text>
            <Text style={styles.modalLabel}>{t('identification.location')}</Text>
            <Text style={styles.modalValue}>{`${selectedItem.latitude.toFixed(4)}, ${selectedItem.longitude.toFixed(4)}`}</Text>
            <Text style={styles.modalLabel}>{t('identification.date')}</Text>
            <Text style={styles.modalValue}>{new Date(selectedItem.timestamp).toLocaleString()}</Text>
            {selectedItem.notes && (
              <>
                <Text style={styles.modalLabel}>{t('identification.notes')}</Text>
                <Text style={styles.modalValue}>{selectedItem.notes}</Text>
              </>
            )}
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 0.6 },
  listContainer: { flex: 0.4, backgroundColor: '#fff', padding: 12 },
  listTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  listItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemName: { fontSize: 16, fontWeight: '500' },
  itemDate: { fontSize: 12, color: '#666' },
  modalContainer: { flex: 1, backgroundColor: '#fff', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', flex: 1 },
  closeButton: { padding: 8 },
  closeText: { fontSize: 20, fontWeight: 'bold' },
  modalImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginTop: 12 },
  modalValue: { fontSize: 16, color: '#333', marginTop: 4 },
});