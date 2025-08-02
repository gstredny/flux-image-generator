import type { GeneratedImage, UserPreferences } from '../types';
import { STORAGE_KEYS, DEFAULT_PARAMETERS } from '../utils/constants';

class StorageService {
  // User Preferences
  getPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.preferences);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }

    return {
      theme: 'system',
      apiEndpoint: import.meta.env.VITE_API_ENDPOINT || 'http://localhost:7860',
      defaultParameters: DEFAULT_PARAMETERS,
      keyboardShortcutsEnabled: true,
    };
  }

  savePreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  // Theme
  getTheme(): 'light' | 'dark' | 'system' {
    return (localStorage.getItem(STORAGE_KEYS.theme) as 'light' | 'dark' | 'system') || 'system';
  }

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }

  // Image History (using IndexedDB for better performance)
  private dbName = 'FluxKreaDB';
  private dbVersion = 1;
  private storeName = 'images';

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveImage(image: GeneratedImage): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise((resolve, reject) => {
        const request = store.put(image);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      // Clean up old images (keep last 100)
      await this.cleanupOldImages(100);
    } catch (error) {
      console.error('Failed to save image:', error);
    }
  }

  async getImages(limit = 50): Promise<GeneratedImage[]> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');

      return new Promise((resolve, reject) => {
        const images: GeneratedImage[] = [];
        const request = index.openCursor(null, 'prev'); // Sort by timestamp descending
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor && images.length < limit) {
            images.push(cursor.value);
            cursor.continue();
          } else {
            resolve(images);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load images:', error);
      return [];
    }
  }

  async deleteImage(id: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }

  async clearHistory(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }

  private async cleanupOldImages(keepCount: number): Promise<void> {
    try {
      const images = await this.getImages(keepCount + 50);
      
      if (images.length > keepCount) {
        const db = await this.openDB();
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const toDelete = images.slice(keepCount);
        
        for (const image of toDelete) {
          store.delete(image.id);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old images:', error);
    }
  }

  // Export/Import functionality
  async exportHistory(): Promise<string> {
    const images = await this.getImages(1000); // Export up to 1000 images
    return JSON.stringify(images, null, 2);
  }

  async importHistory(jsonData: string): Promise<void> {
    try {
      const images = JSON.parse(jsonData) as GeneratedImage[];
      
      for (const image of images) {
        await this.saveImage(image);
      }
    } catch (error) {
      console.error('Failed to import history:', error);
      throw new Error('Invalid import data format');
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();