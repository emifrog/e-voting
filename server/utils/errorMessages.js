/**
 * Centralized Error Messages
 * Provides specific, contextual error messages for the application
 * Helps with debugging and improves user experience
 */

export const errorMessages = {
  // Authentication errors
  AUTH: {
    INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
    USER_NOT_FOUND: 'Utilisateur non trouvé',
    EMAIL_ALREADY_EXISTS: 'Cet email est déjà enregistré',
    WEAK_PASSWORD: 'Le mot de passe doit contenir au minimum 12 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial',
    INVALID_EMAIL_FORMAT: 'Format email invalide',
    PASSWORD_MISMATCH: 'Les mots de passe ne correspondent pas',
    TOKEN_EXPIRED: 'Votre session a expiré, veuillez vous reconnecter',
    TOKEN_INVALID: 'Token invalide ou expiré',
    UNAUTHORIZED: 'Vous n\'êtes pas autorisé à effectuer cette action',
    NOT_AUTHENTICATED: 'Authentification requise'
  },

  // Elections errors
  ELECTIONS: {
    NOT_FOUND: 'Élection non trouvée',
    NOT_OWNER: 'Vous n\'êtes pas le propriétaire de cette élection',
    ALREADY_STARTED: 'Impossible de modifier une élection déjà démarrée',
    CANNOT_START: 'L\'élection ne peut pas démarrer sans électeurs ou options',
    CANNOT_CLOSE: 'Impossible de fermer l\'élection : le quorum n\'est pas atteint',
    INVALID_DATES: 'La date de fin doit être après la date de début',
    INVALID_VOTING_TYPE: 'Type de scrutin invalide',
    NO_OPTIONS: 'L\'élection doit avoir au moins 2 options',
    INVALID_STATUS: 'Statut d\'élection invalide'
  },

  // Voters errors
  VOTERS: {
    NOT_FOUND: 'Électeur non trouvé',
    INVALID_EMAIL: 'Format email invalide',
    EMAIL_ALREADY_USED: 'Cet email est déjà utilisé pour cette élection',
    INVALID_WEIGHT: 'Le poids doit être un nombre positif',
    CANNOT_MODIFY_STARTED: 'Impossible de modifier les électeurs après le démarrage',
    CANNOT_DELETE_STARTED: 'Impossible de supprimer les électeurs après le démarrage',
    NO_VOTERS: 'Aucun électeur à traiter',
    INVALID_CSV: 'Format CSV invalide. Colonnes requises: email, name (optionnel: weight)',
    MISSING_EMAIL: 'Email manquant dans la ligne',
    DUPLICATE_EMAIL: 'Cet email est en doublon',
    BULK_DELETE_EMPTY: 'Sélectionnez au least un électeur à supprimer',
    BULK_UPDATE_EMPTY: 'Sélectionnez au least un électeur à mettre à jour'
  },

  // Voting errors
  VOTING: {
    NOT_ACTIVE: 'Le vote n\'est pas actif. L\'élection n\'a pas commencé ou est terminée.',
    ALREADY_VOTED: 'Vous avez déjà voté pour cette élection',
    INVALID_TOKEN: 'Token de vote invalide ou expiré',
    ELECTION_NOT_ACTIVE: 'Cette élection n\'est pas active',
    INVALID_OPTION: 'Option invalide sélectionnée',
    INVALID_VOTE_DATA: 'Les données de vote sont invalides',
    TOO_MANY_CHOICES: 'Trop d\'options sélectionnées pour ce type de scrutin',
    INSUFFICIENT_CHOICES: 'Pas assez d\'options sélectionnées',
    DUPLICATE_CHOICES: 'Options en doublon détectées'
  },

  // Quorum errors
  QUORUM: {
    REQUIREMENT_NOT_MET: 'Le quorum n\'est pas atteint. Participation actuelle insuffisante.',
    INVALID_TYPE: 'Type de quorum invalide',
    INVALID_VALUE: 'Valeur de quorum invalide'
  },

  // Server errors
  SERVER: {
    INTERNAL_ERROR: 'Erreur serveur interne. Veuillez réessayer.',
    DATABASE_ERROR: 'Erreur de base de données. Veuillez réessayer.',
    VALIDATION_ERROR: 'Les données fournies sont invalides',
    REQUEST_FAILED: 'La requête a échoué. Veuillez réessayer.',
    TIMEOUT: 'La requête a dépassé le délai d\'attente. Veuillez réessayer.',
    RATE_LIMITED: 'Trop de requêtes. Veuillez attendre avant de réessayer.'
  },

  // File upload errors
  FILE: {
    MISSING_FILE: 'Aucun fichier sélectionné',
    INVALID_FORMAT: 'Format de fichier invalide. CSV requis.',
    FILE_TOO_LARGE: 'Le fichier est trop volumineux',
    READ_ERROR: 'Erreur lors de la lecture du fichier'
  },

  // Email errors
  EMAIL: {
    SEND_FAILED: 'Erreur lors de l\'envoi de l\'email',
    INVALID_ADDRESS: 'Adresse email invalide',
    BATCH_FAILED: 'Certains emails n\'ont pas pu être envoyés'
  }
};

/**
 * Get a specific error message
 * @param {string} category - Category (e.g., 'AUTH', 'VOTERS')
 * @param {string} key - Message key (e.g., 'EMAIL_ALREADY_EXISTS')
 * @param {object} context - Optional context object for template substitution
 * @returns {string} The error message
 */
export function getErrorMessage(category, key, context = {}) {
  if (!errorMessages[category] || !errorMessages[category][key]) {
    return errorMessages.SERVER.INTERNAL_ERROR;
  }

  let message = errorMessages[category][key];

  // Simple template substitution support
  Object.keys(context).forEach(contextKey => {
    message = message.replace(`{${contextKey}}`, context[contextKey]);
  });

  return message;
}

/**
 * Determine category and key from error object
 * Useful for error handling middleware
 */
export function categorizeError(error) {
  if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE')) {
    return { category: 'VOTERS', key: 'EMAIL_ALREADY_USED' };
  }

  if (error.message && error.message.includes('email')) {
    return { category: 'VOTERS', key: 'INVALID_EMAIL' };
  }

  if (error.message && error.message.includes('weight')) {
    return { category: 'VOTERS', key: 'INVALID_WEIGHT' };
  }

  return { category: 'SERVER', key: 'INTERNAL_ERROR' };
}
