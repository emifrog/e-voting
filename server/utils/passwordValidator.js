/**
 * Password Validation Utility
 * Provides comprehensive password strength validation
 */

const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '12345678', '1234567890',
  'admin', 'admin123', 'login', 'welcome', 'letmein',
  'qwerty', 'abc123', 'sunshine', 'princess', 'football',
  'batman', 'starwars', 'trustno1', 'passpass', '111111',
  'iloveyou', 'monkey', 'dragon', 'master', 'shadow',
  'superman', 'michael', 'jennifer', 'jordan', 'soccer'
];

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {Object} - { isValid: boolean, score: number, feedback: string[], errors: string[] }
 */
export function validatePasswordStrength(password) {
  const errors = [];
  const feedback = [];
  let score = 0;

  if (!password) {
    return {
      isValid: false,
      score: 0,
      feedback: [],
      errors: ['Le mot de passe est requis']
    };
  }

  // Length checks
  if (password.length < 12) {
    errors.push('Le mot de passe doit contenir au moins 12 caractères');
  } else {
    score += 2;
    feedback.push('✓ Longueur suffisante (12+ caractères)');
  }

  if (password.length < 8) {
    score = 0;
    return { isValid: false, score: 0, feedback: [], errors: ['Minimum 12 caractères requis'] };
  }

  // Uppercase letters
  if (!/[A-Z]/.test(password)) {
    errors.push('Doit contenir au moins une majuscule');
  } else {
    score += 1;
    feedback.push('✓ Contient une majuscule');
  }

  // Lowercase letters
  if (!/[a-z]/.test(password)) {
    errors.push('Doit contenir au moins une minuscule');
  } else {
    score += 1;
    feedback.push('✓ Contient une minuscule');
  }

  // Numbers
  if (!/[0-9]/.test(password)) {
    errors.push('Doit contenir au moins un chiffre');
  } else {
    score += 1;
    feedback.push('✓ Contient un chiffre');
  }

  // Special characters
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Doit contenir au least un caractère spécial (!@#$%^&*...)');
  } else {
    score += 1;
    feedback.push('✓ Contient un caractère spécial');
  }

  // Check against common passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Ce mot de passe est trop commun. Veuillez en choisir un autre');
    score = Math.max(0, score - 3);
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Évitez les caractères répétés (aaa, 111, etc)');
    score = Math.max(0, score - 1);
    feedback.push('⚠ Contient des caractères répétés');
  }

  // Check for sequential numbers
  if (/012|123|234|345|456|567|678|789|890|098|987|876/.test(password)) {
    errors.push('Évitez les séquences numériques (123, 456, etc)');
    score = Math.max(0, score - 1);
    feedback.push('⚠ Contient des séquences numériques');
  }

  // Check for keyboard patterns
  if (/qwerty|asdfgh|zxcvbn|qazwsx|qweasd/.test(password.toLowerCase())) {
    errors.push('Évitez les patterns clavier communs');
    score = Math.max(0, score - 1);
    feedback.push('⚠ Contient un pattern clavier');
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    score: Math.min(10, Math.max(0, score)),
    feedback,
    errors
  };
}

/**
 * Calculate password strength level
 * @param {number} score - Password strength score (0-10)
 * @returns {Object} - { level: string, color: string, description: string }
 */
export function getPasswordStrengthLevel(score) {
  if (score < 3) {
    return {
      level: 'Très faible',
      color: '#ef4444',
      description: 'Trop faible - risque de sécurité'
    };
  }
  if (score < 5) {
    return {
      level: 'Faible',
      color: '#f97316',
      description: 'Pas assez fort'
    };
  }
  if (score < 7) {
    return {
      level: 'Moyen',
      color: '#eab308',
      description: 'Acceptable mais pourrait être meilleur'
    };
  }
  if (score < 9) {
    return {
      level: 'Fort',
      color: '#84cc16',
      description: 'Bon choix'
    };
  }
  return {
    level: 'Très fort',
    color: '#22c55e',
    description: 'Excellent choix'
  };
}

/**
 * Validate password against requirements
 * Throws error if invalid
 * @param {string} password - Password to validate
 * @throws {Error} If password doesn't meet requirements
 */
export function validatePasswordOrThrow(password) {
  const validation = validatePasswordStrength(password);
  if (!validation.isValid) {
    throw new Error(validation.errors.join('; '));
  }
  return validation;
}

export default {
  validatePasswordStrength,
  getPasswordStrengthLevel,
  validatePasswordOrThrow
};
