import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { globalStyles } from '../styles/globalStyles';
import { MushroomService } from '../services/MushroomService';

interface SearchScreenProps {
  navigation: any;
}

export function SearchScreen({ navigation }: SearchScreenProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const data = await MushroomService.searchMushroomByName(query);
    setResults(data);
    setLoading(false);
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      {/* Header without back button */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>
          {currentLanguage === 'zh' ? '搜索蘑菇' : 'Search Mushrooms'}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('mushroom.searchPlaceholder')}
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.searchButtonActive} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>{t('buttons.search')}</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" style={styles.loader} />}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.searchResultCard}
            onPress={() => navigation.navigate('MushroomDetail', { mushroom: item })}
          >
            <Text style={styles.searchResultName}>{item.name}</Text>
            <Text style={styles.searchResultScientific}>{item.scientific_name}</Text>
            {item.preferred_common_name && (
              <Text style={styles.searchResultCommon}>
                {t('mushroom.commonName')}: {item.preferred_common_name}
              </Text>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.searchResults}
        ListEmptyComponent={
          !loading && query.trim() !== '' && results.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('status.noData')}</Text>
              <Text style={styles.emptySubtext}>{t('status.error')}</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  searchContainer: {
    flexDirection: 'row' as 'row',
    padding: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchButtonActive: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginTop: 30,
  },
  searchResults: {
    padding: 20,
  },
  searchResultCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    fontStyle: 'italic',
  },
  searchResultScientific: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  searchResultCommon: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});