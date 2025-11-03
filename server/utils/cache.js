/**
 * Caching Service
 * Provides in-memory caching for election results and frequently accessed data
 *
 * Features:
 * - Automatic expiration with TTL
 * - Cache invalidation for dependencies
 * - Memory-efficient with configurable limits
 * - Statistics tracking
 */

import NodeCache from 'node-cache';

// Initialize cache with default options
// stdTTL: 1 hour (3600 seconds) - default time-to-live
// checkperiod: 10 minutes (600 seconds) - automatic cleanup interval
const cache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 600,
  useClones: true, // Clone objects to prevent external modification
  maxKeys: 10000   // Maximum number of keys
});

/**
 * Cache key generators for consistency
 */
export const cacheKeys = {
  // Election results
  electionResults: (electionId) => `results:${electionId}`,
  electionStats: (electionId) => `stats:${electionId}`,

  // Voter data
  electionVoters: (electionId) => `voters:${electionId}`,
  voterCount: (electionId) => `voter_count:${electionId}`,

  // Election data
  election: (electionId) => `election:${electionId}`,
  electionsList: (userId) => `elections:${userId}`,
  electionOptions: (electionId) => `options:${electionId}`,

  // Aggregate data
  allResults: (electionId) => `all_results:${electionId}`,
  voterStats: (electionId) => `voter_stats:${electionId}`
};

/**
 * Cache invalidation patterns for related data
 */
const invalidationPatterns = {
  // When vote is cast, invalidate results
  vote_cast: (electionId) => [
    cacheKeys.electionResults(electionId),
    cacheKeys.electionStats(electionId),
    cacheKeys.allResults(electionId),
    cacheKeys.voterStats(electionId)
  ],

  // When election is updated, invalidate election data
  election_updated: (electionId, userId) => [
    cacheKeys.election(electionId),
    cacheKeys.electionsList(userId),
    cacheKeys.electionOptions(electionId)
  ],

  // When voters are added/modified, invalidate voter data
  voters_updated: (electionId, userId) => [
    cacheKeys.electionVoters(electionId),
    cacheKeys.voterCount(electionId),
    cacheKeys.electionStats(electionId),
    cacheKeys.voterStats(electionId),
    cacheKeys.electionsList(userId)
  ],

  // When election status changes
  election_status_changed: (electionId, userId) => [
    cacheKeys.election(electionId),
    cacheKeys.electionsList(userId),
    cacheKeys.electionStats(electionId),
    cacheKeys.voterStats(electionId)
  ]
};

/**
 * Get cached value or fetch from provider function
 * @param {string} key - Cache key
 * @param {Function} provider - Async function to fetch data if not cached
 * @param {number} ttl - Optional custom TTL in seconds
 * @returns {Promise} - Cached or fetched data
 */
export async function getCachedOrFetch(key, provider, ttl = undefined) {
  try {
    // Check cache
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // Fetch from provider
    const data = await provider();

    // Store in cache
    if (ttl !== undefined) {
      cache.set(key, data, ttl);
    } else {
      cache.set(key, data);
    }

    return data;
  } catch (error) {
    console.error(`Cache error for key ${key}:`, error);
    // Return promise rejection to caller
    throw error;
  }
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - TTL in seconds (optional)
 */
export function setCached(key, value, ttl = undefined) {
  try {
    if (ttl !== undefined) {
      cache.set(key, value, ttl);
    } else {
      cache.set(key, value);
    }
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
  }
}

/**
 * Get value from cache without fallback
 * @param {string} key - Cache key
 * @returns {*} - Cached value or undefined
 */
export function getCached(key) {
  return cache.get(key);
}

/**
 * Invalidate specific cache keys
 * @param {string|Array} keys - Single key or array of keys
 */
export function invalidateCache(keys) {
  if (typeof keys === 'string') {
    cache.del(keys);
  } else if (Array.isArray(keys)) {
    cache.del(keys);
  }
}

/**
 * Invalidate related data based on event type
 * @param {string} eventType - Type of event (e.g., 'vote_cast', 'election_updated')
 * @param {string} electionId - Election ID
 * @param {string} userId - User ID (optional)
 */
export function invalidateRelated(eventType, electionId, userId = null) {
  const pattern = invalidationPatterns[eventType];
  if (pattern) {
    const keysToInvalidate = pattern(electionId, userId);
    invalidateCache(keysToInvalidate);
  }
}

/**
 * Clear all cache
 */
export function clearAll() {
  cache.flushAll();
}

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
export function getStats() {
  return {
    keys: cache.keys().length,
    stats: cache.getStats(),
    memory: {
      estimate: cache.keys().length * 500 + ' bytes (approx)' // ~500 bytes per key average
    }
  };
}

/**
 * Set custom TTL for different data types
 */
export const ttlConfig = {
  // Results: 30 minutes (changes frequently if voting active)
  RESULTS: 1800,

  // Election stats: 15 minutes (computed from votes)
  STATS: 900,

  // Voter list: 1 hour (doesn't change during voting)
  VOTERS: 3600,

  // Election data: 6 hours (rarely changes)
  ELECTION: 21600,

  // Election list: 1 hour (can change)
  ELECTIONS_LIST: 3600,

  // Options: 6 hours (doesn't change)
  OPTIONS: 21600,

  // Voter stats: 30 minutes
  VOTER_STATS: 1800
};

/**
 * Middleware to add cache utilities to request
 */
export function cacheMiddleware(req, res, next) {
  res.locals.cache = {
    get: getCached,
    set: setCached,
    getOrFetch: getCachedOrFetch,
    invalidate: invalidateCache,
    invalidateRelated: invalidateRelated
  };
  next();
}

export default {
  getCached,
  getCachedOrFetch,
  setCached,
  invalidateCache,
  invalidateRelated,
  clearAll,
  getStats,
  cacheKeys,
  ttlConfig,
  cacheMiddleware
};
