import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import * as quorumService from '../services/quorum.js';
import db from '../database/db.js';

const router = express.Router();

/**
 * GET /api/quorum/:electionId/status
 * Obtenir le statut actuel du quorum
 */
router.get('/:electionId/status', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    // Vérifier que l'élection existe
    const election = await db.get(
      'SELECT id FROM elections WHERE id = ?',
      [electionId]
    );

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    const status = await quorumService.calculateQuorumStatus(electionId);

    res.json(status);
  } catch (error) {
    console.error('Erreur statut quorum:', error);
    res.status(500).json({ error: 'Erreur lors du calcul du quorum' });
  }
});

/**
 * GET /api/quorum/:electionId/progress
 * Obtenir l'historique de progression vers le quorum
 */
router.get('/:electionId/progress', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await db.get(
      'SELECT id FROM elections WHERE id = ?',
      [electionId]
    );

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    const progress = await quorumService.getQuorumProgress(electionId);

    res.json(progress);
  } catch (error) {
    console.error('Erreur progression quorum:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la progression' });
  }
});

/**
 * POST /api/quorum/:electionId/update
 * Mettre à jour le statut du quorum (appelé après chaque vote)
 */
router.post('/:electionId/update', async (req, res) => {
  try {
    const { electionId } = req.params;

    const status = await quorumService.updateQuorumStatus(electionId);

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Erreur mise à jour quorum:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du quorum' });
  }
});

/**
 * GET /api/quorum/types
 * Obtenir les types de quorum disponibles
 */
router.get('/types', (req, res) => {
  res.json({
    types: Object.entries(quorumService.QUORUM_TYPES).map(([key, value]) => ({
      value,
      label: getQuorumTypeLabel(value)
    }))
  });
});

/**
 * Helper: Obtenir le label d'un type de quorum
 */
function getQuorumTypeLabel(type) {
  const labels = {
    none: 'Aucun quorum',
    percentage: 'Pourcentage des électeurs inscrits',
    absolute: 'Nombre absolu d\'électeurs',
    weighted: 'Pourcentage du poids total (vote pondéré)'
  };
  return labels[type] || type;
}

export default router;
