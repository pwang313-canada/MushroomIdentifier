import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Linking,
  Image,
  Dimensions,
  FlatList,
  StyleSheet,
} from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { MushroomService } from '../services/MushroomService';
import { Mushroom } from '../types';

const { width: screenWidth } = Dimensions.get('window');
const defaultImage = require('../../assets/images/placeholder.jpg');

interface MushroomDetailScreenProps {
  route: any;
  navigation: any;
}

export function MushroomDetailScreen({ route, navigation }: MushroomDetailScreenProps) {
  const { mushrooms, initialIndex, type } = route.params;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [wikiDescriptions, setWikiDescriptions] = useState<{ [key: string]: string }>({});
  const [mushroomImages, setMushroomImages] = useState<{ [key: string]: string | null }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});

  const currentMushroom = mushrooms[currentIndex];

  useEffect(() => {
    loadMushroomData(currentMushroom);
  }, [currentIndex]);

  const loadMushroomData = async (mushroom: Mushroom) => {
    // Load image if not already loaded
    if (!mushroomImages[mushroom.id] && !loading[mushroom.id]) {
      setLoading(prev => ({ ...prev, [mushroom.id]: true }));
      const { imageUrl, description } = await MushroomService.fetchMushroomDetails(mushroom.scientificName);
      setMushroomImages(prev => ({ ...prev, [mushroom.id]: imageUrl }));
      setWikiDescriptions(prev => ({ ...prev, [mushroom.id]: description || mushroom.description }));
      setLoading(prev => ({ ...prev, [mushroom.id]: false }));
    } else if (!wikiDescriptions[mushroom.id]) {
      // Load description if not loaded
      setLoading(prev => ({ ...prev, [mushroom.id]: true }));
      const description = await MushroomService.fetchWikiDescription(mushroom.scientificName);
      setWikiDescriptions(prev => ({ ...prev, [mushroom.id]: description }));
      setLoading(prev => ({ ...prev, [mushroom.id]: false }));
    }
  };

  const onScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / screenWidth);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  const handleImageError = (mushroomId: string) => {
    setImageErrors(prev => ({ ...prev, [mushroomId]: true }));
  };

  const getImageSource = (item: Mushroom) => {
    if (imageErrors[item.id]) {
      return defaultImage;
    }
    const imageUrl = mushroomImages[item.id];
    if (imageUrl && typeof imageUrl === 'string') {
      return { uri: imageUrl };
    }
    return defaultImage;
  };

  const renderItem = ({ item }: { item: Mushroom }) => {
    const isLoading = loading[item.id];
    const description = wikiDescriptions[item.id] || item.description;
    const imageSource = getImageSource(item);

    return (
      <ScrollView style={styles.pageContainer}>
        <View style={styles.detailCard}>
          <View style={styles.imageContainer}>
            {isLoading && !mushroomImages[item.id] ? (
              <View style={styles.imageLoadingContainer}>
                <ActivityIndicator size="large" color="#4caf50" />
                <Text style={styles.imageLoadingText}>加载图片中...</Text>
              </View>
            ) : (
              <Image
                source={imageSource}
                style={styles.mushroomImage}
                onError={() => handleImageError(item.id)}
                resizeMode="cover"
              />
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

          {isLoading && !description ? (
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
          {type === 'edible' ? '可食用蘑菇' : '有毒蘑菇'} ({currentIndex + 1}/{mushrooms.length})
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


const styles = StyleSheet.create({
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
    alignItems: 'center' as 'center',
    marginBottom: 20,
  },
  mushroomImage: {
    width: '100%',
    height: 250,
    borderRadius: 15,
    resizeMode: 'cover' as 'cover',
  },
  detailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center' as 'center',
  },
  detailScientific: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center' as 'center',
    marginTop: 5,
  },
  toxicityBadge: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 8,
    marginTop: 15,
    alignSelf: 'center' as 'center',
  },
  toxicityBadgeText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '600',
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
    fontWeight: '600',
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
    fontWeight: 'bold',
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
    fontWeight: '600',
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
    imageLoadingContainer: {
    width: '100%',
    height: 250,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center' as 'center',
    alignItems: 'center' as 'center',
  },
  imageLoadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
});
