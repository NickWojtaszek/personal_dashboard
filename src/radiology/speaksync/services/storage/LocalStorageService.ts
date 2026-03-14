/**
 * Local Storage Service
 *
 * Development-only storage using browser localStorage.
 * NO ENCRYPTION - Data is stored in plain text.
 *
 * ⚠️ WARNING: This is for DEVELOPMENT ONLY.
 * For production with PII/PHI data, use EncryptedStorageService.
 *
 * COMPLIANCE NOTES:
 * - Not HIPAA compliant (no encryption at rest)
 * - Not GDPR compliant for sensitive data
 * - Data persists in browser (can be extracted)
 * - Anyone with access to the device can read data
 */

import { StorageService, StorageError, StorageErrorCodes } from './StorageService';

export class LocalStorageService implements StorageService {
  private prefix: string;

  constructor(prefix: string = 'speaksync_') {
    this.prefix = prefix;
  }

  /**
   * Generate full storage key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Store data (unencrypted)
   */
  async setItem<T>(key: string, data: T): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.getFullKey(key), serialized);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new StorageError(
          'Storage quota exceeded',
          StorageErrorCodes.QUOTA_EXCEEDED,
          error
        );
      }
      throw new StorageError(
        'Failed to store data',
        StorageErrorCodes.INVALID_DATA,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Retrieve data (unencrypted)
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const serialized = localStorage.getItem(this.getFullKey(key));
      if (serialized === null) {
        return null;
      }
      return JSON.parse(serialized) as T;
    } catch (error) {
      console.error('Failed to parse stored data:', error);
      throw new StorageError(
        'Failed to retrieve data',
        StorageErrorCodes.INVALID_DATA,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Remove data
   */
  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(this.getFullKey(key));
  }

  /**
   * Clear all data with this prefix
   */
  async clear(): Promise<void> {
    const keys = await this.getAllKeys();
    keys.forEach(key => {
      localStorage.removeItem(this.getFullKey(key));
    });
  }

  /**
   * Get all keys with this prefix
   */
  async getAllKeys(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }

  /**
   * NOT encrypted
   */
  isEncrypted(): boolean {
    return false;
  }

  /**
   * Storage type identifier
   */
  getStorageType(): string {
    return 'localStorage (unencrypted)';
  }
}
