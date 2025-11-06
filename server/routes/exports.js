/**
 * Export API Routes
 * Endpoints for exporting election data with metadata and signatures
 */

import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import {
  exportElectionResults,
  exportVotersList,
  exportAuditLogs,
  convertToCSV,
  verifyExportSignature,
  createComplianceReport
} from '../services/exportService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/elections/:electionId/export/results
 * Export election results with metadata and signature
 */
router.get('/:electionId/export/results', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;
    const { format = 'json' } = req.query;

    const exportPackage = await exportElectionResults(electionId, req.user.id);

    if (format === 'csv') {
      const csv = convertToCSV(exportPackage);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="results-${electionId}.csv"`);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="results-${electionId}.json"`);
      res.json(exportPackage);
    }

    logger.info(`[Export] Results exported for election ${electionId}`, {
      by: req.user.id,
      format,
      signature: exportPackage.signature.substring(0, 16)
    });
  } catch (error) {
    logger.error('Failed to export results:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to export results',
      details: error.message
    });
  }
});

/**
 * GET /api/elections/:electionId/export/voters
 * Export voters list with metadata and signature
 */
router.get('/:electionId/export/voters', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;
    const { format = 'json' } = req.query;

    const exportPackage = await exportVotersList(electionId, req.user.id);

    if (format === 'csv') {
      const csv = convertToCSV(exportPackage);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="voters-${electionId}.csv"`);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="voters-${electionId}.json"`);
      res.json(exportPackage);
    }

    logger.info(`[Export] Voters list exported for election ${electionId}`, {
      by: req.user.id,
      format,
      voterCount: exportPackage.data.voterCount
    });
  } catch (error) {
    logger.error('Failed to export voters:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to export voters',
      details: error.message
    });
  }
});

/**
 * GET /api/elections/:electionId/export/audit
 * Export audit logs with metadata and signature
 */
router.get('/:electionId/export/audit', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;
    const { format = 'json' } = req.query;

    const exportPackage = await exportAuditLogs(electionId, req.user.id);

    if (format === 'csv') {
      const lines = [
        '# Export Metadata',
        `# Export ID,${exportPackage.metadata.exportId}`,
        `# Election ID,${exportPackage.metadata.electionId}`,
        `# Exported By,${exportPackage.metadata.exportedBy}`,
        `# Exported At,${exportPackage.metadata.exportedAt}`,
        `# Data Hash,${exportPackage.metadata.dataHash}`,
        `# Signature,${exportPackage.signature}`,
        '',
        'ID,User ID,Action,IP Address,Timestamp,Entry Hash,Signature'
      ];

      exportPackage.data.logs.forEach(log => {
        lines.push(
          `"${log.id}","${log.userId || ''}","${log.action}","${log.ipAddress || ''}","${log.timestamp}","${log.entryHash}","${log.signature}"`
        );
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-${electionId}.csv"`);
      res.send(lines.join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-${electionId}.json"`);
      res.json(exportPackage);
    }

    logger.info(`[Export] Audit logs exported for election ${electionId}`, {
      by: req.user.id,
      format,
      logCount: exportPackage.data.logCount
    });
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
 * POST /api/elections/:electionId/export/verify
 * Verify an exported package signature
 */
router.post('/:electionId/export/verify', authenticateAdmin, async (req, res) => {
  try {
    const { exportPackage } = req.body;

    if (!exportPackage || !exportPackage.data || !exportPackage.metadata || !exportPackage.signature) {
      return res.status(400).json({
        error: true,
        message: 'Invalid export package format'
      });
    }

    const verification = verifyExportSignature(exportPackage);

    const httpStatus = verification.valid ? 200 : 409;

    res.status(httpStatus).json({
      success: verification.valid,
      verification
    });
  } catch (error) {
    logger.error('Failed to verify export:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to verify export',
      details: error.message
    });
  }
});

/**
 * GET /api/elections/:electionId/export/compliance-report
 * Create compliance report for audit
 */
router.get('/:electionId/export/compliance-report', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    const { report, reportHash, signature } = await createComplianceReport(electionId, req.user.id);

    res.json({
      success: true,
      report,
      reportHash,
      signature,
      verified: true
    });

    logger.info(`[Export] Compliance report generated for election ${electionId}`, {
      by: req.user.id,
      reportId: report.reportId
    });
  } catch (error) {
    logger.error('Failed to create compliance report:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to create compliance report',
      details: error.message
    });
  }
});

/**
 * GET /api/elections/:electionId/export/all
 * Export all data (results, voters, audit) as zip package
 * Note: Requires zip library to be added to dependencies
 */
router.get('/:electionId/export/all', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    // Export all components
    const results = await exportElectionResults(electionId, req.user.id);
    const voters = await exportVotersList(electionId, req.user.id);
    const audit = await exportAuditLogs(electionId, req.user.id);

    // Create combined package
    const combinedPackage = {
      exportId: results.metadata.exportId,
      electionId,
      exportedBy: req.user.id,
      exportedAt: new Date().toISOString(),
      components: {
        results: results.metadata,
        voters: voters.metadata,
        audit: audit.metadata
      },
      data: {
        results: results.data,
        voters: voters.data,
        audit: audit.data
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="export-all-${electionId}.json"`);
    res.json(combinedPackage);

    logger.info(`[Export] Full export package created for election ${electionId}`, {
      by: req.user.id
    });
  } catch (error) {
    logger.error('Failed to create full export:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to create full export',
      details: error.message
    });
  }
});

export default router;
