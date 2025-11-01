import Joi from 'joi';

/**
 * Validation de création d'élection
 */
export const validateElectionCreation = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().required().min(3).max(200),
    description: Joi.string().allow('').max(2000),
    voting_type: Joi.string().valid('simple', 'approval', 'preference', 'list').required(),
    is_secret: Joi.boolean().default(true),
    is_weighted: Joi.boolean().default(false),
    allow_anonymity: Joi.boolean().default(false),
    scheduled_start: Joi.date().iso().allow(null, ''),
    scheduled_end: Joi.date().iso().allow(null, ''),
    deferred_counting: Joi.boolean().default(false),
    max_voters: Joi.number().integer().min(1).max(30000).default(10000),
    // Nouveaux champs v2.0
    quorum_type: Joi.string().valid('none', 'percentage', 'absolute', 'weighted').default('none'),
    quorum_value: Joi.number().min(0).max(100).default(0),
    meeting_platform: Joi.string().valid('teams', 'zoom').allow(null, ''),
    meeting_url: Joi.string().uri().allow(null, ''),
    meeting_id: Joi.string().allow(null, ''),
    meeting_password: Joi.string().allow(null, ''),
    options: Joi.array().items(Joi.object({
      option_text: Joi.string().required(),
      candidate_name: Joi.string().allow(''),
      candidate_info: Joi.string().allow('')
    })).min(2).required(),
    settings: Joi.object().default({})
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  next();
};

/**
 * Validation d'ajout d'électeurs
 */
export const validateVoters = (req, res, next) => {
  const schema = Joi.object({
    voters: Joi.array().items(Joi.object({
      email: Joi.string().email().required(),
      name: Joi.string().allow(''),
      weight: Joi.number().min(0.1).max(10).default(1.0)
    })).min(1).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  next();
};

/**
 * Validation de vote
 */
export const validateVote = (req, res, next) => {
  const schema = Joi.object({
    vote: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string()),
      Joi.object()
    ).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  next();
};
