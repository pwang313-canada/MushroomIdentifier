import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { I18nextProvider } from 'react-i18next';
import i18n from './src/i18n';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { MushroomListScreen } from './src/screens/MushroomListScreen';
import { MushroomDetailScreen } from './src/screens/MushroomDetailScreen';
import { CameraScreen } from './src/screens/CameraScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import '@formatjs/intl-pluralrules/polyfill';
import '@formatjs/intl-pluralrules/locale-data/en'; // 英语
import '@formatjs/intl-pluralrules/locale-data/zh'; // 中文
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="MushroomList" component={MushroomListScreen} />
            <Stack.Screen name="MushroomDetail" component={MushroomDetailScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </LanguageProvider>
    </I18nextProvider>
  );
}