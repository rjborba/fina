import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const INDEXED_DB_NAME = 'fina';
const CACHE_STORE_NAME = 'cacheStore';

export const indexedDBPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(INDEXED_DB_NAME, 1);

        request.onerror = () => reject(new Error('IndexedDB error'));

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(CACHE_STORE_NAME, 'readonly');
          const objectStore = transaction.objectStore(CACHE_STORE_NAME);
          const getRequest = objectStore.get(key);

          getRequest.onsuccess = (event) => {
            const result = (event.target as IDBRequest).result;
            resolve(result);
          };

          getRequest.onerror = () => reject(new Error('IndexedDB error'));
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          db.createObjectStore(CACHE_STORE_NAME);
        };
      });
    },
    setItem: async (key, value) => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(INDEXED_DB_NAME, 1);

        request.onerror = () => reject(new Error('IndexedDB error'));

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
          const objectStore = transaction.objectStore(CACHE_STORE_NAME);
          const putRequest = objectStore.put(value, key);

          putRequest.onsuccess = () => resolve(void 0);
          putRequest.onerror = () => reject(new Error('IndexedDB error'));
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          db.createObjectStore(CACHE_STORE_NAME);
        };
      });
    },
    removeItem: async (key) => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(INDEXED_DB_NAME, 1);

        request.onerror = () => reject(new Error('IndexedDB error'));

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
          const objectStore = transaction.objectStore(CACHE_STORE_NAME);
          const deleteRequest = objectStore.delete(key);

          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(new Error('IndexedDB error'));
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          db.createObjectStore(CACHE_STORE_NAME);
        };
      });
    },
  },
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});
