import React from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { edibleMushrooms, toxicMushrooms } from '../data/mushrooms';

interface MushroomListScreenProps {
  route: any;
  navigation: any;
}

export function MushroomListScreen({ route, navigation }: MushroomListScreenProps) {
  const { type } = route.params;
  const mushrooms = type === 'edible' ? edibleMushrooms : toxicMushrooms;
  const title = type === 'edible' ? '可食用蘑菇' : '有毒蘑菇';

  const handleMushroomPress = (index: number) => {
    navigation.navigate('MushroomDetail', {
      mushrooms: mushrooms,
      initialIndex: index,
      type: type,
    });
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={globalStyles.backButton}>
          <Text style={globalStyles.backButtonText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={globalStyles.screenTitle}>{title}</Text>
      </View>

      <FlatList
        data={mushrooms}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={globalStyles.mushroomCard}
            onPress={() => handleMushroomPress(index)}>
            <View style={globalStyles.cardContent}>
              <Text style={globalStyles.mushroomName}>{item.name}</Text>
              <Text style={globalStyles.mushroomScientific}>{item.scientificName}</Text>
              {item.toxicity && <Text style={globalStyles.toxicityLabel}>☠️ {item.toxicity}</Text>}
              <Text style={globalStyles.descriptionPreview} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
            <Text style={globalStyles.arrowIcon}>→</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 20 }}
      />
    </SafeAreaView>
  );
}