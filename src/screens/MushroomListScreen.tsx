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
      // For English, prefer nameEn if available, otherwise use scientific name
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
      <View style={globalStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={globalStyles.backButton}>
          <Text style={globalStyles.backButtonText}>{t('buttons.back')}</Text>
        </TouchableOpacity>
        <Text style={globalStyles.screenTitle}>{getScreenTitle()}</Text>
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