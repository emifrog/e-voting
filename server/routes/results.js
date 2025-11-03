import express from 'express';
import db from '../database/db.js';
import { authenticateAdmin, authenticateObserver } from '../middleware/auth.js';
import { decrypt } from '../utils/crypto.js';
import { calculateResults } from '../services/voting.js';
import { getCachedOrFetch, cacheKeys, ttlConfig, invalidateRelated } from '../utils/cache.js';

const router = express.Router();

/**
 * GET /api/elections/:electionId/results - Obtenir les résultats
 * Cached: 30 minutes or until votes change
 */
router.get('/:electionId/results', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    // Vérifier si le dépouillement différé est activé
    if (election.deferred_counting && election.status !== 'closed') {
      return res.status(400).json({
        error: 'Les résultats seront disponibles après la clôture du vote',
        deferred: true
      });
    }

    // Récupérer les options
    const options = await db.all('SELECT * FROM election_options WHERE election_id = ? ORDER BY option_order', [electionId]);

    let ballots = [];

    if (election.is_secret === true) {
      // Votes secrets : déchiffrer
      const encryptedBallots = await db.all('SELECT * FROM ballots WHERE election_id = ?', [electionId]);

      ballots = encryptedBallots.map(ballot => {
        try {
          const decryptedData = decrypt(ballot.encrypted_vote);
          return {
            vote: decryptedData.vote,
            weight: ballot.voter_weight,
            cast_at: ballot.cast_at
          };
        } catch (error) {
          console.error('Erreur déchiffrement bulletin:', error);
          return null;
        }
      }).filter(b => b !== null);
    } else {
      // Votes publics
      const publicVotes = await db.all(`
        SELECT pv.vote_data, v.weight, pv.cast_at, v.name, v.email
        FROM public_votes pv
        JOIN voters v ON pv.voter_id = v.id
        WHERE pv.election_id = ?
      `, [electionId]);

      ballots = publicVotes.map(vote => ({
        vote: vote.vote_data,
        weight: vote.weight,
        cast_at: vote.cast_at,
        voter_name: vote.name,
        voter_email: vote.email
      }));
    }

    // Try to get results from cache
    const cacheKey = cacheKeys.electionResults(electionId);
    const cachedResults = await getCachedOrFetch(cacheKey, async () => {
      // Calculate results
      const calculatedResults = calculateResults(ballots, election.voting_type, options);

      // Get voter statistics
      const voterStats = await db.get(`
        SELECT
          COUNT(*) as total_voters,
          SUM(CASE WHEN has_voted = true THEN 1 ELSE 0 END) as voted_count,
          SUM(weight) as total_weight,
          SUM(CASE WHEN has_voted = true THEN weight ELSE 0 END) as voted_weight
        FROM voters
        WHERE election_id = ?
      `, [electionId]);

      // Compute participation rates
      const stats = {
        ...voterStats,
        participation_rate: voterStats.total_voters > 0
          ? ((voterStats.voted_count / voterStats.total_voters) * 100).toFixed(2)
          : 0,
        weighted_participation: voterStats.total_weight > 0
          ? ((voterStats.voted_weight / voterStats.total_weight) * 100).toFixed(2)
          : 0
      };

      return {
        election: {
          id: election.id,
          title: election.title,
          voting_type: election.voting_type,
          is_secret: election.is_secret === true,
          status: election.status
        },
        stats,
        results: calculatedResults
      };
    }, ttlConfig.RESULTS);

    res.json(cachedResults);
  } catch (error) {
    console.error('Erreur calcul résultats:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des résultats' });
  }
});

/**
 * GET /api/elections/:electionId/turnout - Taux de participation
 */
router.get('/:electionId/turnout', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    const stats = await db.get(`
      SELECT
        COUNT(*) as total_voters,
        SUM(CASE WHEN has_voted = true THEN 1 ELSE 0 END) as voted_count,
        SUM(CASE WHEN has_voted = false THEN 1 ELSE 0 END) as pending_count
      FROM voters
      WHERE election_id = ?
    `, [electionId]);

    // Évolution dans le temps
    const timeline = await db.all(`
      SELECT
        to_char(date_trunc('hour', voted_at), 'YYYY-MM-DD HH24:MI:SS') as hour,
        COUNT(*) as votes_count
      FROM voters
      WHERE election_id = ? AND has_voted = true
      GROUP BY hour
      ORDER BY hour
    `, [electionId]);

    res.json({
      stats: {
        ...stats,
        participation_rate: stats.total_voters > 0
          ? ((stats.voted_count / stats.total_voters) * 100).toFixed(2)
          : 0
      },
      timeline
    });
  } catch (error) {
    console.error('Erreur taux participation:', error);
    res.status(500).json({ error: 'Erreur lors du calcul de la participation' });
  }
});

/**
 * GET /api/elections/:electionId/attendance - Liste d'émargement
 */
router.get('/:electionId/attendance', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    const attendance = await db.all(`
      SELECT
        v.name,
        v.email,
        a.marked_at,
        a.ip_address
      FROM attendance_list a
      JOIN voters v ON a.voter_id = v.id
      WHERE a.election_id = ?
      ORDER BY a.marked_at DESC
    `, [electionId]);

    res.json({ attendance });
  } catch (error) {
    console.error('Erreur liste émargement:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la liste d\'émargement' });
  }
});

/**
 * GET /api/elections/:electionId/audit - Logs d'audit
 */
router.get('/:electionId/audit', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    const logs = await db.all(`
      SELECT
        a.action,
        a.details,
        a.ip_address,
        a.created_at,
        u.name as user_name,
        u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.election_id = ?
      ORDER BY a.created_at DESC
    `, [electionId]);

    res.json({ logs });
  } catch (error) {
    console.error('Erreur logs audit:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des logs' });
  }
});

/**
 * POST /api/elections/:electionId/verify-integrity - Vérifier l'intégrité
 */
router.post('/:electionId/verify-integrity', authenticateAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await db.get('SELECT * FROM elections WHERE id = ? AND created_by = ?', [electionId, req.user.id]);

    if (!election) {
      return res.status(404).json({ error: 'Élection non trouvée' });
    }

    // Vérifier la cohérence des données
    const issues = [];

    // 1. Vérifier que le nombre de bulletins correspond au nombre d'électeurs ayant voté
    const voterCountResult = await db.get('SELECT COUNT(*) as count FROM voters WHERE election_id = ? AND has_voted = true', [electionId]);
    const voterCount = voterCountResult?.count || 0;

    let ballotCount;
    if (election.is_secret === true) {
      const ballotCountResult = await db.get('SELECT COUNT(*) as count FROM ballots WHERE election_id = ?', [electionId]);
      ballotCount = ballotCountResult?.count || 0;
    } else {
      const ballotCountResult = await db.get('SELECT COUNT(*) as count FROM public_votes WHERE election_id = ?', [electionId]);
      ballotCount = ballotCountResult?.count || 0;
    }

    if (voterCount !== ballotCount) {
      issues.push({
        type: 'count_mismatch',
        message: `Incohérence: ${voterCount} électeurs ont voté mais ${ballotCount} bulletins enregistrés`
      });
    }

    // 2. Vérifier les doublons de tokens
    const duplicateTokens = await db.all(`
      SELECT token, COUNT(*) as count
      FROM voters
      WHERE election_id = ?
      GROUP BY token
      HAVING count > 1
    `, [electionId]);

    if (duplicateTokens.length > 0) {
      issues.push({
        type: 'duplicate_tokens',
        message: `${duplicateTokens.length} token(s) en double détecté(s)`
      });
    }

    // 3. Vérifier que tous les bulletins sont valides
    if (election.is_secret === true) {
      const ballots = await db.all('SELECT * FROM ballots WHERE election_id = ?', [electionId]);
      let invalidBallots = 0;

      for (const ballot of ballots) {
        try {
          decrypt(ballot.encrypted_vote);
        } catch (error) {
          invalidBallots++;
        }
      }

      if (invalidBallots > 0) {
        issues.push({
          type: 'invalid_ballots',
          message: `${invalidBallots} bulletin(s) corrompu(s) ou invalide(s)`
        });
      }
    }

    res.json({
      election_id: electionId,
      verified_at: new Date().toISOString(),
      integrity_check: issues.length === 0 ? 'passed' : 'failed',
      issues: issues.length > 0 ? issues : undefined,
      stats: {
        voters_voted: voterCount,
        ballots_count: ballotCount
      }
    });
  } catch (error) {
    console.error('Erreur vérification intégrité:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

export default router;
