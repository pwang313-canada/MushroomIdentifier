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
  Image as RNImage,
  Image,
  Platform,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import FastImage, { ImageStyle as FastImageStyle } from 'react-native-fast-image';
import { globalStyles } from '../styles/globalStyles';
import { MushroomService } from '../services/MushroomService';
import { Mushroom } from '../types';

const { width: screenWidth } = Dimensions.get('window');

// 使用本地占位图（如果没有就显示 emoji）
const PlaceholderImage = ({ size = 250 }: { size?: number }) => (
  <View style={[styles.placeholderImageContainer, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={styles.placeholderEmoji}>🍄</Text>
    <Text style={styles.placeholderText}>图片加载中</Text>
  </View>
);

export function MushroomDetailScreen({ route, navigation }: any) {
  const { mushrooms, initialIndex, type } = route.params;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [wikiDescriptions, setWikiDescriptions] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [imageLoaded, setImageLoaded] = useState<{ [key: string]: boolean }>({});
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string | null }>({});

  const currentMushroom = mushrooms[currentIndex];

  useEffect(() => {
    loadMushroomData(currentMushroom);
    // 预加载前后蘑菇的图片
    preloadAdjacentImages();
  }, [currentIndex]);

  const loadMushroomData = async (mushroom: Mushroom) => {
    // 加载描述
    if (!wikiDescriptions[mushroom.id]) {
      setLoading(prev => ({ ...prev, [mushroom.id]: true }));
      const description = await MushroomService.fetchWikiDescription(mushroom.scientificName);
      setWikiDescriptions(prev => ({ ...prev, [mushroom.id]: description }));
      setLoading(prev => ({ ...prev, [mushroom.id]: false }));
    }
    
    // 加载图片（如果没有）
    if (!imageUrls[mushroom.id] && !mushroom.imageUrl) {
      const imageUrl = await MushroomService.fetchMushroomImage(mushroom.scientificName);
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

  const renderItem = ({ item }: { item: Mushroom }) => {
    const isLoading = loading[item.id];
    const description = wikiDescriptions[item.id] || item.description;
    const imageUrl = imageUrls[item.id] || item.imageUrl;
    const isImageLoaded = imageLoaded[item.id];

    return (
      <ScrollView 
        style={styles.pageContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View style={styles.detailCard}>
          {/* 图片区域 - 优化加载 */}
          <View style={styles.imageContainer}>
            {!isImageLoaded && (
              <View style={styles.imageLoadingContainer}>
                <ActivityIndicator size="large" color="#4caf50" />
                <Text style={styles.imageLoadingText}>加载图片中...</Text>
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
                  setImageLoaded(prev => ({ ...prev, [item.id]: true })); // 显示占位符
                }}
                resizeMode="cover"
              />
            ) : (

              <PlaceholderImage size={250} />
            )}
            
            {isImageLoaded && !imageUrl && (
              <PlaceholderImage size={250} />
            )}
          </View>

          <Text style={styles.detailName}>{item.name}</Text>
          <Text style={styles.detailScientific}>{item.scientificName}</Text>
          
          {item.type === 'toxic' && item.toxicity && (
            <View style={styles.toxicityBadge}>
              <Text style={styles.toxicityBadgeText}>☠️ {item.toxicity}</Text>
            </View>
          )}

          {item.type === 'edible' && (
            <View style={styles.edibleBadge}>
              <Text style={styles.edibleBadgeText}>🍽️ 可食用</Text>
            </View>
          )}

          {isLoading ? (
            <ActivityIndicator size="large" style={styles.loader} />
          ) : (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionTitle}>📖 识别特征</Text>
              <Text style={styles.descriptionText}>{description}</Text>
            </View>
          )}

          {item.wikiUrl && (
            <TouchableOpacity
              style={styles.wikiButton}
              onPress={() => Linking.openURL(item.wikiUrl!)}>
              <Text style={styles.wikiButtonText}>🔗 在维基百科查看详情</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={globalStyles.warningBox}>
          <Text style={globalStyles.warningText}>⚠️ 重要提示</Text>
          <Text style={globalStyles.warningSubtext}>
            以上信息仅供参考。识别蘑菇需要专业知识，请勿仅凭图片和描述判断。如有疑问，请咨询专家。
          </Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={globalStyles.backButton}>
          <Text style={globalStyles.backButtonText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={globalStyles.screenTitle}>
          {type === 'edible' ? '可食用蘑菇' : '有毒蘑菇'} 
          ({currentIndex + 1}/{mushrooms.length})
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
  }  as ViewStyle,

  mushroomImage: {
    width: '100%',
    height: 250,
    borderRadius: 15,
  } as FastImageStyle,
  
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