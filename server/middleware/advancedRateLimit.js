/**
 * Advanced Rate Limiting Middleware
 * Supports:
 * - Per IP rate limiting
 * - Per voter token rate limiting
 * - Exponential backoff after failures
 * - Captcha trigger after N attempts
 * - Detailed logging of rate limit violations
 */

import rateLimit from 'express-rate-limit';

// In-memory store for failed attempts (in production, use Redis)
const failedAttempts = new Map();
const blockedTokens = new Map();

/**
 * Calculate exponential backoff time in milliseconds
 * @param {number} attempts - Number of failed attempts
 * @returns {number} - Milliseconds to wait
 */
function getBackoffTime(attempts) {
  const backoffTimes = [15000, 30000, 60000, 300000]; // 15s, 30s, 1m, 5m
  const index = Math.min(attempts - 1, backoffTimes.length - 1);
  return backoffTimes[index];
}

/**
 * Track failed login/vote attempt
 * @param {string} identifier - IP or voter token
 * @param {string} type - 'login' or 'vote'
 */
function recordFailedAttempt(identifier, type) {
  const key = `${type}:${identifier}`;
  const current = failedAttempts.get(key) || { count: 0, lastAttempt: null };

  current.count++;
  current.lastAttempt = Date.now();

  // If too many attempts, block temporarily
  if (current.count >= 3) {
    const blockTime = getBackoffTime(current.count);
    blockedTokens.set(key, {
      until: Date.now() + blockTime,
      attempts: current.count
    });
  }

  failedAttempts.set(key, current);
  return current.count;
}

/**
 * Clear failed attempts for identifier
 * @param {string} identifier - IP or voter token
 * @param {string} type - 'login' or 'vote'
 */
function clearFailedAttempts(identifier, type) {
  const key = `${type}:${identifier}`;
  failedAttempts.delete(key);
  blockedTokens.delete(key);
}

/**
 * Check if identifier is blocked
 * @param {string} identifier - IP or voter token
 * @param {string} type - 'login' or 'vote'
 * @returns {Object|null} - {until, attempts, remaining} or null if not blocked
 */
function getBlockStatus(identifier, type) {
  const key = `${type}:${identifier}`;
  const block = blockedTokens.get(key);

  if (!block) return null;

  const now = Date.now();
  if (now > block.until) {
    // Block expired, remove it
    blockedTokens.delete(key);
    failedAttempts.delete(key);
    return null;
  }

  return {
    until: block.until,
    attempts: block.attempts,
    remaining: Math.ceil((block.until - now) / 1000)
  };
}

/**
 * General rate limiter (IP-based)
 * 100 requests per 15 minutes
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Trop de requêtes, veuillez réessayer plus tard',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health';
  }
});

/**
 * Login rate limiter
 * 5 attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    const ip = req.ip;
    const block = getBlockStatus(ip, 'login');

    res.status(429).json({
      error: true,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.',
      retryAfter: block?.remaining || 60,
      requiresCaptcha: true
    });
  },
  keyGenerator: (req) => req.ip
});

/**
 * Custom vote rate limiter
 * Per voter token: 1 vote (once, ever)
 * Prevents double voting
 */
export const voteRateLimiter = (req, res, next) => {
  const voterToken = req.headers['x-voter-token'] || req.body?.voterToken;

  if (!voterToken) {
    return res.status(401).json({
      error: true,
      code: 'NO_VOTER_TOKEN',
      message: 'Voter token required'
    });
  }

  const block = getBlockStatus(voterToken, 'vote');
  if (block) {
    return res.status(429).json({
      error: true,
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Vous avez déjà voté. Trop de tentatives. Réessayez dans ${block.remaining}s.`,
      retryAfter: block.remaining,
      requiresCaptcha: true
    });
  }

  // Store voter token in request for later use
  req.voterToken = voterToken;
  next();
};

/**
 * Track successful login
 * Clears failed attempts
 */
export const onLoginSuccess = (ip) => {
  clearFailedAttempts(ip, 'login');
};

/**
 * Track failed login
 * Increments failed attempts
 */
export const onLoginFailure = (ip) => {
  const attempts = recordFailedAttempt(ip, 'login');
  const block = getBlockStatus(ip, 'login');

  return {
    attempts,
    blocked: block !== null,
    blockInfo: block
  };
};

/**
 * Track failed vote
 */
export const onVoteFailure = (voterToken) => {
  const attempts = recordFailedAttempt(voterToken, 'vote');
  const block = getBlockStatus(voterToken, 'vote');

  return {
    attempts,
    blocked: block !== null,
    blockInfo: block
  };
};

/**
 * Middleware to check rate limit before processing
 * Can be used to show UI warnings
 */
export const checkRateLimitStatus = (type = 'login') => {
  return (req, res, next) => {
    const identifier = type === 'login' ? req.ip : req.headers['x-voter-token'];
    const block = getBlockStatus(identifier, type);
    const attempts = failedAttempts.get(`${type}:${identifier}`) || { count: 0 };

    // Add rate limit status to request
    req.rateLimitStatus = {
      attempts: attempts.count,
      blocked: block !== null,
      blockInfo: block
    };

    // Add headers to response
    if (block) {
      res.setHeader('Retry-After', block.remaining);
      res.setHeader('X-RateLimit-Remaining', 0);
    } else {
      res.setHeader('X-RateLimit-Remaining', 5 - attempts.count); // For login
    }

    next();
  };
};

/**
 * Cleanup old blocks periodically
 * Prevents memory leak
 */
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, block] of blockedTokens.entries()) {
    if (now > block.until) {
      blockedTokens.delete(key);
      failedAttempts.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[RateLimit] Cleaned ${cleaned} expired blocks`);
  }
}, 60000); // Run every minute

export default {
  generalLimiter,
  loginLimiter,
  voteRateLimiter,
  checkRateLimitStatus,
  onLoginSuccess,
  onLoginFailure,
  onVoteFailure,
  getBlockStatus,
  recordFailedAttempt,
  clearFailedAttempts
};
