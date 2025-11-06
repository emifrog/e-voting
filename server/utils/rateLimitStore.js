/**
 * Rate Limit Store
 * Abstraction layer for rate limiting data storage
 *
 * Supports both:
 * - In-memory store (development, single-server)
 * - Redis store (production, multi-server)
 */

/**
 * In-Memory Rate Limit Store (Development)
 */
class InMemoryRateLimitStore {
  constructor() {
    this.attempts = new Map();
    this.blocks = new Map();
    this.startCleanupTimer();
  }

  /**
   * Start periodic cleanup of expired data
   */
  startCleanupTimer() {
    // Clean up expired blocks every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Record a failed attempt
   */
  recordAttempt(key, timestamp = Date.now()) {
    const attempt = this.attempts.get(key) || { count: 0, lastAttempt: null };
    attempt.count++;
    attempt.lastAttempt = timestamp;
    this.attempts.set(key, attempt);

    return attempt.count;
  }

  /**
   * Get attempt count
   */
  getAttempts(key) {
    const attempt = this.attempts.get(key);
    return attempt?.count || 0;
  }

  /**
   * Block an identifier
   */
  block(key, until, attempts) {
    this.blocks.set(key, { until, attempts });
  }

  /**
   * Check if identifier is blocked
   */
  isBlocked(key) {
    const block = this.blocks.get(key);

    if (!block) {
      return null;
    }

    // Check if block expired
    if (Date.now() > block.until) {
      this.blocks.delete(key);
      this.attempts.delete(key);
      return null;
    }

    return block;
  }

  /**
   * Get remaining block time in seconds
   */
  getBlockRemaining(key) {
    const block = this.isBlocked(key);
    if (!block) return 0;

    return Math.ceil((block.until - Date.now()) / 1000);
  }

  /**
   * Clear all data for a key
   */
  clear(key) {
    this.attempts.delete(key);
    this.blocks.delete(key);
  }

  /**
   * Clear failed attempts (on success)
   */
  clearAttempts(key) {
    this.attempts.delete(key);
  }

  /**
   * Cleanup expired blocks
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, block] of this.blocks.entries()) {
      if (now > block.until) {
        this.blocks.delete(key);
        this.attempts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[RateLimitStore] Cleaned ${cleaned} expired blocks`);
    }

    return cleaned;
  }

  /**
   * Get stats
   */
  stats() {
    return {
      totalAttempts: this.attempts.size,
      totalBlocks: this.blocks.size,
      storeType: 'in-memory'
    };
  }

  /**
   * Shutdown
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.attempts.clear();
    this.blocks.clear();
  }
}

/**
 * Redis Rate Limit Store (Production)
 */
class RedisRateLimitStore {
  constructor(redisClient) {
    this.client = redisClient;
    this.keyPrefix = 'ratelimit:';
    this.blockPrefix = 'ratelimit:block:';
  }

  /**
   * Record a failed attempt
   */
  async recordAttempt(key, timestamp = Date.now()) {
    const redisKey = `${this.keyPrefix}${key}`;

    try {
      // Increment counter with TTL
      const count = await this.client.incr(redisKey);

      // Set expiration to 1 hour if first increment
      if (count === 1) {
        await this.client.expire(redisKey, 3600);
      }

      return count;
    } catch (error) {
      console.error('[RateLimitStore] Error recording attempt:', error);
      throw error;
    }
  }

  /**
   * Get attempt count
   */
  async getAttempts(key) {
    const redisKey = `${this.keyPrefix}${key}`;

    try {
      const count = await this.client.get(redisKey);
      return parseInt(count) || 0;
    } catch (error) {
      console.error('[RateLimitStore] Error getting attempts:', error);
      return 0;
    }
  }

  /**
   * Block an identifier
   */
  async block(key, until, attempts) {
    const redisKey = `${this.blockPrefix}${key}`;

    try {
      const ttl = Math.ceil((until - Date.now()) / 1000);

      if (ttl > 0) {
        await this.client.setex(
          redisKey,
          ttl,
          JSON.stringify({ until, attempts })
        );
      }
    } catch (error) {
      console.error('[RateLimitStore] Error blocking:', error);
      throw error;
    }
  }

  /**
   * Check if identifier is blocked
   */
  async isBlocked(key) {
    const redisKey = `${this.blockPrefix}${key}`;

    try {
      const blockData = await this.client.get(redisKey);

      if (!blockData) {
        return null;
      }

      return JSON.parse(blockData);
    } catch (error) {
      console.error('[RateLimitStore] Error checking block:', error);
      return null;
    }
  }

  /**
   * Get remaining block time in seconds
   */
  async getBlockRemaining(key) {
    const redisKey = `${this.blockPrefix}${key}`;

    try {
      const ttl = await this.client.ttl(redisKey);

      if (ttl <= 0) {
        return 0;
      }

      return ttl;
    } catch (error) {
      console.error('[RateLimitStore] Error getting block remaining:', error);
      return 0;
    }
  }

  /**
   * Clear all data for a key
   */
  async clear(key) {
    try {
      await Promise.all([
        this.client.del(`${this.keyPrefix}${key}`),
        this.client.del(`${this.blockPrefix}${key}`)
      ]);
    } catch (error) {
      console.error('[RateLimitStore] Error clearing:', error);
      throw error;
    }
  }

  /**
   * Clear failed attempts
   */
  async clearAttempts(key) {
    try {
      await this.client.del(`${this.keyPrefix}${key}`);
    } catch (error) {
      console.error('[RateLimitStore] Error clearing attempts:', error);
      throw error;
    }
  }

  /**
   * Get stats
   */
  async stats() {
    try {
      const keys = await this.client.keys(`${this.keyPrefix}*`);
      const blocks = await this.client.keys(`${this.blockPrefix}*`);

      return {
        totalAttempts: keys.length,
        totalBlocks: blocks.length,
        storeType: 'redis'
      };
    } catch (error) {
      console.error('[RateLimitStore] Error getting stats:', error);
      return {
        storeType: 'redis',
        error: error.message
      };
    }
  }

  /**
   * Shutdown
   */
  async shutdown() {
    // Don't close Redis client - it may be used elsewhere
  }
}

/**
 * Factory function to create appropriate store
 */
export function createRateLimitStore(redisClient = null) {
  if (redisClient && process.env.NODE_ENV === 'production') {
    console.log('[RateLimitStore] Using Redis backend');
    return new RedisRateLimitStore(redisClient);
  }

  console.log('[RateLimitStore] Using in-memory backend');
  return new InMemoryRateLimitStore();
}

/**
 * Singleton instance
 */
let rateLimitStore = null;

/**
 * Get or create the rate limit store
 */
export function getRateLimitStore(redisClient = null) {
  if (!rateLimitStore) {
    rateLimitStore = createRateLimitStore(redisClient);
  }
  return rateLimitStore;
}

/**
 * Reset the store (for testing)
 */
export function resetRateLimitStore() {
  if (rateLimitStore) {
    if (rateLimitStore.shutdown) {
      rateLimitStore.shutdown();
    }
  }
  rateLimitStore = null;
}

export { InMemoryRateLimitStore, RedisRateLimitStore };
export default getRateLimitStore;
