// src/indexedDBStorage.ts
import { openDB, deleteDB, IDBPDatabase } from "idb";

const DB_NAME = "fina-indexed-db";
const STORE_NAME = "queries";

async function createDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export const indexedDBStorage = {
  async getItem(key: string): Promise<string | null> {
    const db = await createDB();
    const val = await db.get(STORE_NAME, key);
    return typeof val === "undefined" ? null : val;
  },
  async setItem(key: string, value: string): Promise<void> {
    const db = await createDB();
    await db.put(STORE_NAME, value, key);
  },
  async removeItem(key: string): Promise<void> {
    const db = await createDB();
    await db.delete(STORE_NAME, key);
  },
  // (Optional) if you ever want to clear everything:
  async clearAll(): Promise<void> {
    await deleteDB(DB_NAME);
  },
};
