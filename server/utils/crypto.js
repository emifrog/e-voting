import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { getKeyManager } from './keyManager.js';

/**
 * Get the current encryption key from key manager
 * Allows for key rotation support
 */
const getEncryptionKey = () => {
  try {
    const keyManager = getKeyManager();
    return keyManager.getCurrentKey();
  } catch (error) {
    // Fallback for initialization phase
    const fallbackKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    return fallbackKey;
  }
};

/**
 * Génère un token sécurisé unique
 */
export const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Génère un hash sécurisé
 */
export const generateHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Chiffre des données sensibles avec support multi-version
 * Stocke la version de la clé pour déchiffrement ultérieur
 *
 * Format: `VERSION:encryptedData`
 * Exemple: `1:U2FsdGVkX1...`
 */
export const encrypt = (data) => {
  try {
    const keyManager = getKeyManager();
    const key = keyManager.getCurrentKey();
    const version = keyManager.currentKeyVersion;

    const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();

    // Prepend version for future decryption with correct key
    return `${version}:${encryptedData}`;
  } catch (error) {
    console.error('Encryption error:', error);
    // Fallback encryption without versioning
    const fallbackKey = getEncryptionKey();
    return CryptoJS.AES.encrypt(JSON.stringify(data), fallbackKey).toString();
  }
};

/**
 * Déchiffre des données avec support multi-version
 * Automatically uses correct key version for decryption
 *
 * Handles both:
 * - New format: `VERSION:encryptedData` (uses versioned key)
 * - Old format: `encryptedData` (uses current key)
 */
export const decrypt = (encryptedData) => {
  try {
    let version = null;
    let dataToDecrypt = encryptedData;

    // Check if data has version prefix
    if (encryptedData.includes(':')) {
      const parts = encryptedData.split(':');
      const potentialVersion = parseInt(parts[0]);

      // Validate version format (single or double digit followed by colon)
      if (!isNaN(potentialVersion) && parts[0].length <= 2) {
        version = potentialVersion;
        dataToDecrypt = parts.slice(1).join(':'); // Handle colons in encrypted data
      }
    }

    const keyManager = getKeyManager();
    let key;

    if (version !== null) {
      // Use specific version key
      key = keyManager.getKeyByVersion(version);
    } else {
      // Fallback to current key for legacy data
      key = keyManager.getCurrentKey();
    }

    const bytes = CryptoJS.AES.decrypt(dataToDecrypt, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error('Decryption resulted in empty string - key mismatch possible');
    }

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error(`Failed to decrypt data: ${error.message}`);
  }
};

/**
 * Crée un hash de bulletin pour vérification d'intégrité
 */
export const createBallotHash = (electionId, voterToken, timestamp) => {
  const data = `${electionId}-${voterToken}-${timestamp}`;
  return generateHash(data);
};

/**
 * Vérifie l'intégrité d'un bulletin
 */
export const verifyBallotIntegrity = (ballot, electionId, voterToken) => {
  const computedHash = createBallotHash(electionId, voterToken, ballot.timestamp);
  return computedHash === ballot.hash;
};

/**
 * Get encryption metadata for a data blob
 * Useful for debugging and audit purposes
 */
export const getEncryptionMetadata = (encryptedData) => {
  try {
    if (encryptedData.includes(':')) {
      const parts = encryptedData.split(':');
      const version = parseInt(parts[0]);

      if (!isNaN(version) && parts[0].length <= 2) {
        const keyManager = getKeyManager();
        const metadata = keyManager.getKeyMetadata(version);

        return {
          version,
          keyMetadata: metadata,
          encrypted: true
        };
      }
    }

    // No version info, assume current key
    const keyManager = getKeyManager();
    return {
      version: keyManager.currentKeyVersion,
      keyMetadata: keyManager.getKeyMetadata(keyManager.currentKeyVersion),
      encrypted: true,
      legacy: true
    };
  } catch (error) {
    return { error: error.message };
  }
};
