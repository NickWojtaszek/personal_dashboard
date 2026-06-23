import type { Document } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Shared document helpers — the common storage layer for entity documents.
 *
 * Document blobs are stored inline as base64 on the entity (Document.data) and
 * automatically offloaded to IndexedDB by the blob bridge on save. Opening a
 * document goes through `openDocument` (Blob URL, avoids data:-URL issues).
 */

/** Convert an ArrayBuffer (file contents) to a base64 string. */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/** Read a File into a Document with inline base64 data. */
export async function fileToDocument(file: File, overrides?: Partial<Document>): Promise<Document> {
  const buffer = await file.arrayBuffer();
  return {
    id: uuidv4(),
    name: file.name,
    url: '#',
    data: arrayBufferToBase64(buffer),
    mimeType: file.type || 'application/octet-stream',
    uploadedAt: new Date().toISOString(),
    ...overrides,
  };
}

export { openDocument } from './openDocument';
