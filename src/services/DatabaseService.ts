// src/services/DatabaseService.ts
import * as SQLite from 'expo-sqlite';

export interface Identification {
  id?: number;
  name: string;
  scientificName: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  imageUri: string;
  notes?: string;
}

export interface PhotoLocation {
  id?: number;
  imageUri: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

class DatabaseServiceClass {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  async initializeDatabase(): Promise<void> {
    if (this.db && this.isInitialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync('mushroom_app.db');
      console.log('✅ Database opened');

      await this.createTables();
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Database init error:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS identifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        scientificName TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp TEXT NOT NULL,
        imageUri TEXT NOT NULL,
        notes TEXT
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS photo_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_uri TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp TEXT NOT NULL
      );
    `);

    console.log('✅ Tables ready');
  }

  private async ensureReady(): Promise<void> {
    if (!this.db || !this.isInitialized) {
      await this.initializeDatabase();
    }
  }

  async savePhotoLocation(
    imageUri: string,
    latitude: number,
    longitude: number
  ): Promise<number> {
    await this.ensureReady();
    if (!this.db) throw new Error('Database not ready');

    const result = await this.db.runAsync(
      `INSERT INTO photo_locations (image_uri, latitude, longitude, timestamp) 
       VALUES (?, ?, ?, ?)`,
      [imageUri, latitude, longitude, new Date().toISOString()]
    );

    return result.lastInsertRowId;
  }

  async saveIdentification(identification: Identification): Promise<number> {
    await this.ensureReady();
    if (!this.db) throw new Error('Database not ready');

    const result = await this.db.runAsync(
      `INSERT INTO identifications 
        (name, scientificName, latitude, longitude, timestamp, imageUri, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        identification.name,
        identification.scientificName,
        identification.latitude,
        identification.longitude,
        identification.timestamp,
        identification.imageUri,
        identification.notes || null,
      ]
    );

    return result.lastInsertRowId;
  }

  async getAllIdentifications(): Promise<Identification[]> {
    await this.ensureReady();
    if (!this.db) return [];

    return await this.db.getAllAsync<Identification>(
      `SELECT * FROM identifications ORDER BY timestamp DESC`
    );
  }

  async getAllPhotoLocations(): Promise<PhotoLocation[]> {
    await this.ensureReady();
    if (!this.db) return [];

    return await this.db.getAllAsync<PhotoLocation>(
      `SELECT * FROM photo_locations ORDER BY timestamp DESC`
    );
  }

  // Keep for compatibility with CameraScreen
  async createPhotoLocationsTable(): Promise<void> {
    await this.ensureReady();
  }
}

export const DatabaseService = new DatabaseServiceClass();
export default DatabaseService;