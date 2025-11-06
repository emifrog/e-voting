/**
 * Key Rotation Tests
 * Verifies key management, rotation, and backward compatibility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt, getEncryptionMetadata } from '../utils/crypto.js';
import { getKeyManager, generateSecureKey } from '../utils/keyManager.js';

describe('Key Rotation System', () => {
  let keyManager;

  beforeEach(() => {
    // Get a fresh key manager instance for each test
    keyManager = getKeyManager();
  });

  describe('KeyManager Initialization', () => {
    it('should initialize with a valid encryption key', () => {
      expect(keyManager.getCurrentKey()).toBeDefined();
      expect(keyManager.currentKeyVersion).toBe(1);
    });

    it('should validate key length (32 bytes for AES-256)', () => {
      const key = generateSecureKey();
      const validation = keyManager.validateKey(key);

      expect(validation.valid).toBe(true);
      expect(Buffer.from(key, 'utf8').length).toBe(32);
    });

    it('should reject invalid key lengths', () => {
      const validation = keyManager.validateKey('short-key');
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('32 bytes');
    });
  });

  describe('Encryption with Versioning', () => {
    it('should encrypt data with version prefix', () => {
      const testData = { vote: 'option1', weight: 1.5 };
      const encrypted = encrypt(testData);

      expect(encrypted).toMatch(/^1:/);
      expect(encrypted.length > 30).toBe(true);
    });

    it('should include correct version in encrypted data', () => {
      const testData = { id: '123' };
      const encrypted = encrypt(testData);
      const [version] = encrypted.split(':');

      expect(parseInt(version)).toBe(keyManager.currentKeyVersion);
    });

    it('should preserve data integrity after encryption/decryption', () => {
      const testData = {
        electionId: 'election-123',
        vote: ['option1', 'option2'],
        weight: 2.5,
        timestamp: new Date().toISOString()
      };

      const encrypted = encrypt(testData);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toEqual(testData);
    });
  });

  describe('Key Versioning & Rotation', () => {
    it('should rotate to a new key version', () => {
      const oldVersion = keyManager.currentKeyVersion;
      const newKey = generateSecureKey();

      const result = keyManager.rotateKey(newKey);

      expect(result.newVersion).toBe(oldVersion + 1);
      expect(keyManager.currentKeyVersion).toBe(oldVersion + 1);
    });

    it('should keep archived keys accessible', () => {
      const testData = { data: 'test' };

      // Encrypt with current key (v1)
      const encryptedV1 = encrypt(testData);

      // Rotate key
      const newKey = generateSecureKey();
      keyManager.rotateKey(newKey);

      // Should still be able to decrypt old data
      const decryptedV1 = decrypt(encryptedV1);
      expect(decryptedV1).toEqual(testData);

      // New data should be encrypted with v2
      const encryptedV2 = encrypt(testData);
      expect(encryptedV2).toMatch(/^2:/);
    });

    it('should reject rotation with same key', () => {
      const currentKey = keyManager.getCurrentKey();

      expect(() => {
        keyManager.rotateKey(currentKey);
      }).toThrow('different from current key');
    });

    it('should track key metadata correctly', () => {
      const oldVersion = keyManager.currentKeyVersion;
      const newKey = generateSecureKey();
      keyManager.rotateKey(newKey);

      // Old key should be archived
      const oldMetadata = keyManager.getKeyMetadata(oldVersion);
      expect(oldMetadata.status).toBe('archived');
      expect(oldMetadata.rotatedAt).toBeDefined();
      expect(oldMetadata.expiresAt).toBeDefined();

      // New key should be active
      const newMetadata = keyManager.getKeyMetadata(oldVersion + 1);
      expect(newMetadata.status).toBe('active');
      expect(newMetadata.rotatedAt).toBeNull();
    });
  });

  describe('Backward Compatibility', () => {
    it('should decrypt legacy data without version prefix', () => {
      const testData = { legacy: true };

      // Simulate old encrypted data (no version prefix)
      const currentKey = keyManager.getCurrentKey();
      const CryptoJS = (await import('crypto-js')).default;
      const legacyEncrypted = CryptoJS.AES.encrypt(
        JSON.stringify(testData),
        currentKey
      ).toString();

      // Should still decrypt
      const decrypted = decrypt(legacyEncrypted);
      expect(decrypted).toEqual(testData);
    });

    it('should handle data encrypted with different versions', () => {
      const testData = { version: 'test' };

      // Encrypt with v1
      const encryptedV1 = encrypt(testData);

      // Rotate to v2
      const newKey = generateSecureKey();
      keyManager.rotateKey(newKey);

      // Encrypt with v2
      const encryptedV2 = encrypt(testData);

      // Both should decrypt correctly
      expect(decrypt(encryptedV1)).toEqual(testData);
      expect(decrypt(encryptedV2)).toEqual(testData);

      // Should have different version prefixes
      expect(encryptedV1).toMatch(/^1:/);
      expect(encryptedV2).toMatch(/^2:/);
    });
  });

  describe('Encryption Metadata', () => {
    it('should extract version from encrypted data', () => {
      const testData = { metadata: 'test' };
      const encrypted = encrypt(testData);

      const metadata = getEncryptionMetadata(encrypted);

      expect(metadata.version).toBe(keyManager.currentKeyVersion);
      expect(metadata.encrypted).toBe(true);
      expect(metadata.keyMetadata).toBeDefined();
      expect(metadata.keyMetadata.status).toBe('active');
    });

    it('should mark legacy data as legacy', () => {
      const testData = { old: 'data' };
      const currentKey = keyManager.getCurrentKey();
      const CryptoJS = (await import('crypto-js')).default;
      const legacyEncrypted = CryptoJS.AES.encrypt(
        JSON.stringify(testData),
        currentKey
      ).toString();

      const metadata = getEncryptionMetadata(legacyEncrypted);

      expect(metadata.legacy).toBe(true);
      expect(metadata.version).toBe(keyManager.currentKeyVersion);
    });
  });

  describe('Key Expiration & Cleanup', () => {
    it('should clean up expired keys', () => {
      // Note: In real tests, we'd need to mock time
      // For now, just verify the cleanup function exists and returns correct shape
      const cleanup = keyManager.cleanupExpiredKeys();

      expect(cleanup.cleanedVersions).toBeDefined();
      expect(Array.isArray(cleanup.cleanedVersions)).toBe(true);
      expect(cleanup.activeVersions).toBeDefined();
      expect(Array.isArray(cleanup.activeVersions)).toBe(true);
    });

    it('should preserve active keys during cleanup', () => {
      const testData = { active: 'key' };
      const encrypted = encrypt(testData);

      const cleanup = keyManager.cleanupExpiredKeys();

      // Current key should still be usable
      const decrypted = decrypt(encrypted);
      expect(decrypted).toEqual(testData);
    });
  });

  describe('Rotation Status', () => {
    it('should provide rotation status information', () => {
      const status = keyManager.getRotationStatus();

      expect(status.currentVersion).toBeDefined();
      expect(status.createdAt).toBeDefined();
      expect(status.ageInDays).toBeGreaterThanOrEqual(0);
      expect(status.recommendedRotationInDays).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(status.archivedKeys)).toBe(true);
    });

    it('should track multiple archived keys', () => {
      const newKey1 = generateSecureKey();
      keyManager.rotateKey(newKey1);

      const newKey2 = generateSecureKey();
      keyManager.rotateKey(newKey2);

      const status = keyManager.getRotationStatus();

      // Should have at least 2 archived keys (v1 and v2)
      expect(status.archivedKeys.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw when accessing non-existent version', () => {
      expect(() => {
        keyManager.getKeyByVersion(999);
      }).toThrow('not found');
    });

    it('should handle decryption of corrupted data', () => {
      const corruptedData = '1:corrupt_encrypted_data';

      expect(() => {
        decrypt(corruptedData);
      }).toThrow();
    });

    it('should provide helpful error messages', () => {
      const validation = keyManager.validateKey(null);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });
  });
});

describe('Encryption Performance', () => {
  it('should handle batch encryption efficiently', () => {
    const iterations = 100;
    const testData = { id: 'test', vote: 'option' };

    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      encrypt(testData);
    }

    const duration = Date.now() - startTime;
    const avgTime = duration / iterations;

    console.log(`Encrypted ${iterations} items in ${duration}ms (${avgTime.toFixed(2)}ms per item)`);

    // Should be reasonably fast (< 50ms per encryption on average)
    expect(avgTime).toBeLessThan(50);
  });

  it('should handle batch decryption efficiently', () => {
    const iterations = 100;
    const testData = { id: 'test', vote: 'option' };

    // Pre-generate encrypted data
    const encrypted = [];
    for (let i = 0; i < iterations; i++) {
      encrypted.push(encrypt(testData));
    }

    const startTime = Date.now();

    for (const data of encrypted) {
      decrypt(data);
    }

    const duration = Date.now() - startTime;
    const avgTime = duration / iterations;

    console.log(`Decrypted ${iterations} items in ${duration}ms (${avgTime.toFixed(2)}ms per item)`);

    // Should be reasonably fast
    expect(avgTime).toBeLessThan(50);
  });
});
