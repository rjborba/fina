import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'

const INDEXED_DB_NAME = "fina";

export const indexedDBPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(INDEXED_DB_NAME, 1);
  
          request.onerror = () => reject(new Error('IndexedDB error'));
  
          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = db.transaction('myStore', 'readonly');
            const objectStore = transaction.objectStore('myStore');
            const getRequest = objectStore.get(key);
  
            getRequest.onsuccess = (event) => {
              const result = (event.target as IDBRequest).result;
              resolve(result);
            };
  
            getRequest.onerror = () => reject(new Error('IndexedDB error'));
          };
  
          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            db.createObjectStore('myStore');
          };
        });
      },
      setItem: async (key, value) => {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(INDEXED_DB_NAME, 1);
  
          request.onerror = () => reject(new Error('IndexedDB error'));
  
          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = db.transaction('myStore', 'readwrite');
            const objectStore = transaction.objectStore('myStore');
            const putRequest = objectStore.put(value, key);
  
            putRequest.onsuccess = () => resolve(void 0);
            putRequest.onerror = () => reject(new Error('IndexedDB error'));
          };
  
          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            db.createObjectStore('myStore');
          };
        });
      },
      removeItem: async (key) => {
           return new Promise((resolve, reject) => {
            const request = indexedDB.open(INDEXED_DB_NAME, 1);
        
            request.onerror = () => reject(new Error('IndexedDB error'));
        
            request.onsuccess = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              const transaction = db.transaction('myStore', 'readwrite');
              const objectStore = transaction.objectStore('myStore');
              const deleteRequest = objectStore.delete(key);
        
              deleteRequest.onsuccess = () => resolve();
              deleteRequest.onerror = () => reject(new Error('IndexedDB error'));
            };
        
            request.onupgradeneeded = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              db.createObjectStore('myStore');
            };
          });
      },
    },
    serialize: JSON.stringify,
    deserialize: JSON.parse,
});