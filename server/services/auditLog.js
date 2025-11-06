/**
 * Immutable Audit Log Service
 * Implements append-only logging with hash chain verification
 *
 * Features:
 * - Append-only (no deletes or updates)
 * - Hash chain for tamper detection (like blockchain)
 * - Digital signatures for authenticity
 * - Cryptographic proof of integrity
 * - Immutable timestamps
 */

import db from '../database/db.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Create an immutable audit log entry
 * Each entry references the hash of the previous entry
 *
 * @param {Object} entry - {election_id, user_id, action, details, ip_address}
 * @returns {Promise<Object>} - {id, hash, prevHash}
 */
export async function createAuditLog(entry) {
  try {
    const {
      election_id,
      user_id,
      action,
      details = null,
      ip_address
    } = entry;

    // Get the previous log entry to chain hashes
    const prevEntry = await getLastAuditLog(election_id);
    const prevHash = prevEntry?.entry_hash || 'genesis';

    // Create entry ID
    const id = crypto.randomBytes(16).toString('hex');
    const timestamp = new Date().toISOString();

    // Create hash chain: hash(id + prevHash + timestamp + action + details)
    const entryHash = hashEntry({
      id,
      prevHash,
      timestamp,
      action,
      details,
      user_id,
      ip_address
    });

    // Generate digital signature
    const signature = generateSignature({
      id,
      entryHash,
      timestamp,
      action
    });

    // Insert into database (append-only)
    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        id, election_id, user_id, action, details, ip_address,
        entry_hash, prev_hash, signature, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      election_id,
      user_id,
      action,
      details ? JSON.stringify(details) : null,
      ip_address,
      entryHash,
      prevHash,
      signature,
      timestamp
    );

    logger.info(`[AuditLog] Entry created: ${action}`, {
      id,
      election_id,
      user_id,
      action,
      hash: entryHash.substring(0, 16)
    });

    return {
      id,
      hash: entryHash,
      prevHash,
      timestamp,
      verified: true
    };
  } catch (error) {
    logger.error('[AuditLog] Failed to create entry:', error);
    throw error;
  }
}

/**
 * Get the last audit log entry for an election
 */
export async function getLastAuditLog(electionId) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM audit_logs
      WHERE election_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const row = stmt.get(electionId);
    return row;
  } catch (error) {
    logger.error('[AuditLog] Failed to get last entry:', error);
    return null;
  }
}

/**
 * Verify the integrity of the entire audit log chain
 * Checks that each entry's prevHash matches the previous entry's hash
 *
 * @param {string} electionId - Election ID
 * @returns {Promise<Object>} - {valid, errors, warnings}
 */
export async function verifyAuditChain(electionId) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM audit_logs
      WHERE election_id = ?
      ORDER BY created_at ASC
    `);

    const entries = stmt.all(electionId);
    const result = {
      valid: true,
      checked: entries.length,
      errors: [],
      warnings: [],
      chainIntegrity: true
    };

    if (entries.length === 0) {
      return result;
    }

    // Verify genesis entry (should have prevHash = 'genesis')
    if (entries[0].prev_hash !== 'genesis') {
      result.errors.push({
        index: 0,
        message: 'Genesis entry should have prevHash = "genesis"',
        actual: entries[0].prev_hash
      });
      result.valid = false;
    }

    // Verify hash chain continuity
    for (let i = 1; i < entries.length; i++) {
      const current = entries[i];
      const previous = entries[i - 1];

      // Check if current entry's prevHash matches previous entry's hash
      if (current.prev_hash !== previous.entry_hash) {
        result.errors.push({
          index: i,
          message: 'Hash chain broken at entry',
          expected: previous.entry_hash,
          actual: current.prev_hash
        });
        result.valid = false;
        result.chainIntegrity = false;
      }

      // Verify hash computation
      const expectedHash = hashEntry({
        id: current.id,
        prevHash: current.prev_hash,
        timestamp: current.created_at,
        action: current.action,
        details: current.details,
        user_id: current.user_id,
        ip_address: current.ip_address
      });

      if (expectedHash !== current.entry_hash) {
        result.errors.push({
          index: i,
          message: 'Entry hash does not match computation',
          id: current.id,
          expected: expectedHash,
          actual: current.entry_hash
        });
        result.valid = false;
      }
    }

    logger.info(`[AuditLog] Chain verification complete`, {
      electionId,
      entriesChecked: entries.length,
      valid: result.valid,
      errors: result.errors.length
    });

    return result;
  } catch (error) {
    logger.error('[AuditLog] Failed to verify chain:', error);
    throw error;
  }
}

/**
 * Get audit logs for an election with filtering
 */
export async function getAuditLogs(electionId, options = {}) {
  try {
    const {
      action = null,
      user_id = null,
      limit = 100,
      offset = 0,
      startDate = null,
      endDate = null
    } = options;

    let query = 'SELECT * FROM audit_logs WHERE election_id = ?';
    const params = [electionId];

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    if (user_id) {
      query += ' AND user_id = ?';
      params.push(user_id);
    }

    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const logs = stmt.all(...params);

    // Parse details JSON
    return logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));
  } catch (error) {
    logger.error('[AuditLog] Failed to get logs:', error);
    throw error;
  }
}

/**
 * Hash an audit log entry
 * Uses SHA-256 to create a fingerprint of the entry
 */
function hashEntry(data) {
  const content = JSON.stringify({
    id: data.id,
    prevHash: data.prevHash,
    timestamp: data.timestamp,
    action: data.action,
    details: data.details,
    user_id: data.user_id,
    ip_address: data.ip_address
  });

  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate HMAC signature for an entry
 * Uses a server secret to create a digital signature
 */
function generateSignature(data) {
  const secret = process.env.AUDIT_LOG_SECRET || 'default-audit-secret-change-in-production';

  const content = JSON.stringify({
    id: data.id,
    entryHash: data.entryHash,
    timestamp: data.timestamp,
    action: data.action
  });

  return crypto
    .createHmac('sha256', secret)
    .update(content)
    .digest('hex');
}

/**
 * Verify signature of an audit log entry
 */
export function verifySignature(entry) {
  try {
    const expectedSignature = generateSignature({
      id: entry.id,
      entryHash: entry.entry_hash,
      timestamp: entry.created_at,
      action: entry.action
    });

    return entry.signature === expectedSignature;
  } catch (error) {
    logger.error('[AuditLog] Failed to verify signature:', error);
    return false;
  }
}

/**
 * Get immutability certificate for audit logs
 * Proves that logs haven't been modified
 */
export async function getImmutabilityCertificate(electionId) {
  try {
    // Get last log entry
    const lastLog = await getLastAuditLog(electionId);

    if (!lastLog) {
      return {
        electionId,
        logCount: 0,
        status: 'no_logs'
      };
    }

    // Verify chain
    const chainVerification = await verifyAuditChain(electionId);

    // Get stats
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE election_id = ?');
    const { count } = countStmt.get(electionId);

    return {
      electionId,
      logCount: count,
      lastLogId: lastLog.id,
      lastLogHash: lastLog.entry_hash,
      lastLogTimestamp: lastLog.created_at,
      chainValid: chainVerification.valid,
      chainIntegrity: chainVerification.chainIntegrity,
      certificateGeneratedAt: new Date().toISOString(),
      status: chainVerification.valid ? 'immutable' : 'compromised'
    };
  } catch (error) {
    logger.error('[AuditLog] Failed to get certificate:', error);
    throw error;
  }
}

/**
 * Export audit logs as structured data
 * Includes hashes and signatures for verification
 */
export async function exportAuditLogsData(electionId, includeSignatures = false) {
  try {
    const logs = await getAuditLogs(electionId, { limit: 10000 });

    const exportData = {
      exportedAt: new Date().toISOString(),
      electionId,
      totalLogs: logs.length,
      logs: logs.map(log => {
        const entry = {
          id: log.id,
          timestamp: log.created_at,
          action: log.action,
          details: log.details,
          user_id: log.user_id,
          ip_address: log.ip_address,
          entryHash: log.entry_hash,
          prevHash: log.prev_hash,
          verified: verifySignature(log)
        };

        if (includeSignatures) {
          entry.signature = log.signature;
        }

        return entry;
      })
    };

    return exportData;
  } catch (error) {
    logger.error('[AuditLog] Failed to export:', error);
    throw error;
  }
}

export default {
  createAuditLog,
  getAuditLogs,
  verifyAuditChain,
  verifySignature,
  getImmutabilityCertificate,
  exportAuditLogsData,
  getLastAuditLog
};
