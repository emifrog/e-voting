/**
 * Tests for Webhook Routes
 *
 * Tests cover:
 * - GET /api/webhooks/:electionId - List webhooks
 * - POST /api/webhooks/:electionId - Create webhook
 * - PUT /api/webhooks/:electionId/:webhookId - Update webhook
 * - DELETE /api/webhooks/:electionId/:webhookId - Delete webhook
 * - POST /api/webhooks/test - Test webhook
 * - GET /api/webhooks/events/list - List available events
 * - Authentication
 * - Authorization (election ownership)
 * - Input validation
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import webhooksRoutes from '../webhooks.js';
import { authenticateToken } from '../../middleware/auth.js';

// Mock dependencies
vi.mock('../../database/supabase.js', () => ({
  query: vi.fn()
}));

vi.mock('../../middleware/auth.js', () => ({
  authenticateToken: vi.fn((req, res, next) => {
    req.user = { id: 'user-123', email: 'test@example.com' };
    next();
  })
}));

vi.mock('../../services/webhookService.js', () => ({
  testWebhook: vi.fn(),
  WEBHOOK_EVENTS: {
    ELECTION_CREATED: 'election_created',
    ELECTION_STARTED: 'election_started',
    ELECTION_CLOSED: 'election_closed',
    QUORUM_REACHED: 'quorum_reached',
    VOTE_CAST: 'vote_cast',
    VOTER_ADDED: 'voter_added',
    SECURITY_ALERT: 'security_alert'
  }
}));

vi.mock('../../services/auditLog.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue({
    id: 'audit-1',
    hash: 'hash-1',
    prevHash: 'hash-0',
    timestamp: new Date().toISOString(),
    verified: true
  })
}));

import { query } from '../../database/supabase.js';
import { testWebhook, WEBHOOK_EVENTS } from '../../services/webhookService.js';
import { createAuditLog } from '../../services/auditLog.js';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/webhooks', webhooksRoutes);
  return app;
};

describe('Webhook Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/webhooks/:electionId', () => {
    it('should return webhooks for an election', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          platform: 'slack',
          webhook_url: 'https://hooks.slack.com/services/TEST',
          events: JSON.stringify(['election_started', 'election_closed']),
          is_active: true,
          last_triggered_at: null,
          created_at: new Date().toISOString()
        }
      ];

      query
        .mockResolvedValueOnce({ rows: [{ id: 'election-123' }] }) // Election check
        .mockResolvedValueOnce({ rows: mockWebhooks }); // Webhooks query

      const response = await request(app)
        .get('/api/webhooks/election-123')
        .expect(200);

      expect(response.body.webhooks).toHaveLength(1);
      expect(response.body.webhooks[0].id).toBe('webhook-1');
      expect(response.body.webhooks[0].events).toEqual(['election_started', 'election_closed']);
    });

    it('should return 404 if election not found', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // No election found

      const response = await request(app)
        .get('/api/webhooks/election-123')
        .expect(404);

      expect(response.body.message).toBe('Élection non trouvée');
    });

    it('should return 500 on database error', async () => {
      query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/webhooks/election-123')
        .expect(500);

      expect(response.body.message).toBe('Erreur serveur');
    });
  });

  describe('POST /api/webhooks/:electionId', () => {
    it('should create a new webhook', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 'election-123' }] }) // Election check
        .mockResolvedValueOnce({}); // Insert webhook

      const webhookData = {
        platform: 'slack',
        webhookUrl: 'https://hooks.slack.com/services/TEST',
        events: ['election_started', 'election_closed']
      };

      const response = await request(app)
        .post('/api/webhooks/election-123')
        .send(webhookData)
        .expect(201);

      expect(response.body.message).toBe('Webhook créé avec succès');
      expect(response.body.webhook).toBeDefined();
      expect(response.body.webhook.platform).toBe('slack');
      expect(createAuditLog).toHaveBeenCalled();
    });

    it('should validate platform', async () => {
      const webhookData = {
        platform: 'invalid',
        webhookUrl: 'https://hooks.slack.com/services/TEST',
        events: ['election_started']
      };

      const response = await request(app)
        .post('/api/webhooks/election-123')
        .send(webhookData)
        .expect(400);

      expect(response.body.message).toContain('Platform invalide');
    });

    it('should validate webhook URL starts with https', async () => {
      const webhookData = {
        platform: 'slack',
        webhookUrl: 'http://hooks.slack.com/services/TEST',
        events: ['election_started']
      };

      const response = await request(app)
        .post('/api/webhooks/election-123')
        .send(webhookData)
        .expect(400);

      expect(response.body.message).toContain('URL de webhook invalide');
    });

    it('should validate events array is not empty', async () => {
      const webhookData = {
        platform: 'slack',
        webhookUrl: 'https://hooks.slack.com/services/TEST',
        events: []
      };

      const response = await request(app)
        .post('/api/webhooks/election-123')
        .send(webhookData)
        .expect(400);

      expect(response.body.message).toContain('Au moins un événement');
    });

    it('should validate event types', async () => {
      const webhookData = {
        platform: 'slack',
        webhookUrl: 'https://hooks.slack.com/services/TEST',
        events: ['invalid_event', 'election_started']
      };

      const response = await request(app)
        .post('/api/webhooks/election-123')
        .send(webhookData)
        .expect(400);

      expect(response.body.message).toContain('Événements invalides');
    });

    it('should return 404 if election not found', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // No election found

      const webhookData = {
        platform: 'slack',
        webhookUrl: 'https://hooks.slack.com/services/TEST',
        events: ['election_started']
      };

      const response = await request(app)
        .post('/api/webhooks/election-123')
        .send(webhookData)
        .expect(404);

      expect(response.body.message).toBe('Élection non trouvée');
    });
  });

  describe('PUT /api/webhooks/:electionId/:webhookId', () => {
    it('should update webhook', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 'election-123' }] }) // Election check
        .mockResolvedValueOnce({ rows: [{ id: 'webhook-1' }] }) // Webhook check
        .mockResolvedValueOnce({}); // Update webhook

      const updateData = {
        webhookUrl: 'https://hooks.slack.com/services/UPDATED',
        events: ['election_started', 'quorum_reached'],
        isActive: false
      };

      const response = await request(app)
        .put('/api/webhooks/election-123/webhook-1')
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Webhook mis à jour avec succès');
      expect(createAuditLog).toHaveBeenCalled();
    });

    it('should return 404 if webhook not found', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 'election-123' }] }) // Election check
        .mockResolvedValueOnce({ rows: [] }); // No webhook found

      const response = await request(app)
        .put('/api/webhooks/election-123/webhook-1')
        .send({ isActive: false })
        .expect(404);

      expect(response.body.message).toBe('Webhook non trouvé');
    });

    it('should return 400 if no updates provided', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 'election-123' }] }) // Election check
        .mockResolvedValueOnce({ rows: [{ id: 'webhook-1' }] }); // Webhook check

      const response = await request(app)
        .put('/api/webhooks/election-123/webhook-1')
        .send({})
        .expect(400);

      expect(response.body.message).toBe('Aucune modification fournie');
    });

    it('should validate webhook URL on update', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 'election-123' }] }) // Election check
        .mockResolvedValueOnce({ rows: [{ id: 'webhook-1' }] }); // Webhook check

      const response = await request(app)
        .put('/api/webhooks/election-123/webhook-1')
        .send({ webhookUrl: 'http://invalid.com' })
        .expect(400);

      expect(response.body.message).toContain('URL de webhook invalide');
    });
  });

  describe('DELETE /api/webhooks/:electionId/:webhookId', () => {
    it('should delete webhook', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 'election-123' }] }) // Election check
        .mockResolvedValueOnce({ rowCount: 1 }); // Delete webhook

      const response = await request(app)
        .delete('/api/webhooks/election-123/webhook-1')
        .expect(200);

      expect(response.body.message).toBe('Webhook supprimé avec succès');
      expect(createAuditLog).toHaveBeenCalled();
    });

    it('should return 404 if webhook not found', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 'election-123' }] }) // Election check
        .mockResolvedValueOnce({ rowCount: 0 }); // No webhook deleted

      const response = await request(app)
        .delete('/api/webhooks/election-123/webhook-1')
        .expect(404);

      expect(response.body.message).toBe('Webhook non trouvé');
    });

    it('should return 404 if election not found', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // No election found

      const response = await request(app)
        .delete('/api/webhooks/election-123/webhook-1')
        .expect(404);

      expect(response.body.message).toBe('Élection non trouvée');
    });
  });

  describe('POST /api/webhooks/test', () => {
    it('should test webhook successfully', async () => {
      testWebhook.mockResolvedValueOnce({ success: true });

      const testData = {
        platform: 'slack',
        webhookUrl: 'https://hooks.slack.com/services/TEST'
      };

      const response = await request(app)
        .post('/api/webhooks/test')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Test réussi');
      expect(testWebhook).toHaveBeenCalledWith('slack', testData.webhookUrl);
    });

    it('should handle test failure', async () => {
      testWebhook.mockResolvedValueOnce({
        success: false,
        error: 'Connection failed'
      });

      const testData = {
        platform: 'slack',
        webhookUrl: 'https://hooks.slack.com/services/TEST'
      };

      const response = await request(app)
        .post('/api/webhooks/test')
        .send(testData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Connection failed');
    });

    it('should validate platform', async () => {
      const testData = {
        platform: 'invalid',
        webhookUrl: 'https://hooks.slack.com/services/TEST'
      };

      const response = await request(app)
        .post('/api/webhooks/test')
        .send(testData)
        .expect(400);

      expect(response.body.message).toContain('Platform invalide');
    });

    it('should validate webhook URL', async () => {
      const testData = {
        platform: 'slack',
        webhookUrl: 'http://invalid.com'
      };

      const response = await request(app)
        .post('/api/webhooks/test')
        .send(testData)
        .expect(400);

      expect(response.body.message).toContain('URL de webhook invalide');
    });
  });

  describe('GET /api/webhooks/events/list', () => {
    it('should return list of available events', async () => {
      const response = await request(app)
        .get('/api/webhooks/events/list')
        .expect(200);

      expect(response.body.events).toBeDefined();
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body.events.length).toBeGreaterThan(0);

      const firstEvent = response.body.events[0];
      expect(firstEvent).toHaveProperty('id');
      expect(firstEvent).toHaveProperty('name');
      expect(firstEvent).toHaveProperty('description');
    });

    it('should include all event types', async () => {
      const response = await request(app)
        .get('/api/webhooks/events/list')
        .expect(200);

      const eventIds = response.body.events.map(e => e.id);
      expect(eventIds).toContain('election_started');
      expect(eventIds).toContain('election_closed');
      expect(eventIds).toContain('quorum_reached');
      expect(eventIds).toContain('vote_cast');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all routes', async () => {
      // Temporarily mock auth to reject
      authenticateToken.mockImplementationOnce((req, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      await request(app)
        .get('/api/webhooks/election-123')
        .expect(401);

      // Restore mock
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 'user-123', email: 'test@example.com' };
        next();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      query.mockRejectedValueOnce(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/webhooks/election-123')
        .expect(500);

      expect(response.body.message).toBe('Erreur serveur');
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      query.mockRejectedValueOnce(new Error('Test error'));

      await request(app)
        .get('/api/webhooks/election-123')
        .expect(500);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
