import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { MushroomService } from '../services/MushroomService';


interface SearchScreenProps {
  navigation: any;
}

export function SearchScreen({ navigation }: SearchScreenProps) {
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
      <View style={globalStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={globalStyles.backButton}>
          <Text style={globalStyles.backButtonText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={globalStyles.screenTitle}>搜索蘑菇</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="输入蘑菇名称 (如: Amanita)"
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.searchButtonActive} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>搜索</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" style={styles.loader} />}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.searchResultCard}>
            <Text style={styles.searchResultName}>{item.name}</Text>
            <Text style={styles.searchResultScientific}>{item.scientific_name}</Text>
            {item.preferred_common_name && (
              <Text style={styles.searchResultCommon}>常用名: {item.preferred_common_name}</Text>
            )}
          </View>
        )}
        contentContainerStyle={styles.searchResults}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
});
