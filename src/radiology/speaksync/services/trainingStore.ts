/**
 * IndexedDB-backed store for Whisper training pairs.
 *
 * Each pair captures one "utterance" from browser-mode dictation:
 *   - audio blob (what was said)
 *   - raw transcript (what the browser's Web Speech API heard)
 *   - final transcript (what the user kept in the editor after edits)
 *   - classification of the edit (unedited / corrected / rewritten / deleted)
 *
 * Everything is local. Nothing leaves the machine unless the user
 * explicitly clicks Export.
 */

export type Classification = 'unedited' | 'corrected' | 'rewritten' | 'deleted' | 'pending';

export interface TrainingPair {
    id: string;
    timestamp: number;         // epoch ms
    language: string;          // "pl", "en", "de"
    audio: Blob;               // webm/opus or mp4
    audioMimeType: string;
    durationSec: number;       // estimated from chunk timestamps
    rawTranscript: string;     // what browser STT emitted
    finalTranscript: string | null;  // what we found in the editor on last classify pass
    classification: Classification;
    editDistance: number | null;     // normalized Levenshtein 0-1
}

const DB_NAME = 'speaksync-training';
const DB_VERSION = 1;
const STORE = 'pairs';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp');
                store.createIndex('classification', 'classification');
                store.createIndex('language', 'language');
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function putPair(pair: TrainingPair): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(pair);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function updatePair(
    id: string,
    patch: Partial<Pick<TrainingPair, 'finalTranscript' | 'classification' | 'editDistance'>>,
): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
            const existing = getReq.result as TrainingPair | undefined;
            if (!existing) {
                resolve();
                return;
            }
            store.put({ ...existing, ...patch });
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getAllPairs(): Promise<TrainingPair[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => resolve((req.result || []) as TrainingPair[]);
        req.onerror = () => reject(req.error);
    });
}

export async function getPair(id: string): Promise<TrainingPair | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(id);
        req.onsuccess = () => resolve((req.result as TrainingPair | undefined) ?? null);
        req.onerror = () => reject(req.error);
    });
}

export async function deletePair(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function deleteAllPairs(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export interface TrainingStats {
    total: number;
    unedited: number;
    corrected: number;
    rewritten: number;
    deleted: number;
    pending: number;
    totalDurationSec: number;
    totalAudioBytes: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
}

export async function getStats(): Promise<TrainingStats> {
    const pairs = await getAllPairs();
    const stats: TrainingStats = {
        total: pairs.length,
        unedited: 0, corrected: 0, rewritten: 0, deleted: 0, pending: 0,
        totalDurationSec: 0,
        totalAudioBytes: 0,
        oldestTimestamp: null, newestTimestamp: null,
    };
    for (const p of pairs) {
        stats[p.classification] += 1;
        stats.totalDurationSec += p.durationSec || 0;
        stats.totalAudioBytes += p.audio?.size || 0;
        if (stats.oldestTimestamp == null || p.timestamp < stats.oldestTimestamp) stats.oldestTimestamp = p.timestamp;
        if (stats.newestTimestamp == null || p.timestamp > stats.newestTimestamp) stats.newestTimestamp = p.timestamp;
    }
    return stats;
}

/** Normalized Levenshtein distance: 0 = identical, 1 = completely different. */
export function normalizedEditDistance(a: string, b: string): number {
    const aN = (a || '').trim();
    const bN = (b || '').trim();
    if (!aN && !bN) return 0;
    if (!aN || !bN) return 1;
    const maxLen = Math.max(aN.length, bN.length);
    return levenshtein(aN, bN) / maxLen;
}

function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = new Array(b.length + 1);
    let curr = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
        curr[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(
                curr[j - 1] + 1,
                prev[j] + 1,
                prev[j - 1] + cost,
            );
        }
        [prev, curr] = [curr, prev];
    }
    return prev[b.length];
}

/** Classify based on edit distance threshold. */
export function classifyEdit(raw: string, final: string | null | undefined): { classification: Classification; editDistance: number | null } {
    if (final == null) return { classification: 'deleted', editDistance: null };
    const finalTrim = final.trim();
    const rawTrim = (raw || '').trim();
    if (!finalTrim && rawTrim) return { classification: 'deleted', editDistance: 1 };
    if (rawTrim === finalTrim) return { classification: 'unedited', editDistance: 0 };
    const dist = normalizedEditDistance(rawTrim, finalTrim);
    // Threshold: 0.35 normalized Levenshtein splits minor corrections from rewrites reasonably well.
    if (dist < 0.35) return { classification: 'corrected', editDistance: dist };
    return { classification: 'rewritten', editDistance: dist };
}
