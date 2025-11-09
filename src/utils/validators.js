/**
 * Form Field Validators
 * Real-time validation with async availability checking
 */

/**
 * Email validator with availability check
 */
export const validateEmail = async (value) => {
  if (!value || !value.trim()) {
    return {
      isValid: false,
      message: 'Email requis',
      level: 'error'
    };
  }

  const trimmed = value.trim();

  // RFC 5322 simplified email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      message: 'Format email invalide (ex: user@example.com)',
      level: 'error'
    };
  }

  // Check if email is too long
  if (trimmed.length > 254) {
    return {
      isValid: false,
      message: 'Email trop long (max 254 caractères)',
      level: 'error'
    };
  }

  return {
    isValid: true,
    message: 'Email valide',
    level: 'success'
  };
};

/**
 * Password strength validator
 * Requirements: At least 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export const validatePassword = (value) => {
  if (!value) {
    return {
      isValid: false,
      message: 'Mot de passe requis',
      level: 'error'
    };
  }

  const checks = {
    length: value.length >= 12,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
  // Index 0: 0 checks (Très faible), 1: 1 check, 2: 2 checks, 3: 3 checks (Moyen), 4: 4 checks, 5: 5 checks (Très fort)
  const strengthLevels = ['Très faible', 'Très faible', 'Faible', 'Moyen', 'Bon', 'Très fort'];
  const strength = strengthLevels[passedChecks] || 'Invalide';

  if (passedChecks < 4) {
    const missing = [];
    if (!checks.length) missing.push('12+ caractères');
    if (!checks.uppercase) missing.push('majuscule (A-Z)');
    if (!checks.lowercase) missing.push('minuscule (a-z)');
    if (!checks.number) missing.push('chiffre (0-9)');
    if (!checks.special) missing.push('caractère spécial (!@#$...)');

    return {
      isValid: false,
      message: `Force: ${strength} - Ajouter: ${missing.join(', ')}`,
      level: 'error',
      strength,
      checks
    };
  }

  return {
    isValid: true,
    message: `Force: ${strength} ✓`,
    level: 'success',
    strength,
    checks
  };
};

/**
 * Username validator with format checking
 */
export const validateUsername = async (value) => {
  if (!value || !value.trim()) {
    return {
      isValid: false,
      message: 'Nom d\'utilisateur requis',
      level: 'error'
    };
  }

  const trimmed = value.trim();

  if (trimmed.length < 3) {
    return {
      isValid: false,
      message: 'Min 3 caractères',
      level: 'error'
    };
  }

  if (trimmed.length > 30) {
    return {
      isValid: false,
      message: 'Max 30 caractères',
      level: 'error'
    };
  }

  // Allow alphanumeric and underscore
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return {
      isValid: false,
      message: 'Caractères autorisés: a-z, 0-9, underscore (_)',
      level: 'error'
    };
  }

  // Check if starts with underscore or number
  if (/^[_0-9]/.test(trimmed)) {
    return {
      isValid: false,
      message: 'Doit commencer par une lettre',
      level: 'error'
    };
  }

  return {
    isValid: true,
    message: 'Nom d\'utilisateur valide',
    level: 'success'
  };
};

/**
 * Election title validator
 */
export const validateElectionTitle = (value) => {
  if (!value || !value.trim()) {
    return {
      isValid: false,
      message: 'Titre requis',
      level: 'error'
    };
  }

  const trimmed = value.trim();

  if (trimmed.length < 3) {
    return {
      isValid: false,
      message: 'Min 3 caractères',
      level: 'error'
    };
  }

  if (trimmed.length > 200) {
    return {
      isValid: false,
      message: 'Max 200 caractères',
      level: 'error'
    };
  }

  return {
    isValid: true,
    message: 'Titre valide',
    level: 'success'
  };
};

/**
 * Description validator
 */
export const validateDescription = (value, minLength = 10, maxLength = 5000) => {
  if (!value || !value.trim()) {
    return {
      isValid: false,
      message: 'Description requise',
      level: 'error'
    };
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return {
      isValid: false,
      message: `Min ${minLength} caractères`,
      level: 'error'
    };
  }

  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      message: `Max ${maxLength} caractères`,
      level: 'error'
    };
  }

  return {
    isValid: true,
    message: 'Description valide',
    level: 'success'
  };
};

/**
 * Voter name validator
 */
export const validateVoterName = (value) => {
  if (!value || !value.trim()) {
    return {
      isValid: false,
      message: 'Nom requis',
      level: 'error'
    };
  }

  const trimmed = value.trim();

  if (trimmed.length < 2) {
    return {
      isValid: false,
      message: 'Min 2 caractères',
      level: 'error'
    };
  }

  if (trimmed.length > 100) {
    return {
      isValid: false,
      message: 'Max 100 caractères',
      level: 'error'
    };
  }

  return {
    isValid: true,
    message: 'Nom valide',
    level: 'success'
  };
};

/**
 * Required field validator
 */
export const validateRequired = (value, fieldName = 'Champ') => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return {
      isValid: false,
      message: `${fieldName} requis`,
      level: 'error'
    };
  }

  return {
    isValid: true,
    message: `${fieldName} valide`,
    level: 'success'
  };
};

/**
 * Validator factory for creating custom validators
 */
export const createValidator = (validateFn) => {
  return async (value) => {
    try {
      return await Promise.resolve(validateFn(value));
    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        message: 'Erreur de validation',
        level: 'error'
      };
    }
  };
};

/**
 * Compose multiple validators (all must pass)
 */
export const composeValidators = (...validators) => {
  return async (value) => {
    for (const validator of validators) {
      const result = await Promise.resolve(validator(value));
      if (!result.isValid) {
        return result;
      }
    }
    return { isValid: true, message: 'Valide', level: 'success' };
  };
};

export default {
  validateEmail,
  validatePassword,
  validateUsername,
  validateElectionTitle,
  validateDescription,
  validateVoterName,
  validateRequired,
  createValidator,
  composeValidators
};
