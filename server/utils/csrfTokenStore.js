/**
 * CSRF Token Store
 * Supports both in-memory (development) and Redis (production) backends
 *
 * In production, Redis should be used for:
 * - Distributed token storage across multiple servers
 * - Automatic expiration (TTL)
 * - Better performance
 * - Token sharing between instances
 */

import crypto from 'crypto';

/**
 * In-Memory Token Store (Development)
 */
class InMemoryTokenStore {
  constructor() {
    this.tokens = new Map();
    this.cleanupInterval = null;
    this.startCleanupTimer();
  }

  /**
   * Start periodic cleanup of expired tokens
   */
  startCleanupTimer() {
    // Clean up expired tokens every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 3600000);

    // Don't keep the process alive just for cleanup
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Generate a new token
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store a token
   */
  store(token, data, ttl = 3600000) {
    this.tokens.set(token, {
      ...data,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Retrieve a token
   */
  get(token) {
    const data = this.tokens.get(token);

    if (!data) {
      return null;
    }

    // Check if expired
    if (data.expiresAt < Date.now()) {
      this.tokens.delete(token);
      return null;
    }

    return data;
  }

  /**
   * Delete a token
   */
  delete(token) {
    return this.tokens.delete(token);
  }

  /**
   * Clear all tokens for a user
   */
  clearUserTokens(userId) {
    let cleared = 0;
    for (const [token, data] of this.tokens.entries()) {
      if (data.userId === userId) {
        this.tokens.delete(token);
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * Cleanup expired tokens
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, data] of this.tokens.entries()) {
      if (data.expiresAt < now) {
        this.tokens.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[CSRF Store] Cleaned ${cleaned} expired tokens`);
    }

    return cleaned;
  }

  /**
   * Get store statistics
   */
  stats() {
    return {
      totalTokens: this.tokens.size,
      storeType: 'in-memory'
    };
  }

  /**
   * Shutdown the store
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.tokens.clear();
  }
}

/**
 * Redis Token Store (Production)
 * Requires redis package to be installed
 */
class RedisTokenStore {
  constructor(redisClient) {
    this.client = redisClient;
    this.keyPrefix = 'csrf:token:';
    this.userKeyPrefix = 'csrf:user:';
  }

  /**
   * Generate a new token
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store a token
   */
  async store(token, data, ttl = 3600) {
    const key = `${this.keyPrefix}${token}`;
    const value = JSON.stringify({
      ...data,
      createdAt: Date.now()
    });

    try {
      // Store with TTL (automatic expiration)
      await this.client.setex(key, ttl, value);

      // Also track user's tokens for bulk operations
      if (data.userId) {
        const userKey = `${this.userKeyPrefix}${data.userId}`;
        await this.client.sadd(userKey, token);
        await this.client.expire(userKey, ttl);
      }
    } catch (error) {
      console.error('[CSRF Store] Error storing token:', error);
      throw error;
    }
  }

  /**
   * Retrieve a token
   */
  async get(token) {
    const key = `${this.keyPrefix}${token}`;

    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      console.error('[CSRF Store] Error retrieving token:', error);
      return null;
    }
  }

  /**
   * Delete a token
   */
  async delete(token) {
    const key = `${this.keyPrefix}${token}`;

    try {
      return await this.client.del(key) > 0;
    } catch (error) {
      console.error('[CSRF Store] Error deleting token:', error);
      throw error;
    }
  }

  /**
   * Clear all tokens for a user
   */
  async clearUserTokens(userId) {
    const userKey = `${this.userKeyPrefix}${userId}`;

    try {
      // Get all tokens for the user
      const tokens = await this.client.smembers(userKey);

      // Delete each token
      if (tokens.length > 0) {
        const keys = tokens.map(t => `${this.keyPrefix}${t}`);
        await this.client.del(...keys);
      }

      // Delete the user key
      await this.client.del(userKey);

      return tokens.length;
    } catch (error) {
      console.error('[CSRF Store] Error clearing user tokens:', error);
      throw error;
    }
  }

  /**
   * Get store statistics
   */
  async stats() {
    try {
      // Count tokens by pattern (note: KEYS is not recommended for production)
      // Better to track this separately in a counter
      return {
        storeType: 'redis',
        backendUrl: this.client.options?.url || 'unknown'
      };
    } catch (error) {
      console.error('[CSRF Store] Error getting stats:', error);
      return { storeType: 'redis', error: error.message };
    }
  }

  /**
   * Shutdown the store
   */
  async shutdown() {
    // Don't close Redis client here - it may be used elsewhere
    // Just ensure any pending operations complete
  }
}

/**
 * Factory function to create appropriate token store
 */
export function createTokenStore(redisClient = null) {
  if (redisClient && process.env.NODE_ENV === 'production') {
    console.log('[CSRF Store] Using Redis backend');
    return new RedisTokenStore(redisClient);
  }

  console.log('[CSRF Store] Using in-memory backend');
  return new InMemoryTokenStore();
}

/**
 * Singleton instance (lazy-loaded)
 */
let tokenStore = null;

/**
 * Get or create the token store instance
 */
export function getTokenStore(redisClient = null) {
  if (!tokenStore) {
    tokenStore = createTokenStore(redisClient);
  }
  return tokenStore;
}

/**
 * Reset the token store (mainly for testing)
 */
export function resetTokenStore() {
  if (tokenStore) {
    if (tokenStore.shutdown) {
      tokenStore.shutdown();
    }
  }
  tokenStore = null;
}

export { InMemoryTokenStore, RedisTokenStore };
export default getTokenStore;
