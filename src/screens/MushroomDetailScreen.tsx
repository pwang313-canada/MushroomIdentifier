// src/screens/MushroomDetailScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Linking,
  Dimensions,
  FlatList,
  Image,
  Platform,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { globalStyles } from '../styles/globalStyles';
import { MushroomService } from '../services/MushroomService';
import { Mushroom } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

const { width: screenWidth } = Dimensions.get('window');

// ---------- Helper: clean scientific name (remove spp./sp.) ----------
function getSearchTerm(scientificName: string): string {
  const cleaned = scientificName.trim();
  if (/spp\.?$/i.test(cleaned) || /sp\.?$/i.test(cleaned)) {
    const parts = cleaned.split(/\s+/);
    if (parts.length > 0) return parts[0];
  }
  return cleaned;
}

// ---------- NEW: Fetch description from Chinese Wikipedia ----------
async function fetchChineseWikipediaDescription(mushroomName: string): Promise<string | null> {
  try {
    const searchUrl = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(mushroomName)}`;
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (data && data.extract && !data.missing) {
      console.log(`✅ 从中文维基百科获取到描述: ${mushroomName}`);
      // Limit description length to 800 characters
      return data.extract.length > 800 ? data.extract.substring(0, 800) + '...' : data.extract;
    }
    return null;
  } catch (error) {
    console.log(`⚠️ 中文维基百科搜索失败 (${mushroomName}):`, error);
    return null;
  }
}

// ---------- NEW: Fetch image from iNaturalist ----------
async function fetchImageFromiNaturalist(scientificName: string): Promise<string | null> {
  const searchTerm = getSearchTerm(scientificName);
  try {
    const searchUrl = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(searchTerm)}&per_page=1`;
    const searchRes = await fetch(searchUrl);
    const searchJson = await searchRes.json();
    if (!searchJson.results || searchJson.results.length === 0) return null;
    const taxonId = searchJson.results[0].id;
    const taxonUrl = `https://api.inaturalist.org/v1/taxa/${taxonId}`;
    const taxonRes = await fetch(taxonUrl);
    const taxonJson = await taxonRes.json();
    const taxon = taxonJson.results?.[0];
    return taxon?.default_photo?.medium_url || null;
  } catch (error) {
    console.error(`图片获取失败 ${scientificName}:`, error);
    return null;
  }
}

// Placeholder component
const PlaceholderImageComponent = ({ size = 250 }: { size?: number }) => (
  <View style={[styles.placeholderImageContainer, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={styles.placeholderEmoji}>🍄</Text>
    <Text style={styles.placeholderText}>Loading image...</Text>
  </View>
);

export function MushroomDetailScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const { isEnglish } = useLanguage();
  const { mushrooms, initialIndex, type } = route.params;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [wikiDescriptions, setWikiDescriptions] = useState<{ [key: string]: string }>({});
  const [chineseWikiDescriptions, setChineseWikiDescriptions] = useState<{ [key: string]: string }>({});
  const [descriptionSource, setDescriptionSource] = useState<{ [key: string]: 'zhwiki' | 'enwiki' | 'local' }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [imageLoaded, setImageLoaded] = useState<{ [key: string]: boolean }>({});
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string | null }>({});

  const currentMushroom = mushrooms[currentIndex];

  useEffect(() => {
    loadMushroomData(currentMushroom);
    preloadAdjacentImages();
  }, [currentIndex]);

  const loadMushroomData = async (mushroom: Mushroom) => {
    // Get Chinese name for Wikipedia search (use name field which is Chinese)
    const chineseName = mushroom.name;
    
    // Try to fetch Chinese Wikipedia description first (if not in English mode)
    if (!isEnglish && !chineseWikiDescriptions[mushroom.id] && !wikiDescriptions[mushroom.id]) {
      setLoading(prev => ({ ...prev, [mushroom.id]: true }));
      
      // Try Chinese Wikipedia
      const zhDescription = await fetchChineseWikipediaDescription(chineseName);
      
      if (zhDescription) {
        setChineseWikiDescriptions(prev => ({ ...prev, [mushroom.id]: zhDescription }));
        setDescriptionSource(prev => ({ ...prev, [mushroom.id]: 'zhwiki' }));
      } else {
        // Fallback to English Wikipedia via MushroomService
        const enDescription = await MushroomService.fetchWikiDescription(mushroom.scientificName);
        setWikiDescriptions(prev => ({ ...prev, [mushroom.id]: enDescription }));
        setDescriptionSource(prev => ({ ...prev, [mushroom.id]: enDescription ? 'enwiki' : 'local' }));
      }
      
      setLoading(prev => ({ ...prev, [mushroom.id]: false }));
    } 
    // For English mode, use English Wikipedia
    else if (isEnglish && !wikiDescriptions[mushroom.id]) {
      setLoading(prev => ({ ...prev, [mushroom.id]: true }));
      const description = await MushroomService.fetchWikiDescription(mushroom.scientificName);
      setWikiDescriptions(prev => ({ ...prev, [mushroom.id]: description }));
      setDescriptionSource(prev => ({ ...prev, [mushroom.id]: description ? 'enwiki' : 'local' }));
      setLoading(prev => ({ ...prev, [mushroom.id]: false }));
    }
    
    // Fetch image if not already available
    if (!imageUrls[mushroom.id] && !mushroom.imageUrl) {
      const imageUrl = await fetchImageFromiNaturalist(mushroom.scientificName);
      setImageUrls(prev => {
        const newUrls = { ...prev };
        newUrls[mushroom.id] = imageUrl ?? null;
        return newUrls;
      });
    } else if (mushroom.imageUrl && !imageUrls[mushroom.id]) {
      setImageUrls(prev => {
        const newUrls = { ...prev };
        newUrls[mushroom.id] = mushroom.imageUrl ?? null;
        return newUrls;
      });
    }
  };

  const preloadAdjacentImages = () => {
    const indices = [currentIndex - 1, currentIndex + 1];
    for (const idx of indices) {
      if (idx >= 0 && idx < mushrooms.length) {
        const mushroom = mushrooms[idx];
        const imageUrl = imageUrls[mushroom.id] || mushroom.imageUrl;
        if (imageUrl && !imageLoaded[mushroom.id]) {
          Image.prefetch(imageUrl);
        }
      }
    }
  };

  const onScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / screenWidth);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  // Get display name based on language
  const getDisplayName = (mushroom: Mushroom) => {
    if (isEnglish) {
      return mushroom.nameEn || mushroom.scientificName;
    }
    return mushroom.name;
  };

  // Get display toxicity based on language
  const getDisplayToxicity = (mushroom: Mushroom) => {
    if (mushroom.type === 'toxic' && mushroom.toxicity) {
      if (isEnglish && mushroom.toxicityEn) {
        return mushroom.toxicityEn;
      }
      return mushroom.toxicity;
    }
    return null;
  };

  // Get display description based on language and available sources
  const getDisplayDescription = (mushroom: Mushroom) => {
    // For Chinese mode: prioritize Chinese Wikipedia, then local description, then English Wikipedia
    if (!isEnglish) {
      const zhWikiDesc = chineseWikiDescriptions[mushroom.id];
      if (zhWikiDesc && zhWikiDesc.length > 0) {
        return zhWikiDesc;
      }
      
      if (mushroom.description && mushroom.description.length > 0) {
        return mushroom.description;
      }
      
      const enWikiDesc = wikiDescriptions[mushroom.id];
      if (enWikiDesc && enWikiDesc.length > 0) {
        return enWikiDesc;
      }
      
      return `关于${mushroom.name}的详细信息，请参考上方的维基百科链接。`;
    }
    
    // For English mode: use English Wikipedia, then local English description
    const enWikiDesc = wikiDescriptions[mushroom.id];
    if (enWikiDesc && enWikiDesc.length > 0) {
      return enWikiDesc;
    }
    
    if (isEnglish && mushroom.descriptionEn) {
      return mushroom.descriptionEn;
    }
    
    if (isEnglish) {
      return `The ${mushroom.scientificName} is a ${mushroom.type === 'edible' ? 'edible' : 'toxic'} mushroom species. For more detailed information, please refer to the Wikipedia link above.`;
    }
    
    return mushroom.description || '暂无详细描述';
  };

  // Get description source credit text
  const getDescriptionCredit = (mushroom: Mushroom) => {
    const source = descriptionSource[mushroom.id];
    if (!isEnglish) {
      if (source === 'zhwiki') return '🔍 描述来自中文维基百科';
      if (source === 'enwiki') return '🔍 描述来自维基百科 (英文)';
      return null;
    }
    if (source === 'enwiki') return '🔍 Description from Wikipedia';
    return null;
  };

const renderItem = ({ item }: { item: Mushroom }) => {
  const isLoading = loading[item.id];
  const description = getDisplayDescription(item);
  const descriptionCredit = getDescriptionCredit(item);
  const imageUrl = imageUrls[item.id] || item.imageUrl;
  const isImageLoaded = imageLoaded[item.id];
  const displayName = getDisplayName(item);
  const displayToxicity = getDisplayToxicity(item);

  // Get Wikipedia URL based on language
  const getWikipediaUrl = (mushroom: Mushroom) => {
    if (!isEnglish) {
      // 中文模式：使用中文维基百科链接
      const chineseName = mushroom.name;
      return `https://zh.wikipedia.org/wiki/${encodeURIComponent(chineseName)}`;
    }
    // 英文模式：使用原有的英文维基百科链接
    return mushroom.wikiUrl;
  };

  // Get Wikipedia button text based on language
  const getWikipediaButtonText = () => {
    if (!isEnglish) {
      return '📖 在中文维基百科查看详情';
    }
    return t('mushroom.wikiLink');
  };

  return (
    <ScrollView 
      style={styles.pageContainer}
      showsVerticalScrollIndicator={false}
      bounces={false}>
      <View style={styles.detailCard}>
        <View style={styles.imageContainer}>
          {!isImageLoaded && (
            <View style={styles.imageLoadingContainer}>
              <ActivityIndicator size="large" color="#4caf50" />
              <Text style={styles.imageLoadingText}>{t('status.loading')}</Text>
            </View>
          )}
          
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={[styles.nativeMushroomImage, !isImageLoaded && { opacity: 0 }]}
              onLoad={() => {
                setImageLoaded(prev => ({ ...prev, [item.id]: true }));
              }}
              onError={() => {
                console.log('图片加载失败:', item.name);
                setImageLoaded(prev => ({ ...prev, [item.id]: true }));
              }}
              resizeMode="cover"
            />
          ) : (
            <PlaceholderImageComponent size={250} />
          )}
          
          {isImageLoaded && !imageUrl && (
            <PlaceholderImageComponent size={250} />
          )}
        </View>

        <Text style={styles.detailName}>{displayName}</Text>
        <Text style={styles.detailScientific}>{item.scientificName}</Text>
        
        {item.type === 'toxic' && displayToxicity && (
          <View style={styles.toxicityBadge}>
            <Text style={styles.toxicityBadgeText}>☠️ {displayToxicity}</Text>
          </View>
        )}

        {item.type === 'edible' && (
          <View style={styles.edibleBadge}>
            <Text style={styles.edibleBadgeText}>🍽️ {t('mushroom.edible')}</Text>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionTitle}>{t('mushroom.description')}</Text>
            <Text style={styles.descriptionText}>{description}</Text>
            {descriptionCredit && (
              <Text style={styles.descriptionCredit}>{descriptionCredit}</Text>
            )}
          </View>
        )}

        {/* Wikipedia link - dynamic based on language */}
        {(!isEnglish || item.wikiUrl) && (
          <TouchableOpacity
            style={styles.wikiButton}
            onPress={() => {
              const wikiUrl = getWikipediaUrl(item);
              if (wikiUrl) {
                Linking.openURL(wikiUrl);
              }
            }}>
            <Text style={styles.wikiButtonText}>{getWikipediaButtonText()}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={globalStyles.warningBox}>
        <Text style={globalStyles.warningText}>{t('home.warning')}</Text>
        <Text style={globalStyles.warningSubtext}>{t('home.warningText')}</Text>
      </View>
    </ScrollView>
  );
};

  const getTitle = () => {
    if (currentMushroom?.type === 'edible') return t('home.edible');
    if (currentMushroom?.type === 'toxic') return t('home.toxic');
    return t('home.nearbyMushrooms');
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>
          {getTitle()} ({currentIndex + 1}/{mushrooms.length})
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={mushrooms}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      <View style={styles.indicatorContainer}>
        {mushrooms.map((_: any, idx: number) => (
          <View
            key={idx}
            style={[
              styles.indicatorDot,
              idx === currentIndex && styles.indicatorDotActive,
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = {
  headerContainer: {
    paddingTop: 25,
    paddingBottom: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
    textAlign: 'center' as const,
  },
  pageContainer: {
    width: screenWidth,
    padding: 20,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
  },
  imageContainer: {
    alignItems: 'center' as const,
    marginBottom: 20,
    minHeight: 250,
    position: 'relative' as const,
  } as ViewStyle,

  mushroomImage: {
    width: '100%',
    height: 250,
    borderRadius: 15,
  },
  
  nativeMushroomImage: {
    width: '100%',
    height: 250,
    borderRadius: 15,
  } as ImageStyle,

  placeholderImage: {
    width: '100%',
    height: 250,
    borderRadius: 15,
  } as ImageStyle,

  imageLoadingContainer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    zIndex: 1,
  } as ViewStyle,

  imageLoadingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    zIndex: 1,
  },
  imageLoadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 12,
  },
  placeholderImageContainer: {
    width: '100%',
    height: 250,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  } as ViewStyle,
  placeholderEmoji: {
    fontSize: 48,
  },
  placeholderText: {
    marginTop: 8,
    color: '#999',
    fontSize: 12,
  },
  detailName: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
    textAlign: 'center' as const,
  },
  detailScientific: {
    fontSize: 18,
    fontStyle: 'italic' as const,
    color: '#666',
    textAlign: 'center' as const,
    marginTop: 5,
  } as TextStyle,
  toxicityBadge: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 8,
    marginTop: 15,
    alignSelf: 'center' as const,
  },
  toxicityBadgeText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  edibleBadge: {
    backgroundColor: '#e8f5e9',
    padding: 8,
    borderRadius: 8,
    marginTop: 15,
    alignSelf: 'center' as 'center',
  },
  edibleBadgeText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  loader: {
    marginTop: 30,
  },
  descriptionBox: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  descriptionCredit: {
    fontSize: 11,
    color: '#888',
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  wikiButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    alignItems: 'center' as 'center',
  },
  wikiButtonText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  indicatorContainer: {
    flexDirection: 'row' as 'row',
    justifyContent: 'center' as 'center',
    alignItems: 'center' as 'center',
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  indicatorDotActive: {
    backgroundColor: '#4caf50',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
};