/**
 * Client-side Error Handler Utility
 * Provides specific, contextual error messages for common error scenarios
 */

const errorMap = {
  // Authentication
  'Email ou mot de passe incorrect': {
    message: 'Email ou mot de passe incorrect',
    hint: 'Vérifiez que votre email et mot de passe sont corrects. Les mots de passe distinguent les majuscules/minuscules.',
    severity: 'error'
  },

  'UNIQUE': {
    message: 'Cet email est déjà enregistré ou utilisé',
    hint: 'Utilisez une adresse email différente ou reconnectez-vous si c\'est votre compte.',
    severity: 'warning'
  },

  'déjà': {
    message: 'Cette ressource existe déjà',
    hint: 'Vérifiez que vous n\'ajoutez pas de doublons.',
    severity: 'warning'
  },

  // Voters
  'email': {
    message: 'Erreur liée à l\'email',
    hint: 'Vérifiez que les adresses email sont au bon format: user@domain.com',
    severity: 'error'
  },

  'weight': {
    message: 'Erreur de poids',
    hint: 'Le poids doit être un nombre positif (ex: 1, 1.5, 2)',
    severity: 'error'
  },

  'quorum': {
    message: 'Le quorum n\'est pas atteint',
    hint: 'Attendez plus de votes ou diminuez le quorum requis.',
    severity: 'warning'
  },

  'has_voted': {
    message: 'Vous avez déjà voté',
    hint: 'Chaque électeur ne peut voter qu\'une seule fois.',
    severity: 'warning'
  },

  // Voting
  'Le vote n\'est pas actif': {
    message: 'Le vote n\'est pas actif',
    hint: 'L\'élection n\'a pas commencé ou est déjà terminée.',
    severity: 'warning'
  },

  'Token invalide': {
    message: 'Lien de vote invalide ou expiré',
    hint: 'Demandez un nouveau lien de vote à l\'organisateur.',
    severity: 'error'
  },

  // Database/Server
  'SQLITE_CONSTRAINT': {
    message: 'Violation de contrainte de base de données',
    hint: 'Cette donnée viole les règles de la base de données. Vérifiez les doublons.',
    severity: 'error'
  },

  'timeout': {
    message: 'La requête a expiré',
    hint: 'La connexion Internet est peut-être lente. Vérifiez votre connexion et réessayez.',
    severity: 'warning'
  },

  'ECONNREFUSED': {
    message: 'Impossible de se connecter au serveur',
    hint: 'Le serveur peut être hors ligne. Vérifiez votre connexion Internet.',
    severity: 'critical'
  }
};

/**
 * Parse error and return specific message with hint
 * @param {Error|string|object} error - The error object
 * @returns {object} - { message, hint, severity, raw }
 */
export function parseError(error) {
  let errorString = '';
  let rawError = error;

  if (typeof error === 'string') {
    errorString = error.toLowerCase();
  } else if (error?.response?.data?.error) {
    errorString = error.response.data.error.toLowerCase();
    rawError = error.response.data;
  } else if (error?.response?.data?.message) {
    errorString = error.response.data.message.toLowerCase();
    rawError = error.response.data;
  } else if (error?.message) {
    errorString = error.message.toLowerCase();
  } else if (typeof error === 'object') {
    errorString = JSON.stringify(error).toLowerCase();
  }

  // Try to find a matching error pattern
  for (const [key, pattern] of Object.entries(errorMap)) {
    if (errorString.includes(key.toLowerCase())) {
      return {
        message: pattern.message,
        hint: pattern.hint,
        severity: pattern.severity,
        raw: rawError
      };
    }
  }

  // Default error message
  return {
    message: errorString || 'Une erreur est survenue',
    hint: 'Veuillez réessayer ou contacter le support.',
    severity: 'error',
    raw: rawError
  };
}

/**
 * Get user-friendly error message
 * @param {Error|string|object} error
 * @returns {string}
 */
export function getUserFriendlyError(error) {
  const parsed = parseError(error);
  return parsed.message;
}

/**
 * Get helpful hint for error
 * @param {Error|string|object} error
 * @returns {string}
 */
export function getErrorHint(error) {
  const parsed = parseError(error);
  return parsed.hint;
}

/**
 * Get error severity
 * @param {Error|string|object} error
 * @returns {string} - 'error', 'warning', 'critical'
 */
export function getErrorSeverity(error) {
  const parsed = parseError(error);
  return parsed.severity;
}

/**
 * Format validation errors from server
 * @param {object} details - Validation error details from server
 * @returns {string}
 */
export function formatValidationErrors(details) {
  if (!Array.isArray(details)) {
    return 'Erreur de validation';
  }

  const messages = details.map(d => {
    const field = d.field?.toUpperCase() || 'Champ';
    const msg = d.message || 'Valeur invalide';
    return `${field}: ${msg}`;
  });

  return messages.join(' | ');
}
