export interface Mushroom {
  id: string;
  name: string;
  scientificName: string;
  type: 'edible' | 'toxic';
  toxicity?: string;
  description: string;
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