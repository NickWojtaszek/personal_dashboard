/**
 * Storage Service Interface
 *
 * This interface defines the contract for data storage services.
 * Implementations can be local (localStorage) or encrypted (backend/crypto).
 *
 * IMPORTANT: This is for storing PII (Personally Identifiable Information)
 * and sensitive medical data. Production systems MUST use encryption.
 */

export interface StorageService {
  /**
   * Store data with a key
   * @param key - Storage key
   * @param data - Data to store (will be serialized)
   * @returns Promise that resolves when stored
   */
  setItem<T>(key: string, data: T): Promise<void>;

  /**
   * Retrieve data by key
   * @param key - Storage key
   * @returns Promise that resolves with data or null if not found
   */
  getItem<T>(key: string): Promise<T | null>;

  /**
   * Remove data by key
   * @param key - Storage key
   * @returns Promise that resolves when removed
   */
  removeItem(key: string): Promise<void>;

  /**
   * Clear all stored data
   * @returns Promise that resolves when cleared
   */
  clear(): Promise<void>;

  /**
   * Get all keys in storage
   * @returns Promise that resolves with array of keys
   */
  getAllKeys(): Promise<string[]>;

  /**
   * Check if storage is encrypted
   * @returns true if data is encrypted at rest
   */
  isEncrypted(): boolean;

  /**
   * Get storage type identifier
   * @returns Storage type name
   */
  getStorageType(): string;
}

/**
 * Storage error class
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Storage error codes
 */
export const StorageErrorCodes = {
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_DATA: 'INVALID_DATA',
} as const;

/**
 * PII Data Categories
 * Used to identify what type of data is being stored
 */
export enum PIICategory {
  PATIENT_INFO = 'patient_info',      // Names, addresses, contact info
  MEDICAL_RECORDS = 'medical_records', // Medical history, diagnoses
  FINANCIAL = 'financial',             // Payment info, insurance
  AUTHENTICATION = 'authentication',   // Passwords, tokens
  SETTINGS = 'settings',               // User preferences (usually not PII)
}

/**
 * Metadata for stored data
 * Helps track what's stored and when
 */
export interface StorageMetadata {
  category: PIICategory;
  encrypted: boolean;
  createdAt: string;
  lastModified: string;
  expiresAt?: string; // Optional TTL
}
