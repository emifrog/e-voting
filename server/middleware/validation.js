/**
 * Validation Middleware
 * Centralized Express middleware for request validation using Joi
 * Logs validation errors for debugging
 */

import Joi from 'joi';

/**
 * Validate request body against Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const details = error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message,
          type: d.type
        }));

        return res.status(400).json({
          error: true,
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details
        });
      }

      req.body = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Validate request params against Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false
      });

      if (error) {
        const details = error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }));

        return res.status(400).json({
          error: true,
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details
        });
      }

      req.params = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Validate request query against Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false
      });

      if (error) {
        const details = error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }));

        return res.status(400).json({
          error: true,
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details
        });
      }

      req.query = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Legacy validators for backward compatibility
 */

export const validateElectionCreation = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().required().min(5).max(200),
    description: Joi.string().allow('').max(5000),
    voting_type: Joi.string().valid('simple', 'approval', 'preference', 'list').required(),
    is_secret: Joi.boolean().default(true),
    is_weighted: Joi.boolean().default(false),
    allow_anonymity: Joi.boolean().default(false),
    scheduled_start: Joi.date().iso().allow(null, ''),
    scheduled_end: Joi.date().iso().allow(null, ''),
    deferred_counting: Joi.boolean().default(false),
    max_voters: Joi.number().integer().min(1).max(30000).default(10000),
    quorum_type: Joi.string().valid('none', 'percentage', 'absolute', 'weighted').default('none'),
    quorum_value: Joi.number().min(0).max(100).default(0),
    meeting_platform: Joi.string().valid('teams', 'zoom').allow(null, ''),
    meeting_url: Joi.string().uri().allow(null, ''),
    meeting_id: Joi.string().allow(null, ''),
    meeting_password: Joi.string().allow(null, ''),
    options: Joi.array().items(Joi.object({
      option_text: Joi.string().required().max(500),
      candidate_name: Joi.string().allow('').max(100),
      candidate_info: Joi.string().allow('').max(1000)
    })).min(2).required(),
    settings: Joi.object().default({})
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: true,
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
      details: error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }

  next();
};

export const validateVoters = (req, res, next) => {
  const schema = Joi.object({
    voters: Joi.array().items(Joi.object({
      email: Joi.string().email().required(),
      name: Joi.string().allow('').max(100),
      weight: Joi.number().min(1).max(1000).default(1)
    })).min(1).max(30000).required()
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: true,
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
      details: error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }

  next();
};

export const validateVote = (req, res, next) => {
  const schema = Joi.object({
    vote: Joi.alternatives().try(
      Joi.string().max(500),
      Joi.array().items(Joi.string().max(500)).min(1).max(100),
      Joi.object()
    ).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: true,
      code: 'VALIDATION_ERROR',
      message: error.message
    });
  }

  next();
};
