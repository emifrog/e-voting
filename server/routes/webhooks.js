/**
 * Webhook Routes
 *
 * API endpoints for managing webhook configurations (Slack/Teams)
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/supabase.js';
import { authenticateToken } from '../middleware/auth.js';
import { testWebhook, WEBHOOK_EVENTS } from '../services/webhookService.js';
import { createAuditLog } from '../services/auditLog.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/webhooks/:electionId
 * Get all webhooks for an election
 */
router.get('/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;
    const userId = req.user.id;

    // Verify user owns the election
    const electionCheck = await query(
      'SELECT id FROM elections WHERE id = $1 AND created_by = $2',
      [electionId, userId]
    );

    if (electionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Élection non trouvée' });
    }

    const result = await query(`
      SELECT
        id,
        platform,
        webhook_url,
        events,
        is_active,
        last_triggered_at,
        created_at
      FROM webhook_configurations
      WHERE election_id = $1
      ORDER BY created_at DESC
    `, [electionId]);

    // Parse events JSON
    const webhooks = result.rows.map(webhook => ({
      ...webhook,
      events: JSON.parse(webhook.events)
    }));

    res.json({ webhooks });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/webhooks/:electionId
 * Create a new webhook configuration
 */
router.post('/:electionId', async (req, res) => {
  try {
    const { electionId } = req.params;
    const { platform, webhookUrl, events } = req.body;
    const userId = req.user.id;

    // Validation
    if (!platform || !['slack', 'teams'].includes(platform)) {
      return res.status(400).json({ message: 'Platform invalide (doit être "slack" ou "teams")' });
    }

    if (!webhookUrl || !webhookUrl.startsWith('https://')) {
      return res.status(400).json({ message: 'URL de webhook invalide (doit commencer par https://)' });
    }

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ message: 'Au moins un événement doit être sélectionné' });
    }

    // Verify all events are valid
    const validEvents = Object.values(WEBHOOK_EVENTS);
    const invalidEvents = events.filter(e => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        message: `Événements invalides: ${invalidEvents.join(', ')}`
      });
    }

    // Verify user owns the election
    const electionCheck = await query(
      'SELECT id FROM elections WHERE id = $1 AND created_by = $2',
      [electionId, userId]
    );

    if (electionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Élection non trouvée' });
    }

    const webhookId = uuidv4();

    await query(`
      INSERT INTO webhook_configurations (
        id, election_id, platform, webhook_url, events, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      webhookId,
      electionId,
      platform,
      webhookUrl,
      JSON.stringify(events),
      userId
    ]);

    // Audit log
    await createAuditLog({
      election_id: electionId,
      user_id: userId,
      action: 'webhook_created',
      details: { platform, events, webhookId },
      ip_address: req.ip
    });

    res.status(201).json({
      message: 'Webhook créé avec succès',
      webhook: {
        id: webhookId,
        platform,
        webhookUrl,
        events,
        isActive: true,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * PUT /api/webhooks/:electionId/:webhookId
 * Update a webhook configuration
 */
router.put('/:electionId/:webhookId', async (req, res) => {
  try {
    const { electionId, webhookId } = req.params;
    const { webhookUrl, events, isActive } = req.body;
    const userId = req.user.id;

    // Verify user owns the election
    const electionCheck = await query(
      'SELECT id FROM elections WHERE id = $1 AND created_by = $2',
      [electionId, userId]
    );

    if (electionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Élection non trouvée' });
    }

    // Verify webhook exists
    const webhookCheck = await query(
      'SELECT id FROM webhook_configurations WHERE id = $1 AND election_id = $2',
      [webhookId, electionId]
    );

    if (webhookCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Webhook non trouvé' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (webhookUrl !== undefined) {
      if (!webhookUrl.startsWith('https://')) {
        return res.status(400).json({ message: 'URL de webhook invalide' });
      }
      updates.push(`webhook_url = $${paramIndex++}`);
      values.push(webhookUrl);
    }

    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ message: 'Au moins un événement doit être sélectionné' });
      }
      updates.push(`events = $${paramIndex++}`);
      values.push(JSON.stringify(events));
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Aucune modification fournie' });
    }

    values.push(webhookId);

    await query(`
      UPDATE webhook_configurations
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `, values);

    // Audit log
    await createAuditLog({
      election_id: electionId,
      user_id: userId,
      action: 'webhook_updated',
      details: { webhookId, updates: Object.keys(req.body) },
      ip_address: req.ip
    });

    res.json({ message: 'Webhook mis à jour avec succès' });
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/webhooks/:electionId/:webhookId
 * Delete a webhook configuration
 */
router.delete('/:electionId/:webhookId', async (req, res) => {
  try {
    const { electionId, webhookId } = req.params;
    const userId = req.user.id;

    // Verify user owns the election
    const electionCheck = await query(
      'SELECT id FROM elections WHERE id = $1 AND created_by = $2',
      [electionId, userId]
    );

    if (electionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Élection non trouvée' });
    }

    const result = await query(
      'DELETE FROM webhook_configurations WHERE id = $1 AND election_id = $2',
      [webhookId, electionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Webhook non trouvé' });
    }

    // Audit log
    await createAuditLog({
      election_id: electionId,
      user_id: userId,
      action: 'webhook_deleted',
      details: { webhookId },
      ip_address: req.ip
    });

    res.json({ message: 'Webhook supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/webhooks/test
 * Test a webhook configuration
 */
router.post('/test', async (req, res) => {
  try {
    const { platform, webhookUrl } = req.body;

    if (!platform || !['slack', 'teams'].includes(platform)) {
      return res.status(400).json({ message: 'Platform invalide' });
    }

    if (!webhookUrl || !webhookUrl.startsWith('https://')) {
      return res.status(400).json({ message: 'URL de webhook invalide' });
    }

    const result = await testWebhook(platform, webhookUrl);

    if (result.success) {
      res.json({
        message: 'Test réussi ! Vérifiez votre canal Slack/Teams.',
        success: true
      });
    } else {
      res.status(400).json({
        message: 'Échec du test de webhook',
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/webhooks/events
 * Get list of available webhook events
 */
router.get('/events/list', async (req, res) => {
  try {
    const events = Object.entries(WEBHOOK_EVENTS).map(([key, value]) => ({
      id: value,
      name: key.split('_').map(word =>
        word.charAt(0) + word.slice(1).toLowerCase()
      ).join(' '),
      description: getEventDescription(value)
    }));

    res.json({ events });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

function getEventDescription(event) {
  const descriptions = {
    [WEBHOOK_EVENTS.ELECTION_CREATED]: 'Une nouvelle élection a été créée',
    [WEBHOOK_EVENTS.ELECTION_STARTED]: 'Une élection a été démarrée',
    [WEBHOOK_EVENTS.ELECTION_CLOSED]: 'Une élection a été fermée',
    [WEBHOOK_EVENTS.QUORUM_REACHED]: 'Le quorum a été atteint',
    [WEBHOOK_EVENTS.VOTE_CAST]: 'Un vote a été enregistré',
    [WEBHOOK_EVENTS.VOTER_ADDED]: 'Des votants ont été ajoutés',
    [WEBHOOK_EVENTS.SECURITY_ALERT]: 'Une alerte de sécurité a été déclenchée'
  };

  return descriptions[event] || 'Événement système';
}

export default router;
