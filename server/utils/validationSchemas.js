/**
 * Centralized Validation Schemas
 * Using Joi for all input validation
 * Ensures consistency between frontend and backend
 */

import Joi from 'joi';

// Custom error messages in French
const messages = {
  'string.empty': '{#label} est requis',
  'string.email': '{#label} doit être une adresse email valide',
  'string.min': '{#label} doit contenir au moins {#limit} caractères',
  'string.max': '{#label} ne doit pas dépasser {#limit} caractères',
  'number.min': '{#label} doit être au moins {#limit}',
  'number.max': '{#label} ne doit pas dépasser {#limit}',
  'any.required': '{#label} est requis',
  'array.min': '{#label} doit contenir au moins {#limit} éléments',
  'array.max': '{#label} ne doit pas dépasser {#limit} éléments'
};

/**
 * Authentication Schemas
 */

export const authSchemas = {
  /**
   * User Registration
   */
  register: Joi.object({
    name: Joi.string()
      .trim()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.empty': 'Le nom est requis',
        'string.min': 'Le nom doit contenir au moins 3 caractères',
        'string.max': 'Le nom ne doit pas dépasser 100 caractères'
      }),

    email: Joi.string()
      .lowercase()
      .email()
      .max(255)
      .required()
      .messages({
        'string.empty': 'L\'email est requis',
        'string.email': 'L\'email doit être valide',
        'string.max': 'L\'email ne doit pas dépasser 255 caractères'
      }),

    password: Joi.string()
      .min(12)
      .required()
      .messages({
        'string.empty': 'Le mot de passe est requis',
        'string.min': 'Le mot de passe doit contenir au moins 12 caractères'
      })
      // Password validation handled separately by passwordValidator.js
  }).unknown(false),

  /**
   * User Login
   */
  login: Joi.object({
    email: Joi.string()
      .lowercase()
      .email()
      .required()
      .messages({
        'string.empty': 'L\'email est requis',
        'string.email': 'L\'email doit être valide'
      }),

    password: Joi.string()
      .required()
      .messages({
        'string.empty': 'Le mot de passe est requis'
      }),

    twoFactorToken: Joi.string()
      .regex(/^\d{6}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Le code 2FA doit être 6 chiffres'
      }),

    rememberMe: Joi.boolean()
      .default(false)
  }).unknown(false),

  /**
   * Refresh Token
   */
  refresh: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'string.empty': 'Le refresh token est requis'
      })
  }).unknown(false),

  /**
   * Two Factor Setup
   */
  twoFactorSetup: Joi.object({
    password: Joi.string()
      .required()
      .messages({
        'string.empty': 'Le mot de passe est requis'
      })
  }).unknown(false),

  /**
   * Two Factor Verify
   */
  twoFactorVerify: Joi.object({
    code: Joi.string()
      .regex(/^\d{6}$/)
      .required()
      .messages({
        'string.empty': 'Le code 2FA est requis',
        'string.pattern.base': 'Le code doit être 6 chiffres'
      }),

    backupCode: Joi.string()
      .optional()
  }).unknown(false)
};

/**
 * Election Schemas
 */

export const electionSchemas = {
  /**
   * Create Election
   */
  create: Joi.object({
    title: Joi.string()
      .trim()
      .min(5)
      .max(200)
      .required()
      .messages({
        'string.empty': 'Le titre de l\'élection est requis',
        'string.min': 'Le titre doit contenir au moins 5 caractères',
        'string.max': 'Le titre ne doit pas dépasser 200 caractères'
      }),

    description: Joi.string()
      .trim()
      .max(5000)
      .optional()
      .messages({
        'string.max': 'La description ne doit pas dépasser 5000 caractères'
      }),

    votingType: Joi.string()
      .valid('simple', 'approval', 'preference', 'list')
      .required()
      .messages({
        'any.only': 'Type de vote invalide'
      }),

    isAnonymous: Joi.boolean()
      .default(true),

    allowWeightedVotes: Joi.boolean()
      .default(false),

    startTime: Joi.date()
      .optional()
      .messages({
        'date.base': 'La date de début est invalide'
      }),

    endTime: Joi.date()
      .optional()
      .greater(Joi.ref('startTime'))
      .messages({
        'date.base': 'La date de fin est invalide',
        'date.greater': 'La date de fin doit être après la date de début'
      }),

    quorumType: Joi.string()
      .valid('percentage', 'absolute', 'weighted', 'none')
      .default('none'),

    quorumValue: Joi.number()
      .min(0)
      .max(100)
      .optional(),

    options: Joi.array()
      .items(
        Joi.object({
          text: Joi.string()
            .trim()
            .min(2)
            .max(500)
            .required()
            .messages({
              'string.empty': 'Le texte de l\'option est requis',
              'string.min': 'Le texte doit contenir au moins 2 caractères',
              'string.max': 'Le texte ne doit pas dépasser 500 caractères'
            })
        })
      )
      .min(2)
      .max(100)
      .required()
      .messages({
        'array.min': 'Au moins 2 options sont requises',
        'array.max': 'Maximum 100 options autorisées'
      })
  }).unknown(false),

  /**
   * Update Election
   */
  update: Joi.object({
    title: Joi.string()
      .trim()
      .min(5)
      .max(200)
      .optional(),

    description: Joi.string()
      .trim()
      .max(5000)
      .optional(),

    status: Joi.string()
      .valid('draft', 'in_progress', 'closed')
      .optional()
  }).unknown(false)
};

