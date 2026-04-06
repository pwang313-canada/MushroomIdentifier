// src/screens/MushroomListScreen.tsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { Mushroom } from '../types';

interface MushroomListScreenProps {
  route: any;
  navigation: any;
}

export function MushroomListScreen({ route, navigation }: MushroomListScreenProps) {
  const { mushrooms, type, title } = route.params;

  const handleMushroomPress = (index: number) => {
    // 传递完整的蘑菇列表和当前索引，支持左右滑动
    navigation.navigate('MushroomDetail', {
      mushrooms: mushrooms,
      initialIndex: index,
      type: type,
      title: title,
    });
  };

  const getTypeIcon = (mushroomType: string) => {
    if (mushroomType === 'edible') return '🍽️';
    if (mushroomType === 'toxic') return '☠️';
    return '🍄';
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={globalStyles.backButton}>
          <Text style={globalStyles.backButtonText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={globalStyles.screenTitle}>{title || (type === 'edible' ? '可食用蘑菇' : '有毒蘑菇')}</Text>
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
                <Text style={globalStyles.mushroomName}>{item.name}</Text>
              </View>
              <Text style={globalStyles.mushroomScientific}>{item.scientificName}</Text>
              {item.toxicity && <Text style={globalStyles.toxicityLabel}>☠️ {item.toxicity}</Text>}
              {item.observationsCount !== undefined && item.observationsCount > 0 && (
                <Text style={styles.observationsCount}>📍 附近出现 {item.observationsCount} 次</Text>
              )}
              <Text style={globalStyles.descriptionPreview} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
            <Text style={globalStyles.arrowIcon}>→</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无蘑菇数据</Text>
            <Text style={styles.emptySubtext}>请尝试刷新或检查网络连接</Text>
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