/**
 * Secure Key Management Utility
 * Handles encryption key versioning, rotation, and historical key tracking
 *
 * Features:
 * - Key versioning with timestamps
 * - Historical key storage for decrypting old data
 * - Key rotation scheduling
 * - Secure key derivation
 * - Key expiration and lifecycle management
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Key Manager Class
 * Centralizes all key management operations
 */
export class KeyManager {
  constructor() {
    this.currentKeyVersion = null;
    this.keys = {}; // Store all active keys by version
    this.keyMetadata = {}; // Store metadata about keys
    this.keysDir = path.join(__dirname, '../.keys'); // Secure keys directory
    this.keysFile = path.join(this.keysDir, 'keys.json'); // Encrypted keys storage
  }

  /**
   * Initialize key manager from environment and stored keys
   */
  initialize() {
    try {
      // Create keys directory if it doesn't exist
      if (!fs.existsSync(this.keysDir)) {
        fs.mkdirSync(this.keysDir, { mode: 0o700 }); // Read/write/execute for owner only
      }

      // Load current key from environment
      const currentKey = process.env.ENCRYPTION_KEY;
      if (!currentKey) {
        throw new Error('ENCRYPTION_KEY environment variable not set');
      }

      this.currentKeyVersion = 1;
      this.keys[1] = currentKey;

      // Initialize metadata for current key
      this.keyMetadata[1] = {
        version: 1,
        createdAt: new Date().toISOString(),
        algorithm: 'aes-256-cbc',
        status: 'active',
        rotatedAt: null,
        expiresAt: null
      };

      // Try to load stored key metadata
      this.loadKeyMetadata();

      console.log(`✅ Key Manager initialized with version ${this.currentKeyVersion}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Key Manager:', error.message);
      throw error;
    }
  }

  /**
   * Get the current active encryption key
   */
  getCurrentKey() {
    return this.keys[this.currentKeyVersion];
  }

  /**
   * Get specific key by version
   * Useful for decrypting data encrypted with older keys
   */
  getKeyByVersion(version) {
    if (!this.keys[version]) {
      throw new Error(`Encryption key version ${version} not found`);
    }
    return this.keys[version];
  }

  /**
   * Get metadata for a specific key version
   */
  getKeyMetadata(version) {
    return this.keyMetadata[version];
  }

  /**
   * Get all key versions (for audit purposes)
   */
  getAllKeyVersions() {
    return Object.keys(this.keys).map(v => ({
      version: parseInt(v),
      metadata: this.keyMetadata[v]
    }));
  }

  /**
   * Rotate to a new encryption key
   * @param {string} newKey - New encryption key (32 bytes for AES-256)
   * @param {number} expirationDays - Days until old key expires (default: 90 days)
   */
  rotateKey(newKey, expirationDays = 90) {
    if (Buffer.from(newKey, 'utf8').length !== 32) {
      throw new Error('Encryption key must be exactly 32 bytes');
    }

    try {
      // Validate new key is different from current
      if (newKey === this.getCurrentKey()) {
        throw new Error('New key must be different from current key');
      }

      const newVersion = this.currentKeyVersion + 1;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000);

      // Mark old key as archived
      if (this.keyMetadata[this.currentKeyVersion]) {
        this.keyMetadata[this.currentKeyVersion].status = 'archived';
        this.keyMetadata[this.currentKeyVersion].rotatedAt = now.toISOString();
        this.keyMetadata[this.currentKeyVersion].expiresAt = expiresAt.toISOString();
      }

      // Add new key
      this.keys[newVersion] = newKey;
      this.keyMetadata[newVersion] = {
        version: newVersion,
        createdAt: now.toISOString(),
        algorithm: 'aes-256-cbc',
        status: 'active',
        rotatedAt: null,
        expiresAt: null
      };

      // Update current version
      this.currentKeyVersion = newVersion;

      // Persist key metadata
      this.saveKeyMetadata();

      console.log(`✅ Key rotation successful: v${newVersion} is now active`);
      return {
        oldVersion: newVersion - 1,
        newVersion: newVersion,
        rotatedAt: now.toISOString()
      };
    } catch (error) {
      console.error('❌ Key rotation failed:', error.message);
      throw error;
    }
  }

  /**
   * Clean up expired keys (older than expiration period)
   */
  cleanupExpiredKeys() {
    const now = new Date();
    const expiredVersions = [];

    for (const [version, metadata] of Object.entries(this.keyMetadata)) {
      if (metadata.expiresAt && new Date(metadata.expiresAt) < now) {
        expiredVersions.push(parseInt(version));
      }
    }

    // Remove expired keys
    expiredVersions.forEach(version => {
      if (version !== this.currentKeyVersion) {
        delete this.keys[version];
        delete this.keyMetadata[version];
        console.log(`🗑️  Removed expired key version ${version}`);
      }
    });

    if (expiredVersions.length > 0) {
      this.saveKeyMetadata();
    }

    return {
      cleanedVersions: expiredVersions,
      activeVersions: Object.keys(this.keys).map(Number)
    };
  }

  /**
   * Save key metadata to secure storage
   * In production, consider using a secrets manager (AWS Secrets Manager, Vault, etc.)
   *
   * @private Internal method
   */
  saveKeyMetadata() {
    try {
      const metadata = {
        currentVersion: this.currentKeyVersion,
        keys: this.keyMetadata,
        lastUpdated: new Date().toISOString()
      };

      // In development, save to file with restricted permissions
      // In production, use environment-based secrets manager
      if (process.env.NODE_ENV === 'development') {
        fs.writeFileSync(
          this.keysFile,
          JSON.stringify(metadata, null, 2),
          { mode: 0o600 } // Read/write for owner only
        );
      }
    } catch (error) {
      console.error('⚠️  Failed to save key metadata:', error.message);
      // Don't throw - keys should still work even if metadata save fails
    }
  }

  /**
   * Load key metadata from storage
   *
   * @private Internal method
   */
  loadKeyMetadata() {
    try {
      if (fs.existsSync(this.keysFile)) {
        const data = JSON.parse(fs.readFileSync(this.keysFile, 'utf-8'));

        if (data.currentVersion && data.keys) {
          this.currentKeyVersion = data.currentVersion;
          this.keyMetadata = data.keys;
          console.log(`📚 Loaded key metadata: v${this.currentKeyVersion} is active`);
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not load key metadata:', error.message);
      // Continue with default single-key setup
    }
  }

  /**
   * Validate key integrity
   */
  validateKey(key) {
    if (!key || typeof key !== 'string') {
      return { valid: false, error: 'Key must be a non-empty string' };
    }

    const keyBuffer = Buffer.from(key, 'utf8');
    if (keyBuffer.length !== 32) {
      return {
        valid: false,
        error: `Key must be exactly 32 bytes (got ${keyBuffer.length})`
      };
    }

    return { valid: true };
  }

  /**
   * Get key rotation status and recommendations
   */
  getRotationStatus() {
    const currentMetadata = this.keyMetadata[this.currentKeyVersion];
    const createdAt = new Date(currentMetadata.createdAt);
    const ageInDays = (new Date() - createdAt) / (1000 * 60 * 60 * 24);

    return {
      currentVersion: this.currentKeyVersion,
      createdAt: currentMetadata.createdAt,
      ageInDays: Math.round(ageInDays * 10) / 10,
      recommendedRotationInDays: Math.max(0, 90 - Math.round(ageInDays)),
      archivedKeys: Object.entries(this.keyMetadata)
        .filter(([_, m]) => m.status === 'archived')
        .map(([v, m]) => ({
          version: parseInt(v),
          rotatedAt: m.rotatedAt,
          expiresAt: m.expiresAt
        }))
    };
  }
}

// Singleton instance
let keyManagerInstance = null;

/**
 * Get or create the key manager instance
 */
export function getKeyManager() {
  if (!keyManagerInstance) {
    keyManagerInstance = new KeyManager();
    keyManagerInstance.initialize();
  }
  return keyManagerInstance;
}

/**
 * Helper function to generate a secure random key
 * @returns {string} - 32-byte key suitable for AES-256
 */
export function generateSecureKey() {
  return crypto.randomBytes(32).toString('base64').substring(0, 32);
}

export default getKeyManager;
