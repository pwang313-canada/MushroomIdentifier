import { Mushroom } from '../types';

export const ontarioCommonMushrooms: Mushroom[] = [
  {
    id: 1,
    name: '牛肝菌',
    scientificName: 'Boletus edulis',
    type: 'edible',
    description: '一种常见的可食用蘑菇，味道鲜美',
    imageUrl: 'https://example.com/boletus.jpg',
    season: '夏秋季',
    location: '针叶林和阔叶林'
  },
  {
    id: 2,
    name: '鸡油菌',
    scientificName: 'Cantharellus cibarius',
    type: 'edible',
    description: '金黄色，有杏香味，是优质的食用菌',
    imageUrl: 'https://example.com/chanterelle.jpg',
    season: '夏秋季',
    location: '阔叶林和混交林'
  }
];

export const ontarioToxicMushrooms: Mushroom[] = [
  {
    id: 101,
    name: '毒鹅膏',
    scientificName: 'Amanita phalloides',
    type: 'toxic',
    description: '剧毒蘑菇，误食可致命',
    imageUrl: 'https://example.com/deathcap.jpg',
    season: '夏秋季',
    location: '各种林地'
  },
  {
    id: 102,
    name: '毒蝇伞',
    scientificName: 'Amanita muscaria',
    type: 'toxic',
    description: '有毒蘑菇，特征明显，红色菌盖带白色斑点',
    imageUrl: 'https://example.com/flyagaric.jpg',
    season: '夏秋季',
    location: '针叶林和桦树林'
  }
];
