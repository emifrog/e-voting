/**
 * Key Management Admin Routes
 * Requires admin authentication
 *
 * Endpoints:
 * - GET /key-rotation/status - Get current key rotation status
 * - POST /key-rotation/rotate - Manually trigger key rotation
 * - GET /key-rotation/audit - Get key rotation audit log
 * - GET /key-rotation/health - Check encryption health
 */

import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import {
  getKeyRotationStatus,
  performKeyRotation,
  getKeyRotationAudit,
  verifyEncryptionHealth,
  rotateKeyManually
} from '../services/keyRotationService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/admin/key-rotation/status
 * Get current key rotation status and recommendations
 */
router.get('/key-rotation/status', authenticateAdmin, async (req, res) => {
  try {
    const status = getKeyRotationStatus();

    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Failed to get key rotation status:', error);
    res.status(500).json({
      error: 'Failed to get key rotation status',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/key-rotation/rotate
 * Manually trigger a key rotation
 * Body: { reason?: string }
 */
router.post('/key-rotation/rotate', authenticateAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    logger.info(`Key rotation requested by admin ${req.user.id}: ${reason || 'No reason provided'}`);

    const result = await rotateKeyManually(req.user.id, reason || 'Manual rotation by admin');

    res.json({
      success: true,
      message: 'Key rotation completed successfully',
      result
    });
  } catch (error) {
    logger.error('Key rotation failed:', error);
    res.status(500).json({
      error: 'Key rotation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/key-rotation/audit
 * Get key rotation audit log
 * Query: ?limit=50
 */
router.get('/key-rotation/audit', authenticateAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500); // Cap at 500
    const audit = getKeyRotationAudit(limit);

    res.json({
      success: true,
      audit
    });
  } catch (error) {
    logger.error('Failed to get key rotation audit:', error);
    res.status(500).json({
      error: 'Failed to get key rotation audit',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/key-rotation/health
 * Check encryption health and verify all keys work
 */
router.get('/key-rotation/health', authenticateAdmin, async (req, res) => {
  try {
    const health = await verifyEncryptionHealth();

    const statusCode = health.status === 'healthy' ? 200 : 500;
    res.status(statusCode).json({
      success: health.status === 'healthy',
      health
    });
  } catch (error) {
    logger.error('Encryption health check failed:', error);
    res.status(500).json({
      error: 'Encryption health check failed',
      message: error.message
    });
  }
});

export default router;
