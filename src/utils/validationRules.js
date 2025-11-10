/**
 * Validation Rules Library
 *
 * Centralized validation rules for forms across the application.
 * Compatible with useFormValidation hook.
 */

/**
 * Required field validator
 */
export const required = (message = 'Ce champ est requis') => (value) => {
  if (value === null || value === undefined) {
    return { isValid: false, message };
  }

  if (typeof value === 'string' && !value.trim()) {
    return { isValid: false, message };
  }

  if (Array.isArray(value) && value.length === 0) {
    return { isValid: false, message };
  }

  return { isValid: true };
};

/**
 * Minimum length validator
 */
export const minLength = (length, message) => (value) => {
  if (!value) return { isValid: true }; // Only validate if value exists

  if (value.length < length) {
    return {
      isValid: false,
      message: message || `Minimum ${length} caractères requis`
    };
  }

  return { isValid: true };
};

/**
 * Maximum length validator
 */
export const maxLength = (length, message) => (value) => {
  if (!value) return { isValid: true };

  if (value.length > length) {
    return {
      isValid: false,
      message: message || `Maximum ${length} caractères autorisés`
    };
  }

  return { isValid: true };
};

/**
 * Minimum value validator (numbers)
 */
export const minValue = (min, message) => (value) => {
  if (value === '' || value === null || value === undefined) {
    return { isValid: true };
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return { isValid: false, message: 'Doit être un nombre' };
  }

  if (numValue < min) {
    return {
      isValid: false,
      message: message || `La valeur minimale est ${min}`
    };
  }

  return { isValid: true };
};

/**
 * Maximum value validator (numbers)
 */
export const maxValue = (max, message) => (value) => {
  if (value === '' || value === null || value === undefined) {
    return { isValid: true };
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return { isValid: false, message: 'Doit être un nombre' };
  }

  if (numValue > max) {
    return {
      isValid: false,
      message: message || `La valeur maximale est ${max}`
    };
  }

  return { isValid: true };
};

/**
 * Email validator
 */
export const email = (message = 'Email invalide') => (value) => {
  if (!value) return { isValid: true };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(value)) {
    return { isValid: false, message };
  }

  return { isValid: true };
};

/**
 * URL validator
 */
export const url = (message = 'URL invalide') => (value) => {
  if (!value) return { isValid: true };

  try {
    new URL(value);
    return { isValid: true };
  } catch {
    return { isValid: false, message };
  }
};

/**
 * Pattern validator (regex)
 */
export const pattern = (regex, message = 'Format invalide') => (value) => {
  if (!value) return { isValid: true };

  const regexObj = typeof regex === 'string' ? new RegExp(regex) : regex;

  if (!regexObj.test(value)) {
    return { isValid: false, message };
  }

  return { isValid: true };
};

/**
 * Password strength validator
 */
export const password = (message) => (value) => {
  if (!value) return { isValid: true };

  const errors = [];

  if (value.length < 12) {
    errors.push('12 caractères minimum');
  }

  if (!/[a-z]/.test(value)) {
    errors.push('une minuscule');
  }

  if (!/[A-Z]/.test(value)) {
    errors.push('une majuscule');
  }

  if (!/\d/.test(value)) {
    errors.push('un chiffre');
  }

  if (!/[@$!%*?&]/.test(value)) {
    errors.push('un caractère spécial (@$!%*?&)');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      message: message || `Le mot de passe doit contenir: ${errors.join(', ')}`
    };
  }

  return { isValid: true };
};

/**
 * Match field validator (e.g., password confirmation)
 */
export const matchField = (fieldName, fieldLabel, getValues) => (value) => {
  if (!value) return { isValid: true };

  const values = getValues();
  const otherValue = values[fieldName];

  if (value !== otherValue) {
    return {
      isValid: false,
      message: `Doit correspondre à ${fieldLabel}`
    };
  }

  return { isValid: true };
};

/**
 * Date validator
 */
export const date = (message = 'Date invalide') => (value) => {
  if (!value) return { isValid: true };

  const dateObj = new Date(value);

  if (isNaN(dateObj.getTime())) {
    return { isValid: false, message };
  }

  return { isValid: true };
};

/**
 * Future date validator
 */
export const futureDate = (message = 'La date doit être dans le futur') => (value) => {
  if (!value) return { isValid: true };

  const dateObj = new Date(value);
  const now = new Date();

  if (dateObj <= now) {
    return { isValid: false, message };
  }

  return { isValid: true };
};

/**
 * Date range validator (end date must be after start date)
 */
export const dateAfter = (startDateField, getValues, message) => (value) => {
  if (!value) return { isValid: true };

  const values = getValues();
  const startDate = values[startDateField];

  if (!startDate) return { isValid: true };

  const startDateObj = new Date(startDate);
  const endDateObj = new Date(value);

  if (endDateObj <= startDateObj) {
    return {
      isValid: false,
      message: message || 'La date de fin doit être après la date de début'
    };
  }

  return { isValid: true };
};

/**
 * Array minimum length validator
 */
export const minArrayLength = (length, message) => (value) => {
  if (!Array.isArray(value)) {
    return { isValid: false, message: 'Doit être un tableau' };
  }

  if (value.length < length) {
    return {
      isValid: false,
      message: message || `Au moins ${length} élément${length > 1 ? 's' : ''} requis`
    };
  }

  return { isValid: true };
};

/**
 * Compose multiple validators
 */
export const compose = (...validators) => async (value) => {
  for (const validator of validators) {
    const result = await Promise.resolve(validator(value));
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true };
};

/**
 * Conditional validator - only validate if condition is true
 */
export const when = (condition, validator) => (value) => {
  if (condition()) {
    return validator(value);
  }
  return { isValid: true };
};

/**
 * Custom validator with async support
 */
export const custom = (validatorFn) => validatorFn;

/**
 * Pre-defined validation rule sets for common fields
 */
export const commonValidators = {
  electionTitle: compose(
    required('Le titre est requis'),
    minLength(3, 'Le titre doit contenir au moins 3 caractères'),
    maxLength(200, 'Le titre ne peut pas dépasser 200 caractères')
  ),

  electionDescription: compose(
    minLength(10, 'La description doit contenir au moins 10 caractères'),
    maxLength(2000, 'La description ne peut pas dépasser 2000 caractères')
  ),

  optionText: compose(
    required('Le texte de l\'option est requis'),
    minLength(1, 'L\'option ne peut pas être vide'),
    maxLength(500, 'L\'option ne peut pas dépasser 500 caractères')
  ),

  candidateName: compose(
    maxLength(100, 'Le nom ne peut pas dépasser 100 caractères')
  ),

  voterEmail: compose(
    required('L\'email est requis'),
    email('Format d\'email invalide')
  ),

  voterName: compose(
    required('Le nom est requis'),
    minLength(2, 'Le nom doit contenir au moins 2 caractères'),
    maxLength(100, 'Le nom ne peut pas dépasser 100 caractères')
  ),

  password: compose(
    required('Le mot de passe est requis'),
    password()
  ),

  maxVoters: compose(
    required('Le nombre maximum d\'électeurs est requis'),
    minValue(1, 'Au moins 1 électeur doit être autorisé'),
    maxValue(1000000, 'Le maximum est 1 000 000 électeurs')
  ),

  quorumValue: compose(
    required('La valeur du quorum est requise'),
    minValue(1, 'Le quorum doit être supérieur à 0'),
    maxValue(100, 'Le quorum ne peut pas dépasser 100%')
  ),

  meetingUrl: compose(
    url('URL de réunion invalide')
  )
};
