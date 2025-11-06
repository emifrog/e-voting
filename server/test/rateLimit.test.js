/**
 * Advanced Rate Limiting Tests
 * Covers device fingerprinting, blocking, and spoofing detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createServerFingerprint,
  detectSpoofing,
  getFingerprintComponents,
  calculateEntropy
} from '../utils/deviceFingerprint.js';
import { InMemoryRateLimitStore } from '../utils/rateLimitStore.js';

describe('Device Fingerprinting', () => {
  let req;

  beforeEach(() => {
    req = {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'gzip, deflate',
        'accept': 'application/json'
      },
      ip: '192.168.1.100',
      connection: { remoteAddress: '192.168.1.100' }
    };
  });

  describe('createServerFingerprint', () => {
    it('should create consistent fingerprint for same request', () => {
      const fp1 = createServerFingerprint(req);
      const fp2 = createServerFingerprint(req);

      expect(fp1).toBe(fp2);
      expect(fp1.length).toBe(64); // SHA-256 hex length
    });

    it('should create different fingerprint for different IP', () => {
      const fp1 = createServerFingerprint(req);

      req.ip = '10.0.0.1';
      const fp2 = createServerFingerprint(req);

      expect(fp1).not.toBe(fp2);
    });

    it('should create different fingerprint for different user agent', () => {
      const fp1 = createServerFingerprint(req);

      req.headers['user-agent'] = 'Mozilla/5.0 (X11; Linux x86_64)';
      const fp2 = createServerFingerprint(req);

      expect(fp1).not.toBe(fp2);
    });

    it('should handle missing headers gracefully', () => {
      req.headers = {};

      const fp = createServerFingerprint(req);

      expect(fp).toBeDefined();
      expect(fp.length).toBe(64);
    });
  });

  describe('getFingerprintComponents', () => {
    it('should extract all components', () => {
      const components = getFingerprintComponents(req);

      expect(components).toHaveProperty('userAgent');
      expect(components).toHaveProperty('acceptLanguage');
      expect(components).toHaveProperty('ip');
      expect(components).toHaveProperty('acceptEncoding');
      expect(components).toHaveProperty('accept');
      expect(components).toHaveProperty('timestamp');
    });

    it('should handle missing headers', () => {
      req.headers = {};

      const components = getFingerprintComponents(req);

      expect(components.userAgent).toBeUndefined();
      expect(components.ip).toBeDefined();
    });
  });

  describe('detectSpoofing', () => {
    it('should detect headless browser', () => {
      const components = {
        userAgent: 'Mozilla/5.0 (Phantom/2.0)'
      };

      const result = detectSpoofing(components);

      expect(result.isSuspicious).toBe(true);
      expect(result.risk).toBe('high');
    });

    it('should detect Selenium webdriver', () => {
      const components = {
        userAgent: 'Mozilla/5.0 (webdriver)'
      };

      const result = detectSpoofing(components);

      expect(result.isSuspicious).toBe(true);
      expect(result.risk).toBe('high');
    });

    it('should detect bot user agents', () => {
      const components = {
        userAgent: 'Googlebot/2.1'
      };

      const result = detectSpoofing(components);

      expect(result.isSuspicious).toBe(true);
    });

    it('should detect curl/wget', () => {
      const components = {
        userAgent: 'curl/7.64.1'
      };

      const result = detectSpoofing(components);

      expect(result.isSuspicious).toBe(true);
    });

    it('should detect VPN user agents', () => {
      const components = {
        userAgent: 'Mozilla/5.0 (VPN-Client)'
      };

      const result = detectSpoofing(components);

      expect(result.isSuspicious).toBe(true);
      expect(result.risk).toBe('medium');
    });

    it('should allow normal user agents', () => {
      const components = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      const result = detectSpoofing(components);

      expect(result.isSuspicious).toBe(false);
      expect(result.risk).toBe('low');
    });

    it('should reject missing user agent', () => {
      const components = {
        userAgent: ''
      };

      const result = detectSpoofing(components);

      expect(result.isSuspicious).toBe(true);
      expect(result.risk).toBe('high');
    });

    it('should detect localhost', () => {
      const components = {
        ip: '127.0.0.1'
      };

      const result = detectSpoofing(components);

      expect(result.isSuspicious).toBe(false);
      expect(result.reason).toContain('Localhost');
    });
  });

  describe('calculateEntropy', () => {
    it('should give high entropy for complex user agent', () => {
      const components = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        acceptLanguage: 'en-US,en;q=0.9,fr;q=0.8',
        ip: '203.0.113.42',
        acceptEncoding: 'gzip, deflate, br'
      };

      const entropy = calculateEntropy(components);

      expect(entropy).toBeGreaterThan(50);
    });

    it('should give low entropy for minimal user agent', () => {
      const components = {
        userAgent: 'Bot'
      };

      const entropy = calculateEntropy(components);

      expect(entropy).toBeLessThan(30);
    });

    it('should give score between 0-100', () => {
      const components = {
        userAgent: 'Mozilla/5.0',
        acceptLanguage: 'en',
        ip: '192.168.1.1'
      };

      const entropy = calculateEntropy(components);

      expect(entropy).toBeGreaterThanOrEqual(0);
      expect(entropy).toBeLessThanOrEqual(100);
    });
  });
});

describe('Rate Limit Store', () => {
  let store;

  beforeEach(() => {
    store = new InMemoryRateLimitStore();
  });

  describe('recordAttempt', () => {
    it('should increment attempt count', async () => {
      const count1 = await store.recordAttempt('user-1');
      expect(count1).toBe(1);

      const count2 = await store.recordAttempt('user-1');
      expect(count2).toBe(2);
    });

    it('should track separate users', async () => {
      await store.recordAttempt('user-1');
      await store.recordAttempt('user-1');

      const count1 = await store.getAttempts('user-1');
      expect(count1).toBe(2);

      const count2 = await store.getAttempts('user-2');
      expect(count2).toBe(0);
    });
  });

  describe('block', () => {
    it('should block identifier', async () => {
      const until = Date.now() + 60000;
      await store.block('user-1', until, 5);

      const blocked = await store.isBlocked('user-1');
      expect(blocked).not.toBeNull();
      expect(blocked.attempts).toBe(5);
    });

    it('should not block if block time expired', async () => {
      const until = Date.now() - 1000; // Already expired
      await store.block('user-1', until, 5);

      const blocked = await store.isBlocked('user-1');
      expect(blocked).toBeNull();
    });

    it('should return remaining block time', async () => {
      const until = Date.now() + 60000;
      await store.block('user-1', until, 5);

      const remaining = await store.getBlockRemaining('user-1');
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(60);
    });
  });

  describe('clear', () => {
    it('should clear all data for identifier', async () => {
      await store.recordAttempt('user-1');
      const until = Date.now() + 60000;
      await store.block('user-1', until, 5);

      await store.clear('user-1');

      const attempts = await store.getAttempts('user-1');
      const blocked = await store.isBlocked('user-1');

      expect(attempts).toBe(0);
      expect(blocked).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should remove expired blocks', async () => {
      // Add expired block
      const expiredUntil = Date.now() - 1000;
      await store.block('user-1', expiredUntil, 5);

      // Add valid block
      const validUntil = Date.now() + 60000;
      await store.block('user-2', validUntil, 3);

      const cleaned = store.cleanup();

      expect(cleaned).toBe(1); // Only one expired

      const blocked1 = await store.isBlocked('user-1');
      const blocked2 = await store.isBlocked('user-2');

      expect(blocked1).toBeNull(); // Cleaned
      expect(blocked2).not.toBeNull(); // Still there
    });
  });
});

describe('Rate Limiting Attack Prevention', () => {
  let store;

  beforeEach(() => {
    store = new InMemoryRateLimitStore();
  });

  it('should prevent brute force attacks', async () => {
    const identifier = 'user:192.168.1.100:fingerprint';
    const maxAttempts = 5;

    // Simulate 7 failed login attempts
    for (let i = 0; i < 7; i++) {
      const attempts = await store.recordAttempt(identifier);

      if (attempts >= maxAttempts) {
        const blockTime = Date.now() + 60000;
        await store.block(identifier, blockTime, attempts);

        if (i === 4) {
          // After 5 attempts, should be blocked
          const blocked = await store.isBlocked(identifier);
          expect(blocked).not.toBeNull();
        }
      }
    }

    const finalBlocked = await store.isBlocked(identifier);
    expect(finalBlocked).not.toBeNull();
  });

  it('should handle distributed attacks with device fingerprinting', async () => {
    // Same device, different IPs
    const fingerprint = 'abcdef123456';

    // Attempt 1: IP 1
    const id1 = `login:192.168.1.1:${fingerprint}`;
    await store.recordAttempt(id1);

    // Attempt 2: IP 2 (same device)
    const id2 = `login:192.168.1.2:${fingerprint}`;
    await store.recordAttempt(id2);

    // Both should be tracked separately by IP
    const attempts1 = await store.getAttempts(id1);
    const attempts2 = await store.getAttempts(id2);

    expect(attempts1).toBe(1);
    expect(attempts2).toBe(1);

    // But fingerprint is same, allowing correlation
  });

  it('should prevent double voting', async () => {
    const voterToken = 'voter-token-123';
    const voteKey = `vote:${voterToken}`;

    // First vote
    const attempts1 = await store.recordAttempt(voteKey);
    if (attempts1 >= 1) {
      // Block on first attempt for voting
      const blockTime = Date.now() + 86400000; // 24 hours
      await store.block(voteKey, blockTime, 1);
    }

    // Second vote attempt
    const blocked = await store.isBlocked(voteKey);
    expect(blocked).not.toBeNull(); // Should be blocked
  });

  it('should allow legitimate use after block expires', async () => {
    const identifier = 'user-123';

    // Record attempts and block
    for (let i = 0; i < 5; i++) {
      await store.recordAttempt(identifier);
    }

    const expiredUntil = Date.now() - 1000; // Block expired
    await store.block(identifier, expiredUntil, 5);

    // Should not be blocked
    const blocked = await store.isBlocked(identifier);
    expect(blocked).toBeNull();

    // Should be able to attempt again
    const newAttempts = await store.recordAttempt(identifier);
    expect(newAttempts).toBe(6); // Previous count + 1
  });
});

describe('Exponential Backoff', () => {
  it('should increase backoff time exponentially', () => {
    const getBackoffTime = (attempt) => {
      return Math.min(3600000, Math.pow(2, attempt) * 15000);
    };

    const backoff1 = getBackoffTime(0); // 15 sec
    const backoff2 = getBackoffTime(1); // 30 sec
    const backoff3 = getBackoffTime(2); // 60 sec
    const backoff4 = getBackoffTime(3); // 120 sec

    expect(backoff2).toBe(backoff1 * 2);
    expect(backoff3).toBe(backoff2 * 2);
    expect(backoff4).toBe(backoff3 * 2);
  });

  it('should cap backoff time at maximum', () => {
    const getBackoffTime = (attempt) => {
      return Math.min(3600000, Math.pow(2, attempt) * 15000);
    };

    const backoff10 = getBackoffTime(10);
    const maxBackoff = 3600000;

    expect(backoff10).toBeLessThanOrEqual(maxBackoff);
  });
});
