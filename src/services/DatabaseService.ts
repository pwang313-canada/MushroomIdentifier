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
}

export interface PhotoLocation {
  id?: number;
  imageUri: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

class DatabaseServiceClass {
  private db: any = null;

  initializeDatabase(): boolean {
    try {
      // Synchronous openDatabase for older versions
      this.db = SQLite.openDatabase('mushroom_app.db');
      this.createTables();
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      return false;
    }
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS identifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        scientificName TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp TEXT NOT NULL,
        imageUri TEXT NOT NULL
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS photo_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_uri TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);
  }

  createPhotoLocationsTable(): void {
    if (!this.db) {
      this.initializeDatabase();
    }
    if (!this.db) throw new Error('Database not initialized');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS photo_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_uri TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);
  }

  saveIdentification(identification: Identification): number {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.run(
      `INSERT INTO identifications (name, scientificName, latitude, longitude, timestamp, imageUri)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        identification.name,
        identification.scientificName,
        identification.latitude,
        identification.longitude,
        identification.timestamp,
        identification.imageUri,
      ]
    );
    return result.lastInsertRowId;
  }

  getAllIdentifications(): Identification[] {
    if (!this.db) throw new Error('Database not initialized');
    const rows = this.db.getAllSync(
      `SELECT * FROM identifications ORDER BY timestamp DESC`
    );
    return rows;
  }

  savePhotoLocation(imageUri: string, latitude: number, longitude: number): number {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.run(
      `INSERT INTO photo_locations (image_uri, latitude, longitude, timestamp)
       VALUES (?, ?, ?, ?)`,
      [imageUri, latitude, longitude, new Date().toISOString()]
    );
    return result.lastInsertRowId;
  }

  getAllPhotoLocations(): PhotoLocation[] {
    if (!this.db) throw new Error('Database not initialized');
    const rows = this.db.getAllSync(
      `SELECT * FROM photo_locations ORDER BY timestamp DESC`
    );
    return rows;
  }

  executeCustomQuery<T>(sql: string, params: any[] = []): T[] {
    if (!this.db) throw new Error('Database not initialized');
    const rows = this.db.getAllSync(sql, params);
    return rows;
  }

  closeDatabase(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const DatabaseService = new DatabaseServiceClass();
export default DatabaseService;