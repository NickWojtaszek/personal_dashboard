/**
 * Encrypted Storage Service (TEMPLATE/STUB)
 *
 * This is a template for implementing encrypted data storage.
 * Use this for production systems handling PII/PHI data.
 *
 * IMPLEMENTATION OPTIONS:
 *
 * Option 1: Client-Side Encryption (Web Crypto API)
 * - Pros: No backend needed, works offline
 * - Cons: Key management challenges, less secure
 * - Use Case: Development, non-critical data
 *
 * Option 2: Backend Encryption (Recommended for Production)
 * - Pros: Secure key management, compliance-ready, audit trails
 * - Cons: Requires backend, network dependency
 * - Use Case: Production with PII/PHI, HIPAA/GDPR compliance
 *
 * COMPLIANCE REQUIREMENTS:
 * ✅ HIPAA: Encryption at rest + in transit
 * ✅ GDPR: Data encryption, access controls
 * ✅ SOC 2: Encryption, audit logs
 */

import {
  StorageService,
  StorageError,
  StorageErrorCodes,
  PIICategory,
  StorageMetadata,
} from './StorageService';

// ===== CONFIGURATION =====
const ENCRYPTION_CONFIG = {
  ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,
  IV_LENGTH: 12,
  BACKEND_URL: process.env.VITE_API_URL || 'http://localhost:3001/api',
};

/**
 * Option 1: Client-Side Encryption Implementation
 *
 * Uses Web Crypto API for encryption.
 * Key is derived from user password or stored encrypted.
 */
export class ClientSideEncryptedStorage implements StorageService {
  private encryptionKey: CryptoKey | null = null;
  private prefix: string;

  constructor(prefix: string = 'speaksync_encrypted_') {
    this.prefix = prefix;
  }

  /**
   * Initialize encryption key
   * IMPORTANT: Call this during app initialization
   */
  async initialize(password: string): Promise<void> {
    try {
      // Derive key from password using PBKDF2
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      const salt = encoder.encode('speaksync-salt'); // TODO: Use unique salt per user

      const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordData,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        { name: ENCRYPTION_CONFIG.ALGORITHM, length: ENCRYPTION_CONFIG.KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw new StorageError(
        'Failed to initialize encryption',
        StorageErrorCodes.ENCRYPTION_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Encrypt data
   */
  private async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new StorageError(
        'Encryption key not initialized',
        StorageErrorCodes.ENCRYPTION_FAILED
      );
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.IV_LENGTH));

      // Encrypt
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: ENCRYPTION_CONFIG.ALGORITHM,
          iv: iv,
        },
        this.encryptionKey,
        dataBuffer
      );

      // Combine IV + encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      throw new StorageError(
        'Encryption failed',
        StorageErrorCodes.ENCRYPTION_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Decrypt data
   */
  private async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new StorageError(
        'Encryption key not initialized',
        StorageErrorCodes.DECRYPTION_FAILED
      );
    }

    try {
      // Decode from base64
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

      // Extract IV and encrypted data
      const iv = combined.slice(0, ENCRYPTION_CONFIG.IV_LENGTH);
      const encryptedBuffer = combined.slice(ENCRYPTION_CONFIG.IV_LENGTH);

      // Decrypt
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: ENCRYPTION_CONFIG.ALGORITHM,
          iv: iv,
        },
        this.encryptionKey,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      throw new StorageError(
        'Decryption failed',
        StorageErrorCodes.DECRYPTION_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  async setItem<T>(key: string, data: T): Promise<void> {
    const serialized = JSON.stringify(data);
    const encrypted = await this.encrypt(serialized);
    localStorage.setItem(`${this.prefix}${key}`, encrypted);
  }

  async getItem<T>(key: string): Promise<T | null> {
    const encrypted = localStorage.getItem(`${this.prefix}${key}`);
    if (!encrypted) return null;

    const decrypted = await this.decrypt(encrypted);
    return JSON.parse(decrypted) as T;
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(`${this.prefix}${key}`);
  }

  async clear(): Promise<void> {
    const keys = await this.getAllKeys();
    keys.forEach(key => localStorage.removeItem(`${this.prefix}${key}`));
  }

  async getAllKeys(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }

  isEncrypted(): boolean {
    return true;
  }

  getStorageType(): string {
    return 'Client-side encrypted (Web Crypto API)';
  }
}

/**
 * Option 2: Backend-Based Encrypted Storage (RECOMMENDED)
 *
 * All data is stored on backend with encryption at rest.
 * Most secure and compliance-ready option.
 */
export class BackendEncryptedStorage implements StorageService {
  private authToken: string | null = null;

  /**
   * Set authentication token for API requests
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(`${ENCRYPTION_CONFIG.BACKEND_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      throw new StorageError(
        'Network request failed',
        StorageErrorCodes.NETWORK_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  async setItem<T>(key: string, data: T): Promise<void> {
    await this.apiRequest('/storage/set', {
      method: 'POST',
      body: JSON.stringify({ key, data }),
    });
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const response = await this.apiRequest<{ data: T | null }>(
        `/storage/get?key=${encodeURIComponent(key)}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof StorageError && error.code === StorageErrorCodes.NETWORK_ERROR) {
        // Key not found returns null instead of error
        return null;
      }
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    await this.apiRequest('/storage/delete', {
      method: 'DELETE',
      body: JSON.stringify({ key }),
    });
  }

  async clear(): Promise<void> {
    await this.apiRequest('/storage/clear', {
      method: 'POST',
    });
  }

  async getAllKeys(): Promise<string[]> {
    const response = await this.apiRequest<{ keys: string[] }>('/storage/keys');
    return response.keys;
  }

  isEncrypted(): boolean {
    return true;
  }

  getStorageType(): string {
    return 'Backend encrypted storage';
  }
}

// ===== REQUIRED BACKEND ENDPOINTS =====
/**
 * Your backend must implement these endpoints:
 *
 * POST /api/storage/set
 *   Body: { key: string, data: any }
 *   Response: { success: boolean }
 *   Action: Encrypt and store data in database
 *
 * GET /api/storage/get?key={key}
 *   Response: { data: any }
 *   Action: Retrieve and decrypt data from database
 *
 * DELETE /api/storage/delete
 *   Body: { key: string }
 *   Response: { success: boolean }
 *   Action: Delete data from database
 *
 * POST /api/storage/clear
 *   Response: { success: boolean }
 *   Action: Delete all user's data
 *
 * GET /api/storage/keys
 *   Response: { keys: string[] }
 *   Action: Return all storage keys for current user
 *
 * BACKEND ENCRYPTION IMPLEMENTATION:
 * - Use AES-256-GCM for encryption
 * - Store keys in secure vault (AWS KMS, Azure Key Vault, HashiCorp Vault)
 * - Separate encryption keys per user/tenant
 * - Implement key rotation
 * - Log all access for audit trail
 * - Regular backups with encrypted at rest
 */
