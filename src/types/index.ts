// src/types/index.ts
export interface Mushroom {
  id: string;
  name: string;
  nameEn?: string;  // English name
  scientificName: string;
  type: 'edible' | 'toxic';
  toxicity?: string;
  toxicityEn?: string;  // English toxicity
  description: string;
  descriptionEn?: string;  // English description
  imageUrl?: string | null;
  wikiUrl?: string;
  observationsCount?: number; // 附近观察次数
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface IdentificationResult {
  taxon: {
    id: number;
    name: string;
    preferred_common_name: string | null;
    rank: string;
    rank_level: number;
  };
  score: number;
}

export interface NearbyMushroom {
  name: string;
  scientificName: string;
  count: number;
  lastSeen: string;
}