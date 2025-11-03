import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { sendReminderEmail } from '../services/email.js';
import { notifyRemindersSent } from '../services/websocket.js';

const router = express.Router();

/**
 * POST /api/elections/:electionId/send-reminders - Envoyer des rappels
 * Optimized: Batch reminder updates (no N+1 queries)
 */
router.post('/:electionId/send-reminders', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = db.prepare('SELECT * FROM elections WHERE id = ? AND created_by = ?')
      .get(electionId, req.user.id);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    if (election.status !== 'active') {
      return res.status(400).json({ error: 'L\'élection n\'est pas active' });
    }

    // Single query to fetch all pending voters
    const voters = db.prepare(`
      SELECT * FROM voters
      WHERE election_id = ? AND has_voted = 0
    `).all(electionId);

    if (voters.length === 0) {
      return res.json({
        message: 'Aucun électeur en attente',
        sentCount: 0,
        totalPending: 0
      });
    }

    let sentCount = 0;
    const errors = [];

    // Step 1: Send emails in parallel
    const emailResults = await Promise.allSettled(
      voters.map(voter =>
        sendReminderEmail(voter, election)
          .then(result => ({ voter, result }))
      )
    );

    // Step 2: Batch update reminder status for successfully sent emails
    const successfulVoters = [];
    for (const settlement of emailResults) {
      if (settlement.status === 'fulfilled' && settlement.value.result.success) {
        successfulVoters.push(settlement.value.voter.id);
        sentCount++;
      } else {
        const voter = settlement.value?.voter;
        const error = settlement.value?.result?.error || settlement.reason?.message;
        if (voter) {
          errors.push({ email: voter.email, error });
        }
      }
    }

    // Step 3: Batch update reminder flags (single transaction)
    if (successfulVoters.length > 0) {
      try {
        const updateReminder = db.prepare(`
          UPDATE voters
          SET reminder_sent = 1, last_reminder_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);

        const transaction = db.transaction(() => {
          for (const voterId of successfulVoters) {
            updateReminder.run(voterId);
          }
        });
        transaction();
      } catch (error) {
        console.error('Erreur batch update reminders:', error);
      }
    }

    // Log d'audit
    db.prepare(`
      INSERT INTO audit_logs (id, election_id, user_id, action, details)
      VALUES (?, ?, ?, 'send_reminders', ?)
    `).run(
      uuidv4(),
      electionId,
      req.user.id,
      JSON.stringify({ sent: sentCount, total: voters.length, failed: voters.length - sentCount })
    );

    // Notification: Rappels envoyés
    if (sentCount > 0) {
      await notifyRemindersSent(electionId, req.user.id, sentCount, election.title);
    }

    res.json({
      message: `${sentCount} rappel(s) envoyé(s) sur ${voters.length} électeur(s)`,
      sentCount,
      totalPending: voters.length,
      failed: voters.length - sentCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Erreur envoi rappels:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi des rappels' });
  }
});

/**
 * GET /api/elections/:electionId/reminders-status - Statut des rappels
 */
router.get('/:electionId/reminders-status', authenticateAdmin, (req, res) => {
  try {
    const { electionId } = req.params;

    const election = db.prepare('SELECT * FROM elections WHERE id = ? AND created_by = ?')
      .get(electionId, req.user.id);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_voters,
        SUM(CASE WHEN has_voted = 0 THEN 1 ELSE 0 END) as pending_voters,
        SUM(CASE WHEN reminder_sent = 1 THEN 1 ELSE 0 END) as reminder_sent_count,
        MAX(last_reminder_at) as last_reminder_sent
      FROM voters
      WHERE election_id = ?
    `).get(electionId);

    res.json({ stats });
  } catch (error) {
    console.error('Erreur statut rappels:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du statut' });
  }
});

export default router;
