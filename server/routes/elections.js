import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { validateElectionCreation } from '../middleware/validation.js';
import { notifyElectionStarted, notifyElectionClosed } from '../services/websocket.js';

const router = express.Router();

/**
 * POST /api/elections - Créer une nouvelle élection
 */
router.post('/', authenticateAdmin, validateElectionCreation, async (req, res) => {
  try {
    const {
      title,
      description,
      voting_type,
      is_secret,
      is_weighted,
      allow_anonymity,
      scheduled_start,
      scheduled_end,
      deferred_counting,
      max_voters,
      quorum_type,
      quorum_value,
      meeting_platform,
      meeting_url,
      meeting_id,
      meeting_password,
      options,
      settings
    } = req.body;

    const electionId = uuidv4();

    // Créer l'élection
    await db.run(`
      INSERT INTO elections (
        id, title, description, type, voting_type, created_by, status,
        is_secret, is_weighted, allow_anonymity, scheduled_start,
        scheduled_end, deferred_counting, max_voters,
        quorum_type, quorum_value,
        meeting_platform, meeting_url, meeting_id, meeting_password,
        settings
      ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [electionId,
      title,
      description || '',
      voting_type, // type = voting_type (pour compatibilité)
      voting_type,
      req.user.id,
      is_secret ? 1 : 0,
      is_weighted ? 1 : 0,
      allow_anonymity ? 1 : 0,
      scheduled_start || null,
      scheduled_end || null,
      deferred_counting ? 1 : 0,
      max_voters || 10000,
      quorum_type || 'none',
      quorum_value || 0,
      meeting_platform || null,
      meeting_url || null,
      meeting_id || null,
      meeting_password || null,
      settings || {}]
    );

    // Ajouter les options
    for (const [index, option] of options.entries()) {
      await db.run(`
        INSERT INTO election_options (id, election_id, option_text, option_order, candidate_name, candidate_info)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [uuidv4(),
        electionId,
        option.option_text,
        index,
        option.candidate_name || '',
        option.candidate_info || '']
      );
    }

    // Log d'audit
    await db.run(`
      INSERT INTO audit_logs (id, election_id, user_id, action, details)
      VALUES (?, ?, ?, 'create_election', ?)
    `, [uuidv4(), electionId, req.user.id, JSON.stringify({ title })]);

    res.status(201).json({
      message: 'Élection créée avec succès',
      electionId
    });
  } catch (error) {
    console.error('Erreur création élection:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'élection' });
  }
});

/**
 * GET /api/elections - Liste des élections de l'admin
 */
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const elections = await db.all(`
      SELECT e.*,
        COUNT(DISTINCT v.id) as total_voters,
        COUNT(DISTINCT CASE WHEN v.has_voted = true THEN v.id END) as voted_count
      FROM elections e
      LEFT JOIN voters v ON e.id = v.election_id
      WHERE e.created_by = ?
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `, [req.user.id]);

    res.json({ elections });
  } catch (error) {
    console.error('Erreur récupération élections:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des élections' });
  }
});

/**
 * GET /api/elections/:id - Détails d'une élection
 */
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?',
      [req.params.id, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    // Récupérer les options
    const options = await db.all('SELECT * FROM election_options WHERE election_id = ? ORDER BY option_order',
      [req.params.id]);

    // Statistiques
    const stats = await db.get(`
      SELECT
        COUNT(*) as total_voters,
        SUM(CASE WHEN has_voted = true THEN 1 ELSE 0 END) as voted_count,
        SUM(CASE WHEN has_voted = false THEN 1 ELSE 0 END) as pending_count
      FROM voters
      WHERE election_id = ?
    `, [req.params.id]);

    res.json({
      election: {
        ...election,
        settings: election.settings || {}
      },
      options,
      stats
    });
  } catch (error) {
    console.error('Erreur récupération élection:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'élection' });
  }
});

/**
 * PUT /api/elections/:id - Mettre à jour une élection
 */
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?',
      [req.params.id, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    if (election.status !== 'draft') {
      return res.status(400).json({ error: 'Impossible de modifier une élection en cours ou terminée' });
    }

    const {
      title,
      description,
      scheduled_start,
      scheduled_end,
      quorum_type,
      quorum_value,
      meeting_platform,
      meeting_url,
      meeting_id,
      meeting_password,
      settings
    } = req.body;

    await db.run(`
      UPDATE elections
      SET title = ?, description = ?, scheduled_start = ?, scheduled_end = ?,
          quorum_type = ?, quorum_value = ?,
          meeting_platform = ?, meeting_url = ?, meeting_id = ?, meeting_password = ?,
          settings = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [title || election.title,
      description !== undefined ? description : election.description,
      scheduled_start || election.scheduled_start,
      scheduled_end || election.scheduled_end,
      quorum_type !== undefined ? quorum_type : election.quorum_type,
      quorum_value !== undefined ? quorum_value : election.quorum_value,
      meeting_platform !== undefined ? meeting_platform : election.meeting_platform,
      meeting_url !== undefined ? meeting_url : election.meeting_url,
      meeting_id !== undefined ? meeting_id : election.meeting_id,
      meeting_password !== undefined ? meeting_password : election.meeting_password,
      settings !== undefined ? settings : (election.settings || {}),
      req.params.id]
    );

    res.json({ message: 'Élection mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur mise à jour élection:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

/**
 * DELETE /api/elections/:id - Supprimer une élection
 */
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?',
      [req.params.id, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    await db.run('DELETE FROM elections WHERE id = ?', [req.params.id]);

    res.json({ message: 'Élection supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression élection:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

/**
 * POST /api/elections/:id/start - Démarrer une élection
 */
router.post('/:id/start', authenticateAdmin, async (req, res) => {
  try {
    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?',
      [req.params.id, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    if (election.status !== 'draft') {
      return res.status(400).json({ error: 'L\'élection a déjà démarré' });
    }

    await db.run(`
      UPDATE elections
      SET status = 'active', actual_start = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.params.id]);

    // Log d'audit
    await db.run(`
      INSERT INTO audit_logs (id, election_id, user_id, action)
      VALUES (?, ?, ?, 'start_election')
    `, [uuidv4(), req.params.id, req.user.id]);

    // Notification: Élection démarrée
    await notifyElectionStarted(req.params.id, req.user.id, election.title);

    res.json({ message: 'Élection démarrée avec succès' });
  } catch (error) {
    console.error('Erreur démarrage élection:', error);
    res.status(500).json({ error: 'Erreur lors du démarrage' });
  }
});

/**
 * POST /api/elections/:id/close - Clôturer une élection
 */
router.post('/:id/close', authenticateAdmin, async (req, res) => {
  try {
    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?',
      [req.params.id, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    if (election.status !== 'active') {
      return res.status(400).json({ error: 'L\'élection n\'est pas active' });
    }

    await db.run(`
      UPDATE elections
      SET status = 'closed', actual_end = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.params.id]);

    // Log d'audit
    await db.run(`
      INSERT INTO audit_logs (id, election_id, user_id, action)
      VALUES (?, ?, ?, 'close_election')
    `, [uuidv4(), req.params.id, req.user.id]);

    // Notification: Élection clôturée
    await notifyElectionClosed(req.params.id, req.user.id, election.title);

    res.json({ message: 'Élection clôturée avec succès' });
  } catch (error) {
    console.error('Erreur clôture élection:', error);
    res.status(500).json({ error: 'Erreur lors de la clôture' });
  }
});

export default router;