/**
 * Voter Schemas
 */

export const voterSchemas = {
  /**
   * Add Voter
   */
  addVoter: Joi.object({
    email: Joi.string()
      .lowercase()
      .email()
      .required()
      .messages({
        'string.empty': 'L\'email du votant est requis',
        'string.email': 'L\'email doit être valide'
      }),

    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .optional(),

    weight: Joi.number()
      .min(1)
      .max(1000)
      .default(1)
      .messages({
        'number.min': 'Le poids doit être au moins 1',
        'number.max': 'Le poids ne doit pas dépasser 1000'
      }),

    group: Joi.string()
      .trim()
      .max(100)
      .optional()
  }).unknown(false),

  /**
   * Bulk Add Voters (CSV)
   */
  bulkAddVoters: Joi.object({
    voters: Joi.array()
      .items(Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().max(100).optional(),
        weight: Joi.number().min(1).max(1000).default(1),
        group: Joi.string().max(100).optional()
      }))
      .min(1)
      .max(30000)
      .required()
      .messages({
        'array.min': 'Au moins 1 votant requis',
        'array.max': 'Maximum 30000 votants autorisés'
      })
  }).unknown(false),

  /**
   * Update Voter
   */
  updateVoter: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .optional(),

    weight: Joi.number()
      .min(1)
      .max(1000)
      .optional(),

    group: Joi.string()
      .trim()
      .max(100)
      .optional()
  }).unknown(false)
};

/**
 * Voting Schemas
 */

export const votingSchemas = {
  /**
   * Cast Vote
   */
  castVote: Joi.object({
    choices: Joi.alternatives()
      .try(
        // For simple voting: single string
        Joi.string().max(100),
        // For multiple choices: array of strings
        Joi.array().items(Joi.string().max(100)).min(1).max(100)
      )
      .required()
      .messages({
        'alternatives.match': 'Les choix de vote sont invalides'
      }),

    weight: Joi.number()
      .min(0.1)
      .max(1000)
      .default(1)
      .optional()
  }).unknown(false)
};

/**
 * Observer Schemas
 */

export const observerSchemas = {
  /**
   * Create Observer Access
   */
  create: Joi.object({
    email: Joi.string()
      .lowercase()
      .email()
      .optional(),

    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .optional(),

    canSeeResults: Joi.boolean()
      .default(false),

    canSeeTurnout: Joi.boolean()
      .default(true),

    canComment: Joi.boolean()
      .default(false)
  }).unknown(false)
};

/**
 * Validator Utility Function
 * Validates data against schema and throws formatted error
 *
 * @param {Object} data - Data to validate
 * @param {Joi.Schema} schema - Joi schema
 * @returns {Object} - Validated data
 * @throws {Object} - Formatted error with code and messages
 */
export function validateData(data, schema) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    messages
  });

  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      type: detail.type
    }));

    const errorObj = new Error('VALIDATION_ERROR');
    errorObj.code = 'VALIDATION_ERROR';
    errorObj.details = details;
    errorObj.message = error.details[0].message; // First error for response

    throw errorObj;
  }

  return value;
}

/**
 * Validation middleware factory
 * Returns Express middleware for schema validation
 */
export function createValidationMiddleware(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = source === 'body' ? req.body :
                   source === 'query' ? req.query :
                   source === 'params' ? req.params : req.body;

      const validated = validateData(data, schema);

      if (source === 'body') req.body = validated;
      else if (source === 'query') req.query = validated;
      else if (source === 'params') req.params = validated;

      next();
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR') {
        return res.status(400).json({
          error: true,
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details
        });
      }

      next(error);
    }
  };
}

export default {
  authSchemas,
  electionSchemas,
  voterSchemas,
  votingSchemas,
  observerSchemas,
  validateData,
  createValidationMiddleware
};
