// src/services/KindwiseService.ts
import * as FileSystem from 'expo-file-system';

const API_KEY = '6rGapzoX9VI9nOG7erd4oks1CMX2vrAXnIgC4EEbBfQdKo5ERj';
const API_URL = 'https://mushroom.kindwise.com/api/v1/identification';

export interface KindwiseIdentificationResult {
  suggestions: KindwiseSuggestion[];
  status: string;
  meta: {
    latitude: number;
    longitude: number;
    date: string;
  };
}

export interface KindwiseSuggestion {
  name: string;
  probability: number;
  similarity: number;
  image: string;
  details: {
    common_names?: string[];
    edibility?: string;
    url?: string;
    scientific_name?: string;
  };
}

export class KindwiseService {
  static async identifyMushroom(
    imageUri: string,
    latitude?: number,
    longitude?: number
  ): Promise<KindwiseIdentificationResult | null> {
    try {
      // Create form data
      const formData = new FormData();

      // Get file info
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      // Append image
      formData.append('images', {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);

      // Append parameters - ONLY similar_images is supported according to the error
      formData.append('similar_images', 'true');

      // Add location if provided
      if (latitude && longitude) {
        formData.append('latitude', latitude.toString());
        formData.append('longitude', longitude.toString());
      }

      console.log('Sending request to Kindwise API...');

      // Make API request
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Api-Key': API_KEY,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const responseText = await response.text();
      console.log('Kindwise API response status:', response.status);
      console.log('Kindwise API response:', responseText);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log('Kindwise identification success:', data);

      return data;
    } catch (error) {
      console.error('Error identifying mushroom with Kindwise:', error);
      return null;
    }
  }

  static formatSuggestion(suggestion: KindwiseSuggestion): {
    name: string;
    scientificName: string;
    commonName: string;
    confidence: number;
    similarity: number;
    edibility: string;
    wikiUrl: string;
  } {
    return {
      name: suggestion.name,
      scientificName: suggestion.details?.scientific_name || suggestion.name,
      commonName: suggestion.details?.common_names?.[0] || suggestion.name,
      confidence: Math.round((suggestion.probability || 0) * 100),
      similarity: Math.round((suggestion.similarity || 0) * 100),
      edibility: suggestion.details?.edibility || 'unknown',
      wikiUrl: suggestion.details?.url || '',
    };
  }
}