import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import { authenticateVoter } from '../middleware/auth.js';
import { validateVote } from '../middleware/validation.js';
import { encrypt, createBallotHash } from '../utils/crypto.js';
import { validateVote as validateVoteData } from '../services/voting.js';
import { updateQuorumStatus } from '../services/quorum.js';
import { notifyVoteReceived, notifyQuorumReached } from '../services/websocket.js';

const router = express.Router();

/**
 * GET /api/vote/:token - Récupérer les informations de vote
 */
router.get('/:token', authenticateVoter, async (req, res) => {
  try {
    const voter = await db.get(`
      SELECT v.*, e.title, e.description, e.voting_type, e.status, e.is_secret,
             e.scheduled_start, e.scheduled_end, e.allow_anonymity
      FROM voters v
      JOIN elections e ON v.election_id = e.id
      WHERE v.token = ?
    `, [req.voterToken]);

    if (!voter) {
      return res.status(404).json({ error: 'Token invalide' });
    }

    // Vérifier que l'élection est active
    if (voter.status !== 'active') {
      return res.status(400).json({
        error: 'Le vote n\'est pas encore ouvert ou est terminé',
        status: voter.status
      });
    }

    // Vérifier si l'électeur a déjà voté
    if (voter.has_voted) {
      return res.status(400).json({
        error: 'Vous avez déjà voté',
        hasVoted: true,
        votedAt: voter.voted_at
      });
    }

    // Récupérer les options
    const options = await db.all(`
      SELECT id, option_text, candidate_name, candidate_info
      FROM election_options
      WHERE election_id = ?
      ORDER BY option_order
    `, [voter.election_id]);

    res.json({
      election: {
        id: voter.election_id,
        title: voter.title,
        description: voter.description,
        voting_type: voter.voting_type,
        is_secret: voter.is_secret,
        allow_anonymity: voter.allow_anonymity
      },
      voter: {
        name: voter.name,
        email: voter.email,
        has_voted: voter.has_voted
      },
      options
    });
  } catch (error) {
    console.error('Erreur récupération vote:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des informations' });
  }
});

/**
 * POST /api/vote/:token - Soumettre un vote
 */
router.post('/:token', authenticateVoter, validateVote, async (req, res) => {
  try {
    const { vote } = req.body;

    const voter = await db.get(`
      SELECT v.*, e.voting_type, e.status, e.is_secret
      FROM voters v
      JOIN elections e ON v.election_id = e.id
      WHERE v.token = ?
    `, [req.voterToken]);

    if (!voter) {
      return res.status(404).json({ error: 'Token invalide' });
    }

    if (voter.status !== 'active') {
      return res.status(400).json({ error: 'Le vote n\'est pas actif' });
    }

    if (voter.has_voted) {
      return res.status(400).json({ error: 'Vous avez déjà voté' });
    }

    // Récupérer les options pour validation
    const options = await db.all('SELECT * FROM election_options WHERE election_id = ?',
      [voter.election_id]);

    // Valider le vote
    const validation = validateVoteData(vote, voter.voting_type, options);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const timestamp = new Date().toISOString();
    const ipAddress = req.ip;

    if (voter.is_secret) {
      // Vote secret : chiffrer et anonymiser
      const encryptedVote = encrypt({
        vote,
        timestamp,
        voting_type: voter.voting_type
      });

      const ballotHash = createBallotHash(voter.election_id, voter.token, timestamp);

      // Enregistrer le bulletin anonyme
      await db.run(`
        INSERT INTO ballots (id, election_id, ballot_hash, encrypted_vote, voter_weight, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [uuidv4(),
        voter.election_id,
        ballotHash,
        encryptedVote,
        voter.weight,
        ipAddress]
      );
    } else {
      // Vote public
      await db.run(`
        INSERT INTO public_votes (id, election_id, voter_id, vote_data)
        VALUES (?, ?, ?, ?)
      `,
        [uuidv4(),
        voter.election_id,
        voter.id,
        JSON.stringify(vote)]
      );
    }

    // Marquer l'électeur comme ayant voté
    await db.run(`
      UPDATE voters
      SET has_voted = true, voted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [voter.id]);

    // Enregistrer dans la liste d'émargement
    await db.run(`
      INSERT INTO attendance_list (id, election_id, voter_id, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `,
      [uuidv4(),
      voter.election_id,
      voter.id,
      ipAddress,
      req.headers['user-agent'] || '']
    );

    // Récupérer les infos de l'élection pour les notifications
    const election = await db.get('SELECT title, admin_user_id FROM elections WHERE id = ?', [voter.election_id]);

    // Mettre à jour le statut du quorum
    const quorumStatus = await updateQuorumStatus(voter.election_id);

    // Notification: Vote reçu
    await notifyVoteReceived(voter.election_id, election.admin_user_id, election.title);

    // Notification: Quorum atteint (si c'est le cas)
    if (quorumStatus.required && quorumStatus.reached && !quorumStatus.wasReached) {
      await notifyQuorumReached(voter.election_id, election.admin_user_id, election.title);
    }

    res.json({
      message: 'Vote enregistré avec succès',
      timestamp,
      is_secret: voter.is_secret === 1,
      quorum: quorumStatus.required ? {
        reached: quorumStatus.reached,
        current: quorumStatus.current,
        target: quorumStatus.target,
        percentage: quorumStatus.percentage
      } : undefined
    });
  } catch (error) {
    console.error('Erreur soumission vote:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement du vote' });
  }
});

/**
 * GET /api/vote/:token/receipt - Obtenir un reçu de vote
 */
router.get('/:token/receipt', authenticateVoter, (req, res) => {
  try {
    const voter = db.prepare(`
      SELECT v.*, e.title, e.is_secret
      FROM voters v
      JOIN elections e ON v.election_id = e.id
      WHERE v.token = ?
    `).get(req.voterToken);

    if (!voter) {
      return res.status(404).json({ error: 'Token invalide' });
    }

    if (!voter.has_voted) {
      return res.status(400).json({ error: 'Vous n\'avez pas encore voté' });
    }

    const attendance = db.prepare(`
      SELECT marked_at
      FROM attendance_list
      WHERE voter_id = ? AND election_id = ?
    `).get(voter.id, voter.election_id);

    res.json({
      election: voter.title,
      voter_name: voter.name,
      voted_at: voter.voted_at,
      attendance_confirmed: attendance !== null,
      is_secret: voter.is_secret === 1
    });
  } catch (error) {
    console.error('Erreur reçu vote:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du reçu' });
  }
});

export default router;
