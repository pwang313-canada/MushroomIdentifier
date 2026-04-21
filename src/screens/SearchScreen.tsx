// SearchScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { globalStyles } from '../styles/globalStyles';
import WikipediaService, { WikipediaSearchResult } from '../services/WikipediaService';

interface SearchScreenProps {
  navigation: any;
}

// 检查字符串是否包含中文
const containsChinese = (text: string): boolean => {
  return /[\u4e00-\u9fa5]/.test(text);
};

// 打开 Wikipedia 页面 - 正确处理中文和英文
const openWikipedia = async (title: string, language?: string) => {
  try {
    let url: string;

    // 确定使用哪个语言的 Wikipedia
    let useChinese = false;

    if (language === 'zh') {
      useChinese = true;
    } else if (language === 'en') {
      useChinese = false;
    } else {
      // 自动检测：如果标题包含中文，使用中文 Wikipedia
      useChinese = containsChinese(title);
    }

    if (useChinese) {
      // 中文 Wikipedia: 直接使用标题，不需要编码
      // 例如: https://zh.wikipedia.org/wiki/金针菇
      url = `https://zh.wikipedia.org/wiki/${title}`;
      console.log('Opening Chinese Wikipedia URL:', url);
    } else {
      // 英文 Wikipedia: 需要将空格替换为下划线并编码
      const formattedTitle = title.replace(/ /g, '_');
      url = `https://en.wikipedia.org/wiki/${encodeURIComponent(formattedTitle)}`;
      console.log('Opening English Wikipedia URL:', url);
    }

    // 检查是否可以打开
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // 备用方案：使用编码后的URL
      const encodedUrl = useChinese
        ? `https://zh.wikipedia.org/wiki/${encodeURIComponent(title)}`
        : url;
      await Linking.openURL(encodedUrl);
    }
  } catch (error) {
    console.error('无法打开 Wikipedia:', error);
    Alert.alert('错误', '无法打开 Wikipedia 页面，请检查网络连接。');
  }
};

export function SearchScreen({ navigation }: SearchScreenProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WikipediaSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      // 使用 Wikipedia API 搜索
      const searchResults = await WikipediaService.searchMushrooms(query);

      // 为每个结果添加语言标识
      const resultsWithLang = searchResults.map(result => ({
        ...result,
        language: containsChinese(result.title) ? 'zh' : 'en',
      }));

      setResults(resultsWithLang);
      console.log(`Found ${searchResults.length} mushroom results for "${query}"`);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('错误', '搜索失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  const renderMushroomItem = ({ item }: { item: WikipediaSearchResult & { language?: string } }) => {
    const language = item.language || (containsChinese(item.title) ? 'zh' : 'en');
    const isChinese = language === 'zh';

    return (
      <TouchableOpacity
        style={styles.searchResultCard}
        onPress={() => openWikipedia(item.title, language)}
        activeOpacity={0.7}
      >
        {/* 图片缩略图 */}
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailPlaceholderText}>🍄</Text>
          </View>
        )}

        {/* 内容区域 */}
        <View style={styles.resultContent}>
          <View style={styles.titleRow}>
            <Text style={styles.searchResultName} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.languageBadge, isChinese ? styles.chineseBadge : styles.englishBadge]}>
              {isChinese ? '中文' : 'EN'}
            </Text>
          </View>
          <Text style={styles.searchResultSnippet} numberOfLines={3}>
            {item.snippet || item.description || '暂无描述'}
          </Text>
          <View style={styles.resultFooter}>
            <Text style={styles.wikipediaBadge}>Wikipedia</Text>
            <Text style={styles.readMore}>阅读更多 →</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>
          {currentLanguage === 'zh' ? '搜索蘑菇' : 'Search Mushrooms'}
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={currentLanguage === 'zh' ? '输入蘑菇名称...' : 'Enter mushroom name...'}
          placeholderTextColor="#999"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButtonActive} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>{t('buttons.search')}</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4caf50" />
          <Text style={styles.loadingText}>
            {currentLanguage === 'zh' ? '搜索中...' : 'Searching...'}
          </Text>
        </View>
      )}

      {/* Results List */}
      <FlatList
        data={results}
        keyExtractor={(item, index) => `${item.pageid}-${index}`}
        renderItem={renderMushroomItem}
        contentContainerStyle={styles.searchResults}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading && searched ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>
                {currentLanguage === 'zh' ? '未找到相关蘑菇' : 'No mushrooms found'}
              </Text>
              <Text style={styles.emptySubtext}>
                {currentLanguage === 'zh'
                  ? `尝试搜索 "金针菇"、"香菇" 或 "Agaricus"`
                  : `Try searching for "mushroom", "Agaricus", or "fungus"`}
              </Text>
            </View>
          ) : !searched ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.searchPromptIcon}>🍄</Text>
              <Text style={styles.searchPromptText}>
                {currentLanguage === 'zh' ? '输入蘑菇名称开始搜索' : 'Enter mushroom name to start searching'}
              </Text>
              <Text style={styles.searchPromptSubtext}>
                {currentLanguage === 'zh' ? '使用 Wikipedia 数据库' : 'Powered by Wikipedia'}
              </Text>
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
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchButtonActive: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 25,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  searchResults: {
    padding: 16,
  },
  searchResultCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailPlaceholderText: {
    fontSize: 32,
  },
  resultContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  languageBadge: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    overflow: 'hidden',
  },
  chineseBadge: {
    backgroundColor: '#e8f5e9',
    color: '#4caf50',
  },
  englishBadge: {
    backgroundColor: '#e3f2fd',
    color: '#2196f3',
  },
  searchResultSnippet: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wikipediaBadge: {
    fontSize: 11,
    color: '#2196f3',
    fontWeight: '500',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  readMore: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
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
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
  },
  searchPromptIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.3,
  },
  searchPromptText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    textAlign: 'center',
  },
  searchPromptSubtext: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
  },
});