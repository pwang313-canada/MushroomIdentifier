// src/screens/MushroomListScreen.tsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { globalStyles } from '../styles/globalStyles';
import { useLanguage } from '../i18n/LanguageContext';
import { Mushroom } from '../types';

interface MushroomListScreenProps {
  route: any;
  navigation: any;
}

export function MushroomListScreen({ route, navigation }: MushroomListScreenProps) {
  const { t } = useTranslation();
  const { isEnglish } = useLanguage();
  const { mushrooms, type, title: passedTitle } = route.params;

  const handleMushroomPress = (index: number) => {
    navigation.navigate('MushroomDetail', {
      mushrooms: mushrooms,
      initialIndex: index,
      type: type,
    });
  };

  const getTypeIcon = (mushroomType: string) => {
    if (mushroomType === 'edible') return '🍽️';
    if (mushroomType === 'toxic') return '☠️';
    return '🍄';
  };

  // Get display name based on language
  const getDisplayName = (mushroom: Mushroom) => {
    if (isEnglish) {
      return mushroom.nameEn || mushroom.scientificName;
    }
    return mushroom.name;
  };

  // ========== 修改后的 getDisplayToxicity 函数 ==========
  // Get display toxicity based on language (与 DetailScreen 保持一致)
  const getDisplayToxicity = (mushroom: Mushroom) => {
    // 只处理有毒蘑菇
    if (mushroom.type !== 'toxic') return null;
    
    // 英文模式
    if (isEnglish) {
      // 优先使用 toxicityEn
      if (mushroom.toxicityEn && mushroom.toxicityEn.trim().length > 0) {
        return mushroom.toxicityEn;
      }
      // 如果 toxicityEn 不存在，尝试映射 toxicity 到英文
      if (mushroom.toxicity) {
        const toxicityMap: { [key: string]: string } = {
          '致命剧毒': 'Deadly Poisonous',
          '致命': 'Deadly',
          '剧毒': 'Highly Toxic',
          '有毒': 'Poisonous',
          '致幻有毒': 'Hallucinogenic',
        };
        return toxicityMap[mushroom.toxicity] || 'Toxic';
      }
      return 'Toxic';
    }
    
    // 中文模式：使用 toxicity
    if (mushroom.toxicity && mushroom.toxicity.trim().length > 0) {
      return mushroom.toxicity;
    }
    
    // 如果 toxicity 不存在，尝试映射 toxicityEn 到中文
    if (mushroom.toxicityEn) {
      const toxicityMap: { [key: string]: string } = {
        'Deadly': '致命',
        'Deadly Poisonous': '致命剧毒',
        'Highly Toxic': '剧毒',
        'Poisonous': '有毒',
        'Hallucinogenic': '致幻有毒',
      };
      return toxicityMap[mushroom.toxicityEn] || '有毒';
    }
    
    return '有毒';
  };

  // Get display description based on language
  const getDisplayDescription = (mushroom: Mushroom) => {
    if (isEnglish) {
      return `Scientific name: ${mushroom.scientificName}`;
    }
    return mushroom.description;
  };

  // Generate title dynamically based on type and current language
  const getScreenTitle = () => {
    if (passedTitle) return passedTitle;
    if (type === 'edible') return t('home.edible');
    if (type === 'toxic') return t('home.toxic');
    if (type === 'nearby') return t('home.nearbyMushrooms');
    return t('home.nearbyMushrooms');
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{getScreenTitle()}</Text>
      </View>

      <FlatList
        data={mushrooms}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={globalStyles.mushroomCard}
            onPress={() => handleMushroomPress(index)}>
            <View style={globalStyles.cardContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginRight: 8 }}>{getTypeIcon(item.type)}</Text>
                <Text style={globalStyles.mushroomName}>{getDisplayName(item)}</Text>
              </View>
              <Text style={globalStyles.mushroomScientific}>{item.scientificName}</Text>
              {getDisplayToxicity(item) && (
                <Text style={globalStyles.toxicityLabel}>☠️ {getDisplayToxicity(item)}</Text>
              )}
              {item.observationsCount !== undefined && item.observationsCount > 0 && (
                <Text style={styles.observationsCount}>
                  📍 {t('nearby.foundCount', { count: item.observationsCount })}
                </Text>
              )}
              <Text style={globalStyles.descriptionPreview} numberOfLines={2}>
                {getDisplayDescription(item)}
              </Text>
            </View>
            <Text style={globalStyles.arrowIcon}>→</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('status.noData')}</Text>
            <Text style={styles.emptySubtext}>{t('status.error')}</Text>
          </View>
        }
      />
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
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
    textAlign: 'center' as const,
  },
  observationsCount: {
    fontSize: 11,
    color: '#4caf50',
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
};