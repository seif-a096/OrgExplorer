import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

interface OrgExplorerDB extends DBSchema {
  repos: {
    key: string;
    value: any;
  };
  contributors: {
    key: string;
    value: any;
  };
  activity: {
    key: string;
    value: any;
  };
  metadata: {
    key: string;
    value: {
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<OrgExplorerDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<OrgExplorerDB>('orgExplorerDB', 1, {
      upgrade(db) {
        db.createObjectStore('repos');
        db.createObjectStore('contributors');
        db.createObjectStore('activity');
        db.createObjectStore('metadata');
      },
    });
  }
  return dbPromise;
};

const TTL_MS = 1000 * 60 * 60; // 1 hour

export const cacheService = {
  // Local storage (long-lived state)
  getToken: () => localStorage.getItem('gh_token'),
  setToken: (token: string) => localStorage.setItem('gh_token', token),
  removeToken: () => localStorage.removeItem('gh_token'),

  getLastOrg: () => localStorage.getItem('last_org') || 'AOSSIE-Org',
  setLastOrg: (org: string) => localStorage.setItem('last_org', org),

  // IndexedDB (large datastores)
  async get<StoreName extends 'repos' | 'contributors' | 'activity'>(
    storeName: StoreName,
    key: string
  ): Promise<any | null> {
    const db = await getDB();
    const metadata = await db.get('metadata', `${storeName}_${key}`);
    
    if (!metadata || Date.now() - metadata.timestamp > TTL_MS) {
      return null; // Cache default/miss
    }
    return db.get(storeName, key);
  },

  async set<StoreName extends 'repos' | 'contributors' | 'activity'>(
    storeName: StoreName,
    key: string,
    value: any
  ) {
    const db = await getDB();
    const tx = db.transaction([storeName, 'metadata'], 'readwrite');
    await Promise.all([
      tx.objectStore(storeName).put(value, key),
      tx.objectStore('metadata').put({ timestamp: Date.now() }, `${storeName}_${key}`),
      tx.done,
    ]);
  },
};
