/**
 * Key Rotation Service
 * Handles scheduled key rotations and migrations
 *
 * Features:
 * - Automatic key rotation on schedule
 * - Graceful migration of encrypted data
 * - Health checks and monitoring
 * - Audit logging
 */

import cron from 'node-cron';
import { getKeyManager, generateSecureKey } from '../utils/keyManager.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Initialize the key rotation scheduler
 * By default, rotate keys weekly
 */
export function initKeyRotationScheduler(cronExpression = '0 0 * * 0') {
  // Only run in appropriate environments
  if (!['development', 'production'].includes(process.env.NODE_ENV)) {
    logger.warn('Key rotation scheduler disabled for non-production environment');
    return;
  }

  try {
    logger.info(`📅 Key rotation scheduler initialized with cron: ${cronExpression}`);

    cron.schedule(cronExpression, async () => {
      try {
        await performKeyRotation();
      } catch (error) {
        logger.error('❌ Key rotation failed:', error);
        // Don't stop the application on rotation failure
        // The old key will still be available for decryption
      }
    });

    // Run initial health check
    checkKeyRotationHealth();
  } catch (error) {
    logger.error('Failed to initialize key rotation scheduler:', error);
    throw error;
  }
}

/**
 * Perform actual key rotation
 */
export async function performKeyRotation() {
  const startTime = new Date();

  try {
    const keyManager = getKeyManager();

    // Generate new secure key
    const newKey = generateSecureKey();

    // Validate the new key
    const validation = keyManager.validateKey(newKey);
    if (!validation.valid) {
      throw new Error(`Invalid new key: ${validation.error}`);
    }

    logger.info('🔄 Starting key rotation...');

    // Rotate to new key
    const result = keyManager.rotateKey(newKey, 90); // Keep old key for 90 days

    // Clean up expired keys
    const cleanup = keyManager.cleanupExpiredKeys();

    const duration = new Date() - startTime;

    logger.info('✅ Key rotation completed successfully', {
      newVersion: result.newVersion,
      oldVersion: result.oldVersion,
      cleanedVersions: cleanup.cleanedVersions,
      activeVersions: cleanup.activeVersions,
      durationMs: duration
    });

    // Log audit event
    logKeyRotationAudit({
      type: 'ROTATION_COMPLETED',
      oldVersion: result.oldVersion,
      newVersion: result.newVersion,
      cleanedVersions: cleanup.cleanedVersions,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    logger.error('❌ Key rotation failed', {
      error: error.message,
      durationMs: new Date() - startTime
    });

    // Log audit event for failed rotation
    logKeyRotationAudit({
      type: 'ROTATION_FAILED',
      error: error.message,
      timestamp: new Date().toISOString()
    });

    throw error;
  }
}

/**
 * Check key rotation health and recommend rotation if needed
 */
export function checkKeyRotationHealth() {
  try {
    const keyManager = getKeyManager();
    const status = keyManager.getRotationStatus();

    logger.info('📊 Key rotation status', {
      currentVersion: status.currentVersion,
      ageInDays: status.ageInDays,
      recommendedRotationInDays: status.recommendedRotationInDays,
      archivedKeysCount: status.archivedKeys.length
    });

    // Recommend rotation if key is older than 90 days
    if (status.ageInDays > 90) {
      logger.warn('⚠️  Key rotation recommended: current key is older than 90 days');
    }

    return status;
  } catch (error) {
    logger.error('Failed to check key rotation health:', error);
    throw error;
  }
}

/**
 * Manual key rotation endpoint (for admin use)
 * In production, this should require authentication and authorization
 */
export async function rotateKeyManually(adminId, reason = '') {
  try {
    logger.info(`🔐 Manual key rotation requested by ${adminId}: ${reason}`);

    const result = await performKeyRotation();

    // Log audit event with admin info
    logKeyRotationAudit({
      type: 'MANUAL_ROTATION',
      requestedBy: adminId,
      reason,
      newVersion: result.newVersion,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    logger.error('Manual key rotation failed:', error);
    throw error;
  }
}

/**
 * Get comprehensive key rotation audit
 */
export function getKeyRotationAudit(limit = 50) {
  try {
    const keyManager = getKeyManager();
    const versions = keyManager.getAllKeyVersions();

    return {
      currentVersion: keyManager.currentKeyVersion,
      allVersions: versions.sort((a, b) => b.version - a.version).slice(0, limit),
      status: keyManager.getRotationStatus()
    };
  } catch (error) {
    logger.error('Failed to get key rotation audit:', error);
    throw error;
  }
}

/**
 * Verify data can be decrypted with available keys
 * Useful for health checks
 */
export async function verifyEncryptionHealth(testData = { test: 'data' }) {
  try {
    const { encrypt, decrypt } = await import('../utils/crypto.js');

    // Encrypt with current key
    const encrypted = encrypt(testData);

    // Decrypt to verify it works
    const decrypted = decrypt(encrypted);

    // Verify data integrity
    if (JSON.stringify(decrypted) !== JSON.stringify(testData)) {
      throw new Error('Decrypted data does not match original');
    }

    logger.info('✅ Encryption health check passed');

    return {
      status: 'healthy',
      currentVersion: getKeyManager().currentKeyVersion,
      testPassed: true
    };
  } catch (error) {
    logger.error('❌ Encryption health check failed:', error);

    return {
      status: 'unhealthy',
      error: error.message,
      testPassed: false
    };
  }
}

/**
 * Log key rotation audit events
 * In production, these should be persisted to an audit log table
 */
function logKeyRotationAudit(event) {
  const auditEntry = {
    timestamp: event.timestamp || new Date().toISOString(),
    type: event.type,
    details: {
      oldVersion: event.oldVersion,
      newVersion: event.newVersion,
      cleanedVersions: event.cleanedVersions,
      activeVersions: event.activeVersions,
      requestedBy: event.requestedBy,
      reason: event.reason,
      error: event.error
    }
  };

  logger.info('🔐 Audit Log: Key Rotation Event', auditEntry);

  // TODO: Persist to audit log table
  // Would need to implement a separate audit logging system
}

/**
 * Export key rotation status endpoint data
 */
export function getKeyRotationStatus() {
  const keyManager = getKeyManager();

  return {
    currentVersion: keyManager.currentKeyVersion,
    rotationStatus: keyManager.getRotationStatus(),
    allVersions: keyManager.getAllKeyVersions(),
    encryptionAlgorithm: 'AES-256-CBC',
    keyLength: 32
  };
}

export default {
  initKeyRotationScheduler,
  performKeyRotation,
  checkKeyRotationHealth,
  rotateKeyManually,
  getKeyRotationAudit,
  verifyEncryptionHealth,
  getKeyRotationStatus
};
