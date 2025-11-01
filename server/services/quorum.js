import db from '../database/db.js';

/**
 * Service de gestion du quorum pour les élections
 */

/**
 * Types de quorum supportés
 */
export const QUORUM_TYPES = {
  NONE: 'none',           // Pas de quorum
  PERCENTAGE: 'percentage', // Pourcentage des électeurs inscrits
  ABSOLUTE: 'absolute',    // Nombre absolu d'électeurs
  WEIGHTED: 'weighted'     // Pourcentage du poids total (pour vote pondéré)
};

/**
 * Calcule le statut actuel du quorum
 */
export const calculateQuorumStatus = async (electionId) => {
  // Récupérer les informations de l'élection
  const election = await db.get(
    'SELECT quorum_type, quorum_value, is_weighted, max_voters FROM elections WHERE id = ?',
    [electionId]
  );

  if (!election || election.quorum_type === QUORUM_TYPES.NONE) {
    return {
      required: false,
      reached: true,
      current: 0,
      target: 0,
      percentage: 0
    };
  }

  // Compter le nombre total d'électeurs inscrits
  const totalVoters = await db.get(
    'SELECT COUNT(*) as count FROM voters WHERE election_id = ?',
    [electionId]
  );

  // Compter les votes
  const votedCount = await db.get(
    'SELECT COUNT(*) as count FROM voters WHERE election_id = ? AND has_voted = true',
    [electionId]
  );

  let current = votedCount.count;
  let target = 0;
  let percentage = 0;

  switch (election.quorum_type) {
    case QUORUM_TYPES.PERCENTAGE:
      target = Math.ceil((totalVoters.count * election.quorum_value) / 100);
      percentage = (current / totalVoters.count) * 100;
      break;

    case QUORUM_TYPES.ABSOLUTE:
      target = election.quorum_value;
      percentage = (current / target) * 100;
      break;

    case QUORUM_TYPES.WEIGHTED:
      // Calculer le poids total des électeurs
      const totalWeight = await db.get(
        'SELECT SUM(weight) as total FROM voters WHERE election_id = ?',
        [electionId]
      );

      // Calculer le poids des votants
      const votedWeight = await db.get(
        'SELECT SUM(weight) as total FROM voters WHERE election_id = ? AND has_voted = true',
        [electionId]
      );

      current = votedWeight.total || 0;
      target = (totalWeight.total * election.quorum_value) / 100;
      percentage = (current / totalWeight.total) * 100;
      break;
  }

  const reached = current >= target;

  return {
    required: true,
    reached,
    current,
    target,
    percentage: Math.round(percentage * 100) / 100,
    type: election.quorum_type,
    totalVoters: totalVoters.count
  };
};

/**
 * Met à jour le statut du quorum dans la base de données
 */
export const updateQuorumStatus = async (electionId) => {
  const status = await calculateQuorumStatus(electionId);

  if (status.required && status.reached) {
    const election = await db.get(
      'SELECT quorum_reached FROM elections WHERE id = ?',
      [electionId]
    );

    // Si le quorum vient d'être atteint, on l'enregistre
    if (!election.quorum_reached) {
      await db.run(
        'UPDATE elections SET quorum_reached = true, quorum_reached_at = CURRENT_TIMESTAMP WHERE id = ?',
        [electionId]
      );
    }
  }

  return status;
};

/**
 * Vérifie si le quorum est atteint en temps réel
 */
export const checkQuorumReached = async (electionId) => {
  const status = await calculateQuorumStatus(electionId);
  return status.reached;
};

/**
 * Obtient l'historique de progression vers le quorum
 */
export const getQuorumProgress = async (electionId) => {
  // Récupérer l'historique des votes avec timestamps
  const votes = await db.all(
    `SELECT
      DATE_TRUNC('minute', voted_at) as time_slot,
      COUNT(*) as vote_count,
      SUM(weight) as total_weight
    FROM voters
    WHERE election_id = ? AND has_voted = true
    GROUP BY time_slot
    ORDER BY time_slot ASC`,
    [electionId]
  );

  const status = await calculateQuorumStatus(electionId);

  let cumulative = 0;
  const progress = votes.map(vote => {
    cumulative += vote.vote_count;
    return {
      timestamp: vote.time_slot,
      count: cumulative,
      percentage: (cumulative / status.totalVoters) * 100,
      weight: vote.total_weight
    };
  });

  return {
    current: status,
    history: progress
  };
};

export default {
  QUORUM_TYPES,
  calculateQuorumStatus,
  updateQuorumStatus,
  checkQuorumReached,
  getQuorumProgress
};
