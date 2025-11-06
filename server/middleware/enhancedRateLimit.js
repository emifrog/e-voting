/**
 * Enhanced Rate Limiting Middleware
 * Combines multiple identifier sources:
 * - IP address
 * - Device fingerprint
 * - Voter token
 * - User ID
 *
 * More resistant to spoofing than IP-only rate limiting
 */

import { createServerFingerprint, detectSpoofing, getFingerprintComponents } from '../utils/deviceFingerprint.js';
import { getRateLimitStore } from '../utils/rateLimitStore.js';
import logger from '../utils/logger.js';

/**
 * Get composite identifier from request
 * Combines multiple sources for better accuracy
 *
 * @param {Object} req - Express request
 * @param {string} type - 'login', 'vote', 'general'
 * @returns {Object} - {id, components}
 */
export function getCompositeIdentifier(req, type = 'general') {
  const components = getFingerprintComponents(req);
  const fingerprint = createServerFingerprint(req);
  const spoofing = detectSpoofing(components);

  let id;

  switch (type) {
    case 'login':
      // Combine IP + device fingerprint for login attempts
      id = `login:${req.ip}:${fingerprint}`;
      break;

    case 'vote':
      // Use voter token as primary identifier for voting
      const voterToken = req.headers['x-voter-token'] || req.body?.voterToken;
      id = `vote:${voterToken}`;
      break;

    case 'user':
      // Use user ID if authenticated
      if (req.user?.id) {
        id = `user:${req.user.id}:${fingerprint}`;
      } else {
        id = `anon:${fingerprint}`;
      }
      break;

    default:
      // General: IP + fingerprint
      id = `general:${req.ip}:${fingerprint}`;
  }

  return {
    id,
    ip: req.ip,
    fingerprint,
    components,
    spoofing
  };
}

/**
 * Rate limit middleware with device fingerprinting
 *
 * @param {Object} options - Configuration
 * @returns {Function} - Express middleware
 */
export function createEnhancedRateLimiter(options = {}) {
  const {
    type = 'general',
    maxAttempts = 5,
    windowMs = 15 * 60 * 1000, // 15 minutes
    blockDuration = (attempt) => Math.min(3600000, Math.pow(2, attempt) * 15000), // Exponential backoff
    skipSuccessfulAuth = true,
    onBlock = null,
    onAttempt = null
  } = options;

  const store = getRateLimitStore();

  return async (req, res, next) => {
    try {
      const identifier = getCompositeIdentifier(req, type);

      // Check for spoofing
      if (identifier.spoofing.risk === 'high') {
        logger.warn(`[RateLimit] High-risk fingerprint detected: ${identifier.spoofing.reason}`, {
          ip: identifier.ip,
          type
        });

        // Treat high-risk as failed attempt
        await handleRateLimitExceeded(req, res, identifier, store, maxAttempts, type);
        return;
      }

      // Check if currently blocked
      const blockStatus = await store.isBlocked(identifier.id);

      if (blockStatus) {
        const remaining = await store.getBlockRemaining(identifier.id);

        logger.warn(`[RateLimit] Blocked request: ${type}`, {
          ip: identifier.ip,
          remaining,
          attempts: blockStatus.attempts
        });

        return res.status(429).json({
          error: true,
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many ${type} attempts. Try again in ${remaining}s.`,
          retryAfter: remaining,
          requiresCaptcha: true
        });
      }

      // Get current attempt count
      const attempts = await store.getAttempts(identifier.id);

      // Add to request for handler use
      req.rateLimit = {
        identifier: identifier.id,
        attempts,
        maxAttempts,
        blockStatus,
        fingerprint: identifier.fingerprint,
        components: identifier.components
      };

      // Emit attempt event if handler provided
      if (onAttempt) {
        await onAttempt(req, identifier, attempts);
      }

      // Store original send
      const originalSend = res.send;

      // Wrap send to track successes/failures
      res.send = function(data) {
        // If status code indicates failure, record attempt
        if (res.statusCode >= 400 && res.statusCode !== 404) {
          recordFailedAttempt(identifier, store, maxAttempts, blockDuration, type);
        } else if (skipSuccessfulAuth && (type === 'login' || type === 'vote')) {
          // Clear attempts on successful auth
          store.clearAttempts(identifier.id);
        }

        // Call original send
        return originalSend.call(this, data);
      };

      // Set headers
      res.setHeader('X-RateLimit-Limit', maxAttempts);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxAttempts - attempts));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

      next();
    } catch (error) {
      logger.error('[RateLimit] Middleware error:', error);
      // Continue on error, don't block
      next();
    }
  };
}

/**
 * Handle rate limit exceeded
 */
async function handleRateLimitExceeded(req, res, identifier, store, maxAttempts, type) {
  const attempts = await store.getAttempts(identifier.id);
  const nextAttempt = attempts + 1;

  // Record this failed attempt
  await store.recordAttempt(identifier.id);

  // Check if should block
  if (nextAttempt >= maxAttempts) {
    const backoffTime = 15000 * Math.pow(2, Math.min(nextAttempt - maxAttempts, 4)); // Exponential backoff
    await store.block(identifier.id, Date.now() + backoffTime, nextAttempt);

    logger.warn(`[RateLimit] ${type} rate limit exceeded - blocking`, {
      ip: identifier.ip,
      fingerprint: identifier.fingerprint.substring(0, 16),
      attempts: nextAttempt,
      blockDuration: backoffTime / 1000
    });

    return res.status(429).json({
      error: true,
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Too many ${type} attempts. Try again in ${Math.ceil(backoffTime / 1000)}s.`,
      retryAfter: Math.ceil(backoffTime / 1000),
      requiresCaptcha: true
    });
  }

  return res.status(429).json({
    error: true,
    code: 'RATE_LIMIT_EXCEEDED',
    message: `Too many ${type} attempts (${nextAttempt}/${maxAttempts}). Try again later.`,
    attemptsRemaining: maxAttempts - nextAttempt,
    requiresCaptcha: attempts >= Math.floor(maxAttempts / 2)
  });
}

/**
 * Record failed attempt
 */
async function recordFailedAttempt(identifier, store, maxAttempts, blockDuration, type) {
  try {
    const attempts = await store.recordAttempt(identifier.id);

    // Block if exceeded
    if (attempts >= maxAttempts) {
      const backoffTime = blockDuration(attempts - maxAttempts);
      await store.block(identifier.id, Date.now() + backoffTime, attempts);

      logger.warn(`[RateLimit] Blocking ${type} after ${attempts} failed attempts`, {
        ip: identifier.ip,
        blockDuration: backoffTime / 1000
      });
    }
  } catch (error) {
    logger.error('[RateLimit] Error recording attempt:', error);
  }
}

/**
 * Middleware to clear rate limit on success
 * Use after successful authentication
 */
export function clearRateLimit(req, res, next) {
  const identifier = req.rateLimit?.identifier;

  if (identifier) {
    const store = getRateLimitStore();
    store.clearAttempts(identifier);

    logger.debug(`[RateLimit] Cleared attempts for: ${identifier}`);
  }

  next();
}

/**
 * Enhanced login rate limiter
 */
export const enhancedLoginLimiter = createEnhancedRateLimiter({
  type: 'login',
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  blockDuration: (attempt) => Math.min(3600000, Math.pow(2, attempt) * 15000),
  onBlock: (req, identifier, attempts) => {
    logger.warn(`[RateLimit] Login blocked`, {
      ip: identifier.ip,
      fingerprint: identifier.fingerprint.substring(0, 16),
      attempts
    });
  }
});

/**
 * Enhanced vote rate limiter
 */
export const enhancedVoteRateLimiter = createEnhancedRateLimiter({
  type: 'vote',
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDuration: (attempt) => 3600000 * attempt, // Block increases by hour
  skipSuccessfulAuth: true
});

/**
 * Enhanced general rate limiter
 */
export const enhancedGeneralLimiter = createEnhancedRateLimiter({
  type: 'general',
  maxAttempts: 100,
  windowMs: 15 * 60 * 1000
});

export default {
  createEnhancedRateLimiter,
  getCompositeIdentifier,
  clearRateLimit,
  enhancedLoginLimiter,
  enhancedVoteRateLimiter,
  enhancedGeneralLimiter
};
