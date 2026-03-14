/**
 * IndexedDB-backed blob store for large binary data (base64 PDF documents).
 *
 * Keeps localStorage lean by storing only metadata there, while blobs
 * live in IndexedDB which has 50 MB+ capacity.
 *
 * API is intentionally simple (get/put/delete by key) so the backend
 * can later be swapped to Supabase Storage without changing callers.
 */

const DB_NAME = 'dashboard-blobs';
const DB_VERSION = 1;
const STORE_NAME = 'blobs';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/** Store a blob by key. */
export async function putBlob(key: string, data: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(data, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Retrieve a blob by key. Returns undefined if not found. */
export async function getBlob(key: string): Promise<string | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result as string | undefined);
        req.onerror = () => reject(req.error);
    });
}

/** Delete a blob by key. */
export async function deleteBlob(key: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Get all keys currently stored. */
export async function getAllBlobKeys(): Promise<string[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAllKeys();
        req.onsuccess = () => resolve(req.result as string[]);
        req.onerror = () => reject(req.error);
    });
}

/** Store multiple blobs at once. */
export async function putBlobs(entries: { key: string; data: string }[]): Promise<void> {
    if (entries.length === 0) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const { key, data } of entries) {
            store.put(data, key);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Retrieve multiple blobs at once. Returns a Map of key → data. */
export async function getBlobs(keys: string[]): Promise<Map<string, string>> {
    if (keys.length === 0) return new Map();
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const results = new Map<string, string>();
        let pending = keys.length;

        for (const key of keys) {
            const req = store.get(key);
            req.onsuccess = () => {
                if (req.result) results.set(key, req.result as string);
                if (--pending === 0) resolve(results);
            };
            req.onerror = () => {
                if (--pending === 0) resolve(results);
            };
        }

        tx.onerror = () => reject(tx.error);
    });
}
