import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from './src/screens/HomeScreen';
import { MushroomListScreen } from './src/screens/MushroomListScreen';
import { MushroomDetailScreen } from './src/screens/MushroomDetailScreen';
import { CameraScreen } from './src/screens/CameraScreen';
import { SearchScreen } from './src/screens/SearchScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="MushroomList" component={MushroomListScreen} />
        <Stack.Screen name="MushroomDetail" component={MushroomDetailScreen} />
        <Stack.Screen name="Camera" component={CameraScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}