/**
 * Database initialization for SCADA Boards
 * Uses IndexedDB for browser compatibility
 */

class DatabaseManager {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('scada_boards', 1);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Connected to IndexedDB');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Boards table
        if (!db.objectStoreNames.contains('boards')) {
          const boardsStore = db.createObjectStore('boards', { keyPath: 'id' });
          boardsStore.createIndex('name', 'name', { unique: false });
          boardsStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Tabs table
        if (!db.objectStoreNames.contains('tabs')) {
          const tabsStore = db.createObjectStore('tabs', { keyPath: 'id' });
          tabsStore.createIndex('board_id', 'board_id', { unique: false });
          tabsStore.createIndex('machine_code', 'machine_code', { unique: false });
        }

        // Widgets table
        if (!db.objectStoreNames.contains('widgets')) {
          const widgetsStore = db.createObjectStore('widgets', { keyPath: 'id' });
          widgetsStore.createIndex('tab_id', 'tab_id', { unique: false });
          widgetsStore.createIndex('sensor_code', 'sensor_code', { unique: false });
        }

        // Settings table
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Sensor history table
        if (!db.objectStoreNames.contains('sensor_history')) {
          const historyStore = db.createObjectStore('sensor_history', { keyPath: 'id', autoIncrement: true });
          historyStore.createIndex('sensor_code_timestamp', ['sensor_code', 'timestamp'], { unique: false });
          historyStore.createIndex('sensor_code', 'sensor_code', { unique: false });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async getDatabase(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    this.db = await this.dbPromise;
    return this.db;
  }

  // Helper method to perform database operations
  async runTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const dbManager = new DatabaseManager();