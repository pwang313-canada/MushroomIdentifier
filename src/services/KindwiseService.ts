// src/services/KindwiseService.ts
const API_KEY = '6rGapzoX9VI9nOG7erd4oks1CMX2vrAXnIgC4EEbBfQdKo5ERj';
const API_URL = 'https://mushroom.kindwise.com/api/v1/identification';

export interface KindwiseSuggestion {
  name: string;
  probability: number;
  similarity: number;
  image: string;
}

export interface KindwiseResponse {
  suggestions: KindwiseSuggestion[];
  status: string;
  meta: {
    latitude: number;
    longitude: number;
    date: string;
  };
}

export class KindwiseService {
  static async identifyMushroom(
    imageUri: string,
    latitude?: number,
    longitude?: number
  ): Promise<KindwiseResponse | null> {
    try {
      const formData = new FormData();

      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('images', {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);

      formData.append('similar_images', 'true');

      if (latitude && longitude) {
        formData.append('latitude', latitude.toString());
        formData.append('longitude', longitude.toString());
      }

      console.log('Sending request to Kindwise API...');

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
      console.log('Kindwise API raw response:', responseText.substring(0, 500)); // Log first 500 chars

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${responseText}`);
      }

      const data = JSON.parse(responseText);

      // Parse the response based on actual structure
      let suggestions: KindwiseSuggestion[] = [];

      // Check different possible response structures
      if (data.result && data.result.classification && data.result.classification.suggestions) {
        // Structure: { result: { classification: { suggestions: [...] } } }
        suggestions = data.result.classification.suggestions;
      } else if (data.suggestions) {
        // Structure: { suggestions: [...] }
        suggestions = data.suggestions;
      } else if (data.result && data.result.suggestions) {
        // Structure: { result: { suggestions: [...] } }
        suggestions = data.result.suggestions;
      } else if (Array.isArray(data)) {
        // Structure is directly an array
        suggestions = data;
      } else {
        // Try to find any array in the response
        for (const key in data) {
          if (Array.isArray(data[key]) && data[key].length > 0 && data[key][0].name) {
            suggestions = data[key];
            break;
          }
        }
      }

      console.log('Parsed suggestions count:', suggestions.length);

      return {
        suggestions: suggestions,
        status: data.status || 'completed',
        meta: data.meta || {
          latitude: latitude || 0,
          longitude: longitude || 0,
          date: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error identifying mushroom with Kindwise:', error);
      return null;
    }
  }

  static getTopSuggestions(response: KindwiseResponse | null, limit: number = 3): KindwiseSuggestion[] {
    if (!response || !response.suggestions || response.suggestions.length === 0) {
      return [];
    }

    console.log('Getting top suggestions from:', response.suggestions.length, 'items');

    return response.suggestions
      .sort((a, b) => (b.probability || 0) - (a.probability || 0))
      .slice(0, limit);
  }
}