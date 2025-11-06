/**
 * Export Service with Metadata and Digital Signatures
 *
 * Features:
 * - Export with metadata (election_id, exported_by, timestamp)
 * - SHA-256 hash of exported data
 * - HMAC digital signatures
 * - CSV and JSON formats
 * - Verification support
 */

import crypto from 'crypto';
import db from '../database/db.js';
import logger from '../utils/logger.js';

/**
 * Create export metadata
 */
function createExportMetadata(electionId, userId, dataHash) {
  return {
    exportId: crypto.randomBytes(16).toString('hex'),
    electionId,
    exportedBy: userId,
    exportedAt: new Date().toISOString(),
    dataHash,
    algorithm: 'SHA-256'
  };
}

/**
 * Calculate SHA-256 hash of data
 */
function hashData(data) {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate HMAC digital signature
 */
function generateExportSignature(metadata, dataHash) {
  const secret = process.env.EXPORT_SIGNATURE_SECRET || 'default-export-secret-change-in-production';

  const content = JSON.stringify({
    exportId: metadata.exportId,
    electionId: metadata.electionId,
    exportedBy: metadata.exportedBy,
    exportedAt: metadata.exportedAt,
    dataHash: dataHash
  });

  return crypto
    .createHmac('sha256', secret)
    .update(content)
    .digest('hex');
}

/**
 * Export election results with metadata
 */
export async function exportElectionResults(electionId, userId) {
  try {
    // Get election
    const electionStmt = db.prepare('SELECT * FROM elections WHERE id = ?');
    const election = electionStmt.get(electionId);

    if (!election) {
      throw new Error('Election not found');
    }

    // Get options
    const optionsStmt = db.prepare('SELECT * FROM election_options WHERE election_id = ? ORDER BY option_order');
    const options = optionsStmt.all(electionId);

    // Get ballots
    const ballotsStmt = db.prepare(`
      SELECT id, encrypted_vote, voter_weight, cast_at, ip_address
      FROM ballots
      WHERE election_id = ?
    `);
    const ballots = ballotsStmt.all(electionId);

    // Get voter count
    const votersStmt = db.prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN has_voted = 1 THEN 1 ELSE 0 END) as voted
      FROM voters
      WHERE election_id = ?
    `);
    const voters = votersStmt.get(electionId);

    // Create export data
    const exportData = {
      election: {
        id: election.id,
        title: election.title,
        description: election.description,
        type: election.type,
        voting_type: election.voting_type,
        is_secret: election.is_secret,
        is_weighted: election.is_weighted,
        allow_anonymity: election.allow_anonymity,
        status: election.status,
        created_at: election.created_at,
        actual_start: election.actual_start,
        actual_end: election.actual_end
      },
      options: options.map(opt => ({
        id: opt.id,
        text: opt.option_text,
        order: opt.option_order
      })),
      results: {
        totalVoters: voters.total,
        votedCount: voters.voted,
        participationRate: (voters.voted / voters.total * 100).toFixed(2) + '%'
      },
      ballots: ballots.map(b => ({
        id: b.id,
        weight: b.weight,
        cast_at: b.cast_at
      }))
    };

    // Calculate hash
    const dataHash = hashData(exportData);

    // Create metadata
    const metadata = createExportMetadata(electionId, userId, dataHash);

    // Generate signature
    const signature = generateExportSignature(metadata, dataHash);

    // Return export package
    return {
      data: exportData,
      metadata,
      signature,
      verified: true
    };
  } catch (error) {
    logger.error('[ExportService] Failed to export results:', error);
    throw error;
  }
}

/**
 * Export voters list with metadata
 */
export async function exportVotersList(electionId, userId) {
  try {
    const stmt = db.prepare(`
      SELECT id, email, name, weight, has_voted, voted_at, created_at
      FROM voters
      WHERE election_id = ?
      ORDER BY created_at DESC
    `);

    const voters = stmt.all(electionId);

    const exportData = {
      electionId,
      exportedAt: new Date().toISOString(),
      voterCount: voters.length,
      voters: voters.map(v => ({
        id: v.id,
        email: v.email,
        name: v.name,
        weight: v.weight,
        hasVoted: v.has_voted === 1,
        votedAt: v.voted_at,
        addedAt: v.created_at
      }))
    };

    const dataHash = hashData(exportData);
    const metadata = createExportMetadata(electionId, userId, dataHash);
    const signature = generateExportSignature(metadata, dataHash);

    return {
      data: exportData,
      metadata,
      signature,
      verified: true
    };
  } catch (error) {
    logger.error('[ExportService] Failed to export voters:', error);
    throw error;
  }
}

/**
 * Export audit logs with metadata
 */
export async function exportAuditLogs(electionId, userId) {
  try {
    const stmt = db.prepare(`
      SELECT id, user_id, action, details, ip_address, created_at, entry_hash, signature
      FROM audit_logs
      WHERE election_id = ?
      ORDER BY created_at DESC
    `);

    const logs = stmt.all(electionId);

    const exportData = {
      electionId,
      exportedAt: new Date().toISOString(),
      logCount: logs.length,
      logs: logs.map(log => ({
        id: log.id,
        userId: log.user_id,
        action: log.action,
        details: log.details ? JSON.parse(log.details) : null,
        ipAddress: log.ip_address,
        timestamp: log.created_at,
        entryHash: log.entry_hash,
        signature: log.signature
      }))
    };

    const dataHash = hashData(exportData);
    const metadata = createExportMetadata(electionId, userId, dataHash);
    const signature = generateExportSignature(metadata, dataHash);

    return {
      data: exportData,
      metadata,
      signature,
      verified: true
    };
  } catch (error) {
    logger.error('[ExportService] Failed to export audit logs:', error);
    throw error;
  }
}

/**
 * Convert export data to CSV format
 */
export function convertToCSV(exportData) {
  if (!exportData.data.voters && !exportData.data.ballots) {
    return JSON.stringify(exportData, null, 2);
  }

  const lines = [];

  // Add metadata as CSV comments
  lines.push(`# Export ID,${exportData.metadata.exportId}`);
  lines.push(`# Election ID,${exportData.metadata.electionId}`);
  lines.push(`# Exported By,${exportData.metadata.exportedBy}`);
  lines.push(`# Exported At,${exportData.metadata.exportedAt}`);
  lines.push(`# Data Hash,${exportData.metadata.dataHash}`);
  lines.push(`# Signature,${exportData.signature}`);
  lines.push('');

  if (exportData.data.voters) {
    lines.push('Email,Name,Weight,Has Voted,Voted At,Added At');
    exportData.data.voters.forEach(voter => {
      lines.push(`"${voter.email}","${voter.name}",${voter.weight},${voter.hasVoted},${voter.votedAt || ''},${voter.addedAt}`);
    });
  }

  return lines.join('\n');
}

/**
 * Verify export signature
 */
export function verifyExportSignature(exportPackage) {
  try {
    const { data, metadata, signature } = exportPackage;

    // Verify data hash
    const computedHash = hashData(data);
    if (computedHash !== metadata.dataHash) {
      return {
        valid: false,
        reason: 'Data hash mismatch'
      };
    }

    // Verify signature
    const computedSignature = generateExportSignature(metadata, metadata.dataHash);
    if (computedSignature !== signature) {
      return {
        valid: false,
        reason: 'Signature verification failed'
      };
    }

    return {
      valid: true,
      exportId: metadata.exportId,
      exportedAt: metadata.exportedAt,
      exportedBy: metadata.exportedBy
    };
  } catch (error) {
    logger.error('[ExportService] Failed to verify signature:', error);
    return {
      valid: false,
      reason: error.message
    };
  }
}

/**
 * Create compliance report for audit
 */
export async function createComplianceReport(electionId, userId) {
  try {
    // Get election info
    const electionStmt = db.prepare('SELECT * FROM elections WHERE id = ?');
    const election = electionStmt.get(electionId);

    // Get audit logs
    const auditStmt = db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE election_id = ?');
    const { count: auditCount } = auditStmt.get(electionId);

    // Get voter stats
    const votersStmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN has_voted = 1 THEN 1 ELSE 0 END) as voted,
        SUM(CASE WHEN has_voted = 0 THEN 1 ELSE 0 END) as not_voted
      FROM voters
      WHERE election_id = ?
    `);
    const voterStats = votersStmt.get(electionId);

    const report = {
      reportId: crypto.randomBytes(16).toString('hex'),
      electionId,
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      election: {
        title: election.title,
        status: election.status,
        created: election.created_at,
        started: election.actual_start,
        ended: election.actual_end
      },
      compliance: {
        auditLogsCount: auditCount,
        totalVoters: voterStats.total,
        votedCount: voterStats.voted,
        notVotedCount: voterStats.not_voted,
        participationRate: (voterStats.voted / voterStats.total * 100).toFixed(2) + '%'
      },
      checks: {
        hasAuditLogs: auditCount > 0,
        hasVoters: voterStats.total > 0,
        hasVotes: voterStats.voted > 0,
        electionComplete: election.status === 'closed'
      }
    };

    // Create signature
    const reportHash = hashData(report);
    const secret = process.env.COMPLIANCE_REPORT_SECRET || 'default-compliance-secret';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(reportHash)
      .digest('hex');

    return {
      report,
      reportHash,
      signature
    };
  } catch (error) {
    logger.error('[ExportService] Failed to create compliance report:', error);
    throw error;
  }
}

export default {
  exportElectionResults,
  exportVotersList,
  exportAuditLogs,
  convertToCSV,
  verifyExportSignature,
  createComplianceReport,
  hashData,
  generateExportSignature
};
