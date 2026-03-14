import type { Document } from '../types';

/**
 * Opens a document in a new browser tab.
 * Uses Blob URLs instead of data: URLs to avoid Chrome's security restrictions
 * that block navigating to data: URLs and prevent inline PDF rendering artifacts.
 */
export function openDocument(doc?: Document): void {
    if (!doc) return;

    if (doc.data && doc.mimeType) {
        // Convert base64 to Blob URL
        const byteChars = atob(doc.data);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: doc.mimeType });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        // Revoke after a delay to allow the new tab to load
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else if (doc.url && doc.url !== '#') {
        window.open(doc.url, '_blank');
    }
}
