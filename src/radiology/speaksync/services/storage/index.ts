/**
 * Storage Service Configuration
 *
 * This file controls which storage implementation is used.
 * Switch between LocalStorageService (dev) and EncryptedStorageService (production)
 * by changing the single line below.
 *
 * COMPLIANCE WARNING:
 * - LocalStorageService: NOT compliant with HIPAA, GDPR for sensitive data
 * - EncryptedStorageService: Required for production with PII/PHI
 */

import { LocalStorageService } from './LocalStorageService';
// import { ClientSideEncryptedStorage, BackendEncryptedStorage } from './EncryptedStorageService';

// ===== CONFIGURATION =====
// Change this line to switch storage methods:

/**
 * Current: Local development storage (no encryption)
 * For production: Uncomment one of the encrypted options
 */
export const storageService = new LocalStorageService('speaksync_');

// For client-side encryption (Web Crypto API):
// export const storageService = new ClientSideEncryptedStorage('speaksync_encrypted_');
// // IMPORTANT: Must call storageService.initialize(password) during app init

// For backend encryption (RECOMMENDED for production):
// export const storageService = new BackendEncryptedStorage();
// // IMPORTANT: Must call storageService.setAuthToken(token) after login

// ===== EXPORTS =====
export type { StorageService, StorageMetadata } from './StorageService';
export {
  StorageError,
  StorageErrorCodes,
  PIICategory,
} from './StorageService';
export { LocalStorageService } from './LocalStorageService';
export {
  ClientSideEncryptedStorage,
  BackendEncryptedStorage,
} from './EncryptedStorageService';

// ===== MIGRATION GUIDE =====
/**
 * To migrate to encrypted storage:
 *
 * 1. Choose encryption method (client-side or backend)
 *
 * 2. For client-side encryption:
 *    - Uncomment ClientSideEncryptedStorage above
 *    - Add initialization in App.tsx:
 *      ```
 *      useEffect(() => {
 *        storageService.initialize(userPassword).catch(console.error);
 *      }, [userPassword]);
 *      ```
 *
 * 3. For backend encryption (recommended):
 *    - Implement backend endpoints (see EncryptedStorageService.ts)
 *    - Uncomment BackendEncryptedStorage above
 *    - Set auth token after login:
 *      ```
 *      useEffect(() => {
 *        if (authToken) {
 *          storageService.setAuthToken(authToken);
 *        }
 *      }, [authToken]);
 *      ```
 *
 * 4. No code changes needed in components - they all use storageService
 *
 * 5. Data migration:
 *    - Export data from localStorage
 *    - Re-import into encrypted storage
 *    - Or: Build migration script to transfer data
 */
