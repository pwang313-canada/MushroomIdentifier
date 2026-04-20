// src/screens/HistoryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import DatabaseService from '../services/DatabaseService';

export function HistoryScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await DatabaseService.getIdentificationHistory();
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      currentLanguage === 'zh' ? '删除记录' : 'Delete Record',
      currentLanguage === 'zh' ? '确定要删除这条记录吗？' : 'Are you sure you want to delete this record?',
      [
        { text: currentLanguage === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: currentLanguage === 'zh' ? '删除' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            await DatabaseService.deleteIdentification(id);
            loadHistory();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      currentLanguage === 'zh' ? '清空所有记录' : 'Clear All Records',
      currentLanguage === 'zh' ? '确定要清空所有识别记录吗？此操作不可恢复。' : 'Are you sure you want to clear all records? This action cannot be undone.',
      [
        { text: currentLanguage === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: currentLanguage === 'zh' ? '清空' : 'Clear',
          style: 'destructive',
          onPress: async () => {
            await DatabaseService.clearAllIdentifications();
            loadHistory();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => navigation.navigate('MushroomDetail', { mushroom: item })}
      onLongPress={() => handleDelete(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <Text style={styles.mushroomName}>{item.name || item.scientificName || 'Unknown'}</Text>
        <Text style={styles.scientificName}>{item.scientificName}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
      <Text style={styles.deleteHint}>🗑️</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4caf50" />
          <Text style={styles.loadingText}>
            {currentLanguage === 'zh' ? '加载中...' : 'Loading...'}
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
        <Text style={styles.title}>
          {currentLanguage === 'zh' ? '识别历史' : 'Identification History'}
        </Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>
              {currentLanguage === 'zh' ? '清空' : 'Clear'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>
            {currentLanguage === 'zh'
              ? '暂无识别记录'
              : 'No identification records'}
          </Text>
          <Text style={styles.emptySubText}>
            {currentLanguage === 'zh'
              ? '去拍照识别您的第一个蘑菇吧！'
              : 'Go take a photo to identify your first mushroom!'}
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
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#4caf50',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
  },
  mushroomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
  },
  deleteHint: {
    fontSize: 18,
    color: '#ccc',
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptySubText: {
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
});