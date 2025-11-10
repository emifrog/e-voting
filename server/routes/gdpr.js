/**
 * GDPR/RGPD API Routes
 *
 * Endpoints for GDPR compliance:
 * - Processing activities registry (Art. 30)
 * - Data subject rights (Art. 15-22)
 * - Data export and portability (Art. 20)
 * - Consent management (Art. 7)
 * - Compliance reporting
 */

import express from 'express';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditLog.js';
import gdprService from '../services/gdprService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ============================================
// PROCESSING ACTIVITIES REGISTRY (Art. 30)
// ============================================

/**
 * GET /api/gdpr/processing-registry
 * Get processing activities registry
 * Admin only
 */
router.get('/processing-registry', authenticateAdmin, async (req, res) => {
  try {
    const { isActive } = req.query;

    const activities = await gdprService.getProcessingActivitiesRegistry({
      isActive: isActive !== undefined ? isActive === 'true' : true
    });

    res.json({
      activities,
      count: activities.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching processing registry:', error);
    res.status(500).json({ error: 'Failed to fetch processing registry' });
  }
});

/**
 * GET /api/gdpr/data-categories
 * Get data categories
 * Admin only
 */
router.get('/data-categories', authenticateAdmin, async (req, res) => {
  try {
    const categories = await gdprService.getDataCategories();

    res.json({
      categories,
      count: categories.length
    });
  } catch (error) {
    logger.error('Error fetching data categories:', error);
    res.status(500).json({ error: 'Failed to fetch data categories' });
  }
});

/**
 * GET /api/gdpr/retention-policy
 * Get retention policy
 * Admin only
 */
router.get('/retention-policy', authenticateAdmin, async (req, res) => {
  try {
    const policy = await gdprService.getRetentionPolicy();
    res.json(policy);
  } catch (error) {
    logger.error('Error fetching retention policy:', error);
    res.status(500).json({ error: 'Failed to fetch retention policy' });
  }
});

// ============================================
// DATA SUBJECT RIGHTS REQUESTS (Art. 15-22)
// ============================================

/**
 * POST /api/gdpr/data-request
 * Create a new data subject request
 * Public endpoint (authenticated users can create for themselves)
 */
router.post('/data-request', async (req, res) => {
  try {
    const {
      requesterEmail,
      requesterName,
      requestType,
      details
    } = req.body;

    // Validation
    if (!requesterEmail || !requestType) {
      return res.status(400).json({ error: 'Email and request type are required' });
    }

    const requestData = {
      requesterEmail,
      requesterName,
      requestType,
      details,
      userId: req.user?.id || null,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    };

    const request = await gdprService.createDataRequest(requestData);

    // Audit log
    if (req.user) {
      await createAuditLog({
        election_id: null,
        user_id: req.user.id,
        action: 'gdpr_request_created',
        details: { requestType, requestNumber: request.request_number },
        ip_address: req.ip
      });
    }

    res.status(201).json({
      message: 'Data request created successfully',
      request: {
        id: request.id,
        requestNumber: request.request_number,
        requestType: request.request_type,
        status: request.status,
        deadline: request.deadline_at
      }
    });
  } catch (error) {
    logger.error('Error creating data request:', error);
    res.status(500).json({ error: error.message || 'Failed to create data request' });
  }
});

/**
 * GET /api/gdpr/data-requests
 * Get all data requests (with filters)
 * Admin only
 */
router.get('/data-requests', authenticateAdmin, async (req, res) => {
  try {
    const { status, requestType, requesterEmail, limit, offset } = req.query;

    const requests = await gdprService.getDataRequests({
      status,
      requestType,
      requesterEmail,
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    });

    res.json({
      requests,
      count: requests.length
    });
  } catch (error) {
    logger.error('Error fetching data requests:', error);
    res.status(500).json({ error: 'Failed to fetch data requests' });
  }
});

/**
 * GET /api/gdpr/data-requests/:id
 * Get a specific data request
 * Admin only
 */
router.get('/data-requests/:id', authenticateAdmin, async (req, res) => {
  try {
    const request = await gdprService.getDataRequestById(req.params.id);
    res.json(request);
  } catch (error) {
    logger.error('Error fetching data request:', error);
    res.status(404).json({ error: error.message || 'Request not found' });
  }
});

/**
 * PUT /api/gdpr/data-requests/:id
 * Update a data request (process it)
 * Admin only
 */
router.put('/data-requests/:id', authenticateAdmin, async (req, res) => {
  try {
    const { status, response, rejectionReason } = req.body;

    const updateData = {
      status,
      response,
      rejectionReason,
      completedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    };

    const updated = await gdprService.updateDataRequest(req.params.id, updateData);

    // Audit log
    await createAuditLog({
      election_id: null,
      user_id: req.user.id,
      action: 'gdpr_request_processed',
      details: { requestId: req.params.id, status, response: response?.substring(0, 100) },
      ip_address: req.ip
    });

    res.json({
      message: 'Request updated successfully',
      request: updated
    });
  } catch (error) {
    logger.error('Error updating data request:', error);
    res.status(500).json({ error: error.message || 'Failed to update request' });
  }
});

// ============================================
// DATA EXPORT & PORTABILITY (Art. 20)
// ============================================

/**
 * GET /api/gdpr/export-my-data
 * Export authenticated user's data
 * Authenticated users
 */
router.get('/export-my-data', authenticateToken, async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const data = await gdprService.exportUserData(req.user.id, format);

    // Audit log
    await createAuditLog({
      election_id: null,
      user_id: req.user.id,
      action: 'gdpr_data_exported',
      details: { format },
      ip_address: req.ip
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="my-data-${Date.now()}.csv"`);
      res.send(data);
    } else {
      res.json(data);
    }
  } catch (error) {
    logger.error('Error exporting user data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * GET /api/gdpr/export-user-data/:userId
 * Export specific user's data (admin)
 * Admin only
 */
router.get('/export-user-data/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const { userId } = req.params;

    const data = await gdprService.exportUserData(userId, format);

    // Audit log
    await createAuditLog({
      election_id: null,
      user_id: req.user.id,
      action: 'gdpr_data_exported',
      details: { targetUserId: userId, format },
      ip_address: req.ip
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="user-${userId}-${Date.now()}.csv"`);
      res.send(data);
    } else {
      res.json(data);
    }
  } catch (error) {
    logger.error('Error exporting user data:', error);
    res.status(500).json({ error: error.message || 'Failed to export data' });
  }
});

/**
 * POST /api/gdpr/handle-access-request/:requestId
 * Process an access request (Art. 15)
 * Admin only
 */
router.post('/handle-access-request/:requestId', authenticateAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const data = await gdprService.handleDataAccessRequest(requestId, userId);

    // Audit log
    await createAuditLog({
      election_id: null,
      user_id: req.user.id,
      action: 'gdpr_access_request_fulfilled',
      details: { requestId, targetUserId: userId },
      ip_address: req.ip
    });

    res.json({
      message: 'Access request fulfilled',
      data
    });
  } catch (error) {
    logger.error('Error handling access request:', error);
    res.status(500).json({ error: error.message || 'Failed to handle access request' });
  }
});

/**
 * POST /api/gdpr/handle-erasure-request/:requestId
 * Process an erasure request (Art. 17)
 * Admin only
 */
router.post('/handle-erasure-request/:requestId', authenticateAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId, fullDeletion = false } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await gdprService.handleDataErasureRequest(requestId, userId, { fullDeletion });

    // Audit log
    await createAuditLog({
      election_id: null,
      user_id: req.user.id,
      action: 'gdpr_erasure_request_fulfilled',
      details: { requestId, targetUserId: userId, fullDeletion },
      ip_address: req.ip
    });

    res.json({
      message: 'Erasure request fulfilled',
      result
    });
  } catch (error) {
    logger.error('Error handling erasure request:', error);
    res.status(500).json({ error: error.message || 'Failed to handle erasure request' });
  }
});

// ============================================
// CONSENT MANAGEMENT (Art. 7)
// ============================================

/**
 * GET /api/gdpr/consents/:userId
 * Get consent history for a user
 * Admin or own user
 */
router.get('/consents/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can only access their own consents, admins can access any
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const consents = await gdprService.getConsentHistory(userId);

    res.json({
      consents,
      count: consents.length
    });
  } catch (error) {
    logger.error('Error fetching consent history:', error);
    res.status(500).json({ error: 'Failed to fetch consent history' });
  }
});

/**
 * POST /api/gdpr/consents
 * Record a new consent
 * Authenticated users
 */
router.post('/consents', authenticateToken, async (req, res) => {
  try {
    const {
      consentType,
      consentVersion,
      consentText,
      purpose,
      granted,
      metadata
    } = req.body;

    const consentData = {
      userId: req.user.id,
      consentType,
      consentVersion,
      consentText,
      purpose,
      granted,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata
    };

    const consent = await gdprService.recordConsent(consentData);

    // Audit log
    await createAuditLog({
      election_id: null,
      user_id: req.user.id,
      action: 'gdpr_consent_recorded',
      details: { consentType, granted },
      ip_address: req.ip
    });

    res.status(201).json({
      message: 'Consent recorded',
      consent
    });
  } catch (error) {
    logger.error('Error recording consent:', error);
    res.status(500).json({ error: 'Failed to record consent' });
  }
});

/**
 * PUT /api/gdpr/consents/:id/withdraw
 * Withdraw a consent
 * Authenticated users
 */
router.put('/consents/:id/withdraw', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const consent = await gdprService.withdrawConsent(id, req.user.id);

    // Audit log
    await createAuditLog({
      election_id: null,
      user_id: req.user.id,
      action: 'gdpr_consent_withdrawn',
      details: { consentId: id, consentType: consent.consent_type },
      ip_address: req.ip
    });

    res.json({
      message: 'Consent withdrawn',
      consent
    });
  } catch (error) {
    logger.error('Error withdrawing consent:', error);
    res.status(500).json({ error: error.message || 'Failed to withdraw consent' });
  }
});

// ============================================
// RETENTION POLICY
// ============================================

/**
 * POST /api/gdpr/enforce-retention
 * Manually enforce retention policy
 * Admin only
 */
router.post('/enforce-retention', authenticateAdmin, async (req, res) => {
  try {
    const results = await gdprService.enforceRetentionPolicy();

    // Audit log
    await createAuditLog({
      election_id: null,
      user_id: req.user.id,
      action: 'gdpr_retention_enforced',
      details: results,
      ip_address: req.ip
    });

    res.json({
      message: 'Retention policy enforced',
      results
    });
  } catch (error) {
    logger.error('Error enforcing retention policy:', error);
    res.status(500).json({ error: 'Failed to enforce retention policy' });
  }
});

// ============================================
// COMPLIANCE REPORTING
// ============================================

/**
 * GET /api/gdpr/compliance-statistics
 * Get compliance statistics
 * Admin only
 */
router.get('/compliance-statistics', authenticateAdmin, async (req, res) => {
  try {
    const stats = await gdprService.getComplianceStatistics();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching compliance statistics:', error);
    res.status(500).json({ error: 'Failed to fetch compliance statistics' });
  }
});

/**
 * GET /api/gdpr/compliance-report
 * Generate compliance report (PDF)
 * Admin only
 * TODO: Implement PDF generation
 */
router.get('/compliance-report', authenticateAdmin, async (req, res) => {
  try {
    // Placeholder for PDF generation
    // Will be implemented in next step
    res.status(501).json({
      message: 'PDF generation not yet implemented',
      note: 'Use /compliance-statistics for now'
    });
  } catch (error) {
    logger.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

export default router;
