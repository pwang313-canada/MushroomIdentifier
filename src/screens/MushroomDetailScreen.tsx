// src/screens/MushroomDetailScreen.tsx (优化版)
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
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import FastImage, { ImageStyle as FastImageStyle } from 'react-native-fast-image';

import { globalStyles } from '../styles/globalStyles';
import { MushroomService } from '../services/MushroomService';
import { Mushroom } from '../types';

const { width: screenWidth } = Dimensions.get('window');
const defaultImage = require('../../assets/images/placeholder.jpg');

export function MushroomDetailScreen({ route, navigation }: any) {
  const { mushrooms, initialIndex, type } = route.params;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [wikiDescriptions, setWikiDescriptions] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [loadedImages, setLoadedImages] = useState<{ [key: string]: boolean }>({});

  const currentMushroom = mushrooms[currentIndex];

  useEffect(() => {
    loadWikiDescription(currentMushroom);
  }, [currentIndex]);

  const loadWikiDescription = async (mushroom: Mushroom) => {
    if (wikiDescriptions[mushroom.id]) return;
    
    setLoading(prev => ({ ...prev, [mushroom.id]: true }));
    const description = await MushroomService.fetchWikiDescription(mushroom.scientificName);
    setWikiDescriptions(prev => ({ ...prev, [mushroom.id]: description }));
    setLoading(prev => ({ ...prev, [mushroom.id]: false }));
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
    const isImageLoaded = loadedImages[item.id];

    return (
      <ScrollView style={styles.pageContainer}>
        <View style={styles.detailCard}>
          <View style={styles.imageContainer}>
            {!isImageLoaded && item.imageUrl && (
              <View style={styles.imageLoadingOverlay}>
                <ActivityIndicator size="large" color="#4caf50" />
                <Text style={styles.imageLoadingText}>加载图片中...</Text>
              </View>
            )}
            
            {item.imageUrl ? (
              <FastImage
                style={styles.mushroomImage}
                source={{
                  uri: item.imageUrl,
                  priority: FastImage.priority.high,
                  cache: FastImage.cacheControl.immutable,
                }}
                resizeMode={FastImage.resizeMode.cover}
                onLoad={() => {
                  setLoadedImages(prev => ({ ...prev, [item.id]: true }));
                }}
              />
            ) : (
              <View style={styles.placeholderImageContainer}>
                <RNImage source={defaultImage} style={styles.placeholderImage} />
              </View>
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
          {type === 'edible' ? '可食用蘑菇' : type === 'toxic' ? '有毒蘑菇' : '蘑菇详情'} 
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
        windowSize={3} // 只渲染当前和前后各一页，提高性能
        maxToRenderPerBatch={2}
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
  placeholderImage: {
    width: '100%',
    height: 250,
    borderRadius: 15,
  } as ImageStyle,
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