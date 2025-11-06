/**
 * Audit Logs API Routes
 * Endpoints for viewing and verifying immutable audit logs
 */

import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import {
  createAuditLog,
  getAuditLogs,
  verifyAuditChain,
  getImmutabilityCertificate,
  exportAuditLogsData
} from '../services/auditLog.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/elections/:electionId/audit-logs
 * Get audit logs for an election
 */
router.get('/:electionId/audit-logs', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;
    const { action, user_id, limit = 100, offset = 0 } = req.query;

    const logs = await getAuditLogs(electionId, {
      action,
      user_id,
      limit: Math.min(parseInt(limit), 1000),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      electionId,
      count: logs.length,
      logs
    });
  } catch (error) {
    logger.error('Failed to get audit logs:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get audit logs',
      details: error.message
    });
  }
});

/**
 * GET /api/elections/:electionId/audit-logs/verify-chain
 * Verify the integrity of the audit log chain
 */
router.get('/:electionId/audit-logs/verify-chain', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    const verification = await verifyAuditChain(electionId);

    const httpStatus = verification.valid ? 200 : 409;

    res.status(httpStatus).json({
      success: verification.valid,
      electionId,
      verification
    });
  } catch (error) {
    logger.error('Failed to verify audit chain:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to verify audit chain',
      details: error.message
    });
  }
});

/**
 * GET /api/elections/:electionId/audit-logs/certificate
 * Get immutability certificate for audit logs
 */
router.get('/:electionId/audit-logs/certificate', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    const certificate = await getImmutabilityCertificate(electionId);

    res.json({
      success: true,
      certificate
    });
  } catch (error) {
    logger.error('Failed to get immutability certificate:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get immutability certificate',
      details: error.message
    });
  }
});

/**
 * GET /api/elections/:electionId/audit-logs/export
 * Export audit logs with metadata and signatures
 */
router.get('/:electionId/audit-logs/export', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;
    const { format = 'json', includeSignatures = false } = req.query;

    const exportData = await exportAuditLogsData(
      electionId,
      includeSignatures === 'true'
    );

    if (format === 'csv') {
      // Convert to CSV
      const csv = ['ID,Action,User ID,IP Address,Timestamp,Entry Hash'];
      exportData.logs.forEach(log => {
        csv.push(
          `"${log.id}","${log.action}","${log.user_id || ''}","${log.ip_address || ''}","${log.timestamp}","${log.entryHash}"`
        );
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${electionId}.csv"`);
      res.send(csv.join('\n'));
    } else {
      // JSON format (default)
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${electionId}.json"`);
      res.json(exportData);
    }
  } catch (error) {
    logger.error('Failed to export audit logs:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to export audit logs',
      details: error.message
    });
  }
});

/**
 * POST /api/elections/:electionId/audit-logs/manual
 * Create a manual audit log entry (admin action)
 */
router.post('/:electionId/audit-logs/manual', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;
    const { action, details } = req.body;

    if (!action) {
      return res.status(400).json({
        error: true,
        message: 'Action is required'
      });
    }

    const entry = await createAuditLog({
      election_id: electionId,
      user_id: req.user.id,
      action,
      details,
      ip_address: req.ip
    });

    res.status(201).json({
      success: true,
      entry
    });
  } catch (error) {
    logger.error('Failed to create audit log entry:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to create audit log entry',
      details: error.message
    });
  }
});

/**
 * GET /api/elections/:electionId/audit-logs/stats
 * Get audit log statistics
 */
router.get('/:electionId/audit-logs/stats', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    const allLogs = await getAuditLogs(electionId, { limit: 10000 });

    // Group by action
    const actionCounts = {};
    allLogs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    // Group by user
    const userCounts = {};
    allLogs.forEach(log => {
      if (log.user_id) {
        userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1;
      }
    });

    res.json({
      success: true,
      electionId,
      stats: {
        totalEntries: allLogs.length,
        actionBreakdown: actionCounts,
        userBreakdown: userCounts,
        dateRange: {
          earliest: allLogs.length > 0 ? allLogs[allLogs.length - 1].created_at : null,
          latest: allLogs.length > 0 ? allLogs[0].created_at : null
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get audit log stats:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get audit log stats',
      details: error.message
    });
  }
});

export default router;
