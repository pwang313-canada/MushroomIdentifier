// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const enTranslations = {
  app: {
    name: '🍄 Mushroom Identifier',
  },
  home: {
    camera: 'Camera',
    search: 'Search',
    location: 'Current Location',
    fetchingLocation: 'Fetching location...',
    locationDenied: 'Location access denied',
    unableToGetLocation: 'Unable to get location',
    mushroomsFound: '{{count}} mushrooms found',
    noMushroomsFound: 'No mushrooms found nearby',
    edible: 'Edible',
    toxic: 'Toxic',
    warning: '⚠️ Warning',
    warningText: 'Do not eat any mushroom based solely on AI identification. Always consult an expert.',
    noEdibleFound: 'No edible mushrooms found nearby',
    noToxicFound: 'No toxic mushrooms found nearby',
  },
  mushroom: {
    edible: 'Edible',
    toxic: 'Toxic',
    neutral: 'Unknown',
    commonName: 'Common name',
    takePhoto: 'Take Photo',
    selectPhoto: 'Select from Gallery',
    identifying: 'Identifying...',
    identificationFailed: 'Identification Failed',
    tryClearerPhoto: 'Cannot identify mushroom. Please try a clearer photo.',
    permissionRequired: 'Permission Required',
    cameraPermissionRequired: 'Camera permission is required to take photos',
    galleryPermissionRequired: 'Gallery permission is required to select photos',
    searchPlaceholder: 'Search for mushrooms...',
  },
  buttons: {
    reset: 'Reset',
    search: 'Search',
    back: 'Back',
  },
  status: {
    noData: 'No data found',
    error: 'Please try again',
  },
};

// Chinese translations
const zhTranslations = {
  app: {
    name: '🍄 蘑菇识别器',
  },
  home: {
    camera: '相机识别',
    search: '搜索',
    location: '当前位置',
    fetchingLocation: '获取位置中...',
    locationDenied: '位置权限被拒绝',
    unableToGetLocation: '无法获取位置',
    mushroomsFound: '发现 {{count}} 种蘑菇',
    noMushroomsFound: '附近未发现蘑菇',
    edible: '可食用',
    toxic: '有毒',
    warning: '⚠️ 警告',
    warningText: '请勿仅基于AI识别结果食用任何蘑菇，请务必咨询专家意见。',
    noEdibleFound: '附近未发现可食用蘑菇',
    noToxicFound: '附近未发现有毒蘑菇',
  },
  mushroom: {
    edible: '可食用',
    toxic: '有毒',
    neutral: '未知',
    commonName: '俗称',
    takePhoto: '拍照',
    selectPhoto: '从相册选择',
    identifying: '识别中...',
    identificationFailed: '识别失败',
    tryClearerPhoto: '无法识别图片中的蘑菇，请尝试更清晰的图片',
    permissionRequired: '权限要求',
    cameraPermissionRequired: '需要相机权限才能拍照',
    galleryPermissionRequired: '需要相册权限才能选择图片',
    searchPlaceholder: '搜索蘑菇...',
  },
  buttons: {
    reset: '重置',
    search: '搜索',
    back: '返回',
  },
  status: {
    noData: '未找到数据',
    error: '请重试',
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      zh: {
        translation: zhTranslations,
      },
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;