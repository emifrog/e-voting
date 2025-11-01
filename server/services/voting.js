/**
 * Service de gestion des différents types de vote
 */

/**
 * Valide un vote selon le type de scrutin
 */
export const validateVote = (voteData, votingType, options) => {
  switch (votingType) {
    case 'simple':
      return validateSimpleVote(voteData, options);
    case 'approval':
      return validateApprovalVote(voteData, options);
    case 'preference':
      return validatePreferenceVote(voteData, options);
    case 'list':
      return validateListVote(voteData, options);
    default:
      return { valid: false, error: 'Type de vote invalide' };
  }
};

/**
 * Vote simple : un seul choix
 */
const validateSimpleVote = (voteData, options) => {
  if (typeof voteData !== 'string') {
    return { valid: false, error: 'Le vote doit être une chaîne de caractères' };
  }

  const validOptionIds = options.map(opt => opt.id);
  if (!validOptionIds.includes(voteData)) {
    return { valid: false, error: 'Option invalide' };
  }

  return { valid: true };
};

/**
 * Vote par approbation : plusieurs choix possibles
 */
const validateApprovalVote = (voteData, options) => {
  if (!Array.isArray(voteData)) {
    return { valid: false, error: 'Le vote doit être un tableau' };
  }

  if (voteData.length === 0) {
    return { valid: false, error: 'Au moins un choix requis' };
  }

  const validOptionIds = options.map(opt => opt.id);
  for (const optionId of voteData) {
    if (!validOptionIds.includes(optionId)) {
      return { valid: false, error: 'Option invalide détectée' };
    }
  }

  // Vérifier les doublons
  if (new Set(voteData).size !== voteData.length) {
    return { valid: false, error: 'Options en double détectées' };
  }

  return { valid: true };
};

/**
 * Vote par ordre de préférence : classement des options
 */
const validatePreferenceVote = (voteData, options) => {
  if (!Array.isArray(voteData)) {
    return { valid: false, error: 'Le vote doit être un tableau ordonné' };
  }

  if (voteData.length !== options.length) {
    return { valid: false, error: 'Toutes les options doivent être classées' };
  }

  const validOptionIds = options.map(opt => opt.id);
  for (const optionId of voteData) {
    if (!validOptionIds.includes(optionId)) {
      return { valid: false, error: 'Option invalide détectée' };
    }
  }

  // Vérifier que chaque option apparaît exactement une fois
  if (new Set(voteData).size !== voteData.length) {
    return { valid: false, error: 'Chaque option doit apparaître exactement une fois' };
  }

  return { valid: true };
};

/**
 * Scrutin de liste : vote pour une liste complète
 */
const validateListVote = (voteData, options) => {
  if (typeof voteData !== 'object' || voteData === null) {
    return { valid: false, error: 'Le vote doit être un objet' };
  }

  const { listId, preferences } = voteData;

  if (!listId) {
    return { valid: false, error: 'ID de liste requis' };
  }

  const validOptionIds = options.map(opt => opt.id);
  if (!validOptionIds.includes(listId)) {
    return { valid: false, error: 'Liste invalide' };
  }

  // Vérifier les préférences si présentes
  if (preferences) {
    if (!Array.isArray(preferences)) {
      return { valid: false, error: 'Les préférences doivent être un tableau' };
    }
  }

  return { valid: true };
};

/**
 * Calcule les résultats selon le type de vote
 */
export const calculateResults = (ballots, votingType, options) => {
  switch (votingType) {
    case 'simple':
      return calculateSimpleResults(ballots, options);
    case 'approval':
      return calculateApprovalResults(ballots, options);
    case 'preference':
      return calculatePreferenceResults(ballots, options);
    case 'list':
      return calculateListResults(ballots, options);
    default:
      return null;
  }
};

/**
 * Résultats vote simple
 */
const calculateSimpleResults = (ballots, options) => {
  const counts = {};
  options.forEach(opt => {
    counts[opt.id] = { votes: 0, weight: 0, percentage: 0 };
  });

  let totalWeight = 0;

  ballots.forEach(ballot => {
    const vote = ballot.vote;
    if (counts[vote]) {
      counts[vote].votes += 1;
      counts[vote].weight += ballot.weight || 1;
      totalWeight += ballot.weight || 1;
    }
  });

  // Calculer les pourcentages
  Object.keys(counts).forEach(optionId => {
    counts[optionId].percentage = totalWeight > 0
      ? (counts[optionId].weight / totalWeight) * 100
      : 0;
  });

  return {
    type: 'simple',
    totalVotes: ballots.length,
    totalWeight,
    results: options.map(opt => ({
      option: opt,
      votes: counts[opt.id].votes,
      weight: counts[opt.id].weight,
      percentage: counts[opt.id].percentage.toFixed(2)
    })).sort((a, b) => b.weight - a.weight)
  };
};

/**
 * Résultats vote par approbation
 */
const calculateApprovalResults = (ballots, options) => {
  const counts = {};
  options.forEach(opt => {
    counts[opt.id] = { approvals: 0, weight: 0, percentage: 0 };
  });

  let totalWeight = 0;

  ballots.forEach(ballot => {
    const votes = ballot.vote;
    const weight = ballot.weight || 1;
    totalWeight += weight;

    votes.forEach(optionId => {
      if (counts[optionId]) {
        counts[optionId].approvals += 1;
        counts[optionId].weight += weight;
      }
    });
  });

  // Calculer les pourcentages
  Object.keys(counts).forEach(optionId => {
    counts[optionId].percentage = totalWeight > 0
      ? (counts[optionId].weight / totalWeight) * 100
      : 0;
  });

  return {
    type: 'approval',
    totalVotes: ballots.length,
    totalWeight,
    results: options.map(opt => ({
      option: opt,
      approvals: counts[opt.id].approvals,
      weight: counts[opt.id].weight,
      percentage: counts[opt.id].percentage.toFixed(2)
    })).sort((a, b) => b.weight - a.weight)
  };
};

/**
 * Résultats vote par préférence (méthode Borda)
 */
const calculatePreferenceResults = (ballots, options) => {
  const scores = {};
  options.forEach(opt => {
    scores[opt.id] = { score: 0, firstPlace: 0 };
  });

  const numOptions = options.length;

  ballots.forEach(ballot => {
    const preferences = ballot.vote;
    const weight = ballot.weight || 1;

    preferences.forEach((optionId, index) => {
      const points = (numOptions - index) * weight;
      if (scores[optionId]) {
        scores[optionId].score += points;
        if (index === 0) {
          scores[optionId].firstPlace += 1;
        }
      }
    });
  });

  return {
    type: 'preference',
    totalVotes: ballots.length,
    results: options.map(opt => ({
      option: opt,
      score: scores[opt.id].score,
      firstPlace: scores[opt.id].firstPlace
    })).sort((a, b) => b.score - a.score)
  };
};

/**
 * Résultats scrutin de liste
 */
const calculateListResults = (ballots, options) => {
  const counts = {};
  options.forEach(opt => {
    counts[opt.id] = { votes: 0, weight: 0, percentage: 0 };
  });

  let totalWeight = 0;

  ballots.forEach(ballot => {
    const { listId } = ballot.vote;
    const weight = ballot.weight || 1;

    if (counts[listId]) {
      counts[listId].votes += 1;
      counts[listId].weight += weight;
      totalWeight += weight;
    }
  });

  // Calculer les pourcentages
  Object.keys(counts).forEach(optionId => {
    counts[optionId].percentage = totalWeight > 0
      ? (counts[optionId].weight / totalWeight) * 100
      : 0;
  });

  return {
    type: 'list',
    totalVotes: ballots.length,
    totalWeight,
    results: options.map(opt => ({
      option: opt,
      votes: counts[opt.id].votes,
      weight: counts[opt.id].weight,
      percentage: counts[opt.id].percentage.toFixed(2)
    })).sort((a, b) => b.weight - a.weight)
  };
};
