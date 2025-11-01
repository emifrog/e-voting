import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import { authenticateAdmin, authenticateObserver } from '../middleware/auth.js';
import { generateToken } from '../utils/crypto.js';
import { sendObserverEmail } from '../services/email.js';

const router = express.Router();

/**
 * POST /api/elections/:electionId/observers - Ajouter un observateur
 */
router.post('/:electionId/observers', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;
    const { email, name, can_see_results, can_see_turnout } = req.body;

    const election = db.prepare('SELECT * FROM elections WHERE id = ? AND created_by = ?')
      .get(electionId, req.user.id);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    const observerId = uuidv4();
    const accessToken = generateToken();

    db.prepare(`
      INSERT INTO observers (id, election_id, email, name, access_token, can_see_results, can_see_turnout)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      observerId,
      electionId,
      email,
      name,
      accessToken,
      can_see_results ? 1 : 0,
      can_see_turnout ? 1 : 0
    );

    // Envoyer l'email à l'observateur
    await sendObserverEmail({ email, name, access_token: accessToken }, election);

    res.status(201).json({
      message: 'Observateur ajouté avec succès',
      observer: {
        id: observerId,
        email,
        name,
        access_token: accessToken
      }
    });
  } catch (error) {
    console.error('Erreur ajout observateur:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'observateur' });
  }
});

/**
 * GET /api/elections/:electionId/observers - Liste des observateurs
 */
router.get('/:electionId/observers', authenticateAdmin, (req, res) => {
  try {
    const { electionId } = req.params;

    const election = db.prepare('SELECT * FROM elections WHERE id = ? AND created_by = ?')
      .get(electionId, req.user.id);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    const observers = db.prepare(`
      SELECT id, email, name, can_see_results, can_see_turnout, created_at
      FROM observers
      WHERE election_id = ?
      ORDER BY created_at DESC
    `).all(electionId);

    res.json({ observers });
  } catch (error) {
    console.error('Erreur récupération observateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des observateurs' });
  }
});

/**
 * DELETE /api/elections/:electionId/observers/:observerId - Supprimer un observateur
 */
router.delete('/:electionId/observers/:observerId', authenticateAdmin, (req, res) => {
  try {
    const { electionId, observerId } = req.params;

    const election = db.prepare('SELECT * FROM elections WHERE id = ? AND created_by = ?')
      .get(electionId, req.user.id);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    db.prepare('DELETE FROM observers WHERE id = ? AND election_id = ?').run(observerId, electionId);

    res.json({ message: 'Observateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression observateur:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

/**
 * GET /api/observer/:token - Tableau de bord observateur
 */
router.get('/view/:token', authenticateObserver, (req, res) => {
  try {
    const observer = db.prepare(`
      SELECT o.*, e.title, e.description, e.status, e.voting_type
      FROM observers o
      JOIN elections e ON o.election_id = e.id
      WHERE o.access_token = ?
    `).get(req.observerToken);

    if (!observer) {
      return res.status(404).json({ error: 'Token observateur invalide' });
    }

    const response = {
      election: {
        id: observer.election_id,
        title: observer.title,
        description: observer.description,
        status: observer.status,
        voting_type: observer.voting_type
      },
      observer: {
        name: observer.name,
        email: observer.email,
        can_see_results: observer.can_see_results === 1,
        can_see_turnout: observer.can_see_turnout === 1
      }
    };

    // Ajouter le taux de participation si autorisé
    if (observer.can_see_turnout === 1) {
      const turnout = db.prepare(`
        SELECT
          COUNT(*) as total_voters,
          SUM(CASE WHEN has_voted = 1 THEN 1 ELSE 0 END) as voted_count
        FROM voters
        WHERE election_id = ?
      `).get(observer.election_id);

      response.turnout = {
        ...turnout,
        participation_rate: turnout.total_voters > 0
          ? ((turnout.voted_count / turnout.total_voters) * 100).toFixed(2)
          : 0
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Erreur tableau de bord observateur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des données' });
  }
});

export default router;
