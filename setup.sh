#!/bin/bash

npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
npm install expo-image-picker expo-location
npm install @react-native-picker/picker
npm install react-native-gesture-handler

# Create folder structure
mkdir -p src/screens
mkdir -p src/components
mkdir -p src/services
mkdir -p src/types
mkdir -p src/data
mkdir -p src/styles

# Create empty files
touch src/screens/HomeScreen.tsx
touch src/screens/MushroomListScreen.tsx
touch src/screens/MushroomDetailScreen.tsx
touch src/screens/CameraScreen.tsx
touch src/screens/SearchScreen.tsx
touch src/services/MushroomService.ts
touch src/types/index.ts
touch src/data/mushrooms.ts
touch src/styles/globalStyles.ts

echo "Project setup complete! Now add the component code to the respective files."`
