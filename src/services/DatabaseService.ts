import AsyncStorage from '@react-native-async-storage/async-storage';

export interface IdentificationRecord {
  id: string;
  name: string;
  scientificName: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  imageUri?: string;
}

const STORAGE_KEY = 'mushroom_identifications';

class DatabaseService {
  // Save an identification record
  static async saveIdentification(record: Omit<IdentificationRecord, 'id'>): Promise<void> {
    try {
      const existing = await this.getIdentifications();
      const newRecord = {
        ...record,
        id: Date.now().toString(),
      };
      existing.push(newRecord);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to save identification:', error);
    }
  }

  // Get all identifications
  static async getIdentifications(): Promise<IdentificationRecord[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get identifications:', error);
      return [];
    }
  }

  // Get mushrooms near a location (within radius in km)
  static async getMushroomsNearby(lat: number, lon: number, radiusKm: number = 10): Promise<any[]> {
    try {
      const allRecords = await this.getIdentifications();
      
      // Filter records within radius
      const nearby = allRecords.filter(record => {
        const distance = this.calculateDistance(
          lat, lon,
          record.latitude, record.longitude
        );
        return distance <= radiusKm;
      });

      // Group by scientific name and count
      const mushroomMap = new Map();
      nearby.forEach(record => {
        const key = record.scientificName;
        if (mushroomMap.has(key)) {
          const existing = mushroomMap.get(key);
          existing.count++;
          // Update last seen if this record is newer
          if (new Date(record.timestamp) > new Date(existing.lastSeen)) {
            existing.lastSeen = record.timestamp;
          }
        } else {
          mushroomMap.set(key, {
            name: record.name,
            scientificName: record.scientificName,
            count: 1,
            lastSeen: record.timestamp,
          });
        }
      });

      return Array.from(mushroomMap.values()).sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Failed to get nearby mushrooms:', error);
      return [];
    }
  }

  // Calculate distance between two coordinates (Haversine formula)
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static toRad(value: number): number {
    return (value * Math.PI) / 180;
  }
}

export default DatabaseService;