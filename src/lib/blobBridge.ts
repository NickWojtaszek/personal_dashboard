/**
 * Bridge between the app's in-memory data (with inline base64 blobs)
 * and the storage layer (localStorage + IndexedDB).
 *
 * On save: walks the data tree, extracts base64 `data` fields from Document
 * objects, stores them in IndexedDB, and replaces them with a reference key.
 *
 * On load: walks the data tree, finds reference keys, fetches blobs from
 * IndexedDB, and rehydrates the `data` fields.
 *
 * A "Document-like" object is any object with { name: string, data: string }
 * where data is a long string (>256 chars, i.e. likely base64).
 */

import { putBlobs, getBlobs } from './blobStore';

const BLOB_REF_PREFIX = '__blob__:';
const LONG_STR_REF_PREFIX = '__longstr__:';
const MIN_BLOB_SIZE = 256; // Only extract data fields longer than this
const MIN_LONG_STR_SIZE = 500; // Strip string fields longer than this to IndexedDB

/** Fields that contain large text content worth offloading.
 *  Note: 'body' was removed — email bodies are typically <10KB of text
 *  and the strip/rehydrate cycle is fragile when array indices shift. */
const LONG_STRING_FIELDS = new Set(['timeline', 'extractedText', 'summary']);

/**
 * Generate a stable key for a blob based on a path prefix and document name.
 */
function blobKey(pathPrefix: string, docName: string, index: number): string {
    return `${pathPrefix}:${docName}:${index}`;
}

/**
 * Check if a value looks like a Document object with inline blob data.
 */
function isDocumentWithBlob(val: unknown): val is { name: string; data: string; [k: string]: unknown } {
    if (!val || typeof val !== 'object') return false;
    const obj = val as Record<string, unknown>;
    return typeof obj.name === 'string' &&
        typeof obj.data === 'string' &&
        obj.data.length > MIN_BLOB_SIZE &&
        !String(obj.data).startsWith(BLOB_REF_PREFIX);
}

/**
 * Check if a value is a Document object with a blob reference (not inline data).
 */
function isDocumentWithRef(val: unknown): val is { name: string; data: string; [k: string]: unknown } {
    if (!val || typeof val !== 'object') return false;
    const obj = val as Record<string, unknown>;
    return typeof obj.data === 'string' && String(obj.data).startsWith(BLOB_REF_PREFIX);
}

/**
 * Walk a data tree, extract blobs, return a stripped copy + list of blobs to store.
 */
function walkAndStrip(
    data: unknown,
    pathPrefix: string,
    blobs: { key: string; data: string }[],
    counter: { n: number },
): unknown {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
        return data.map((item, i) => walkAndStrip(item, `${pathPrefix}[${i}]`, blobs, counter));
    }

    // Check if this object itself is a document with blob data
    if (isDocumentWithBlob(data)) {
        const key = blobKey(pathPrefix, (data as { name: string }).name, counter.n++);
        blobs.push({ key, data: (data as { data: string }).data });
        const copy = { ...data, data: BLOB_REF_PREFIX + key };
        return copy;
    }

    // Recurse into object properties, stripping long string fields to IndexedDB
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        if (LONG_STRING_FIELDS.has(k) && typeof v === 'string' && v.length > MIN_LONG_STR_SIZE && !v.startsWith(LONG_STR_REF_PREFIX)) {
            const key = `${pathPrefix}.${k}:${counter.n++}`;
            blobs.push({ key, data: v });
            result[k] = LONG_STR_REF_PREFIX + key;
        } else {
            result[k] = walkAndStrip(v, `${pathPrefix}.${k}`, blobs, counter);
        }
    }
    return result;
}

/**
 * Walk a data tree, collect all blob reference keys.
 */
function collectRefs(data: unknown, refs: Set<string>): void {
    if (data === null || data === undefined || typeof data !== 'object') return;

    if (Array.isArray(data)) {
        data.forEach(item => collectRefs(item, refs));
        return;
    }

    if (isDocumentWithRef(data)) {
        refs.add(String((data as { data: string }).data).slice(BLOB_REF_PREFIX.length));
    }

    for (const v of Object.values(data as Record<string, unknown>)) {
        if (typeof v === 'string' && v.startsWith(LONG_STR_REF_PREFIX)) {
            refs.add(v.slice(LONG_STR_REF_PREFIX.length));
        } else {
            collectRefs(v, refs);
        }
    }
}

/**
 * Walk a data tree, replace blob references with actual data.
 */
function walkAndRehydrate(data: unknown, blobMap: Map<string, string>): unknown {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
        return data.map(item => walkAndRehydrate(item, blobMap));
    }

    if (isDocumentWithRef(data)) {
        const refKey = String((data as { data: string }).data).slice(BLOB_REF_PREFIX.length);
        const blobData = blobMap.get(refKey);
        if (blobData) {
            return { ...data, data: blobData };
        }
        // Blob not found — clear the ref so it doesn't break anything
        return { ...data, data: undefined };
    }

    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        if (typeof v === 'string' && v.startsWith(LONG_STR_REF_PREFIX)) {
            const refKey = v.slice(LONG_STR_REF_PREFIX.length);
            result[k] = blobMap.get(refKey) ?? '';
        } else {
            result[k] = walkAndRehydrate(v, blobMap);
        }
    }
    return result;
}

/**
 * Strip blobs from a data value before saving to localStorage.
 * Returns the stripped data and stores blobs in IndexedDB.
 */
export async function stripBlobs<T>(storageKey: string, data: T): Promise<T> {
    const blobs: { key: string; data: string }[] = [];
    const stripped = walkAndStrip(data, storageKey, blobs, { n: 0 });
    if (blobs.length > 0) {
        await putBlobs(blobs);
    }
    return stripped as T;
}

/**
 * Rehydrate blobs in a data value after loading from localStorage.
 * Fetches blob data from IndexedDB and injects it back into Document objects.
 */
export async function rehydrateBlobs<T>(data: T): Promise<T> {
    if (!data) return data;
    const refs = new Set<string>();
    collectRefs(data, refs);
    if (refs.size === 0) return data;
    const blobMap = await getBlobs(Array.from(refs));
    return walkAndRehydrate(data, blobMap) as T;
}
