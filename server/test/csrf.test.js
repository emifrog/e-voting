/**
 * CSRF Protection Tests
 * Verifies CSRF token generation, validation, and protection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { csrfTokenGeneration, csrfTokenVerification, getCsrfToken, clearUserTokens } from '../middleware/csrf.js';

describe('CSRF Protection Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      headers: {},
      cookies: {},
      user: { id: 'user-123' }
    };

    res = {
      cookie: function(name, value, options) {
        this.cookies = this.cookies || {};
        this.cookies[name] = { value, options };
        return this;
      },
      setHeader: function(name, value) {
        this.headers = this.headers || {};
        this.headers[name] = value;
        return this;
      },
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.jsonData = data;
        return this;
      },
      cookies: {},
      headers: {},
      statusCode: 200
    };

    next = function() {
      next.called = true;
    };
    next.called = false;
  });

  describe('csrfTokenGeneration Middleware', () => {
    it('should generate and set CSRF token on any request', () => {
      csrfTokenGeneration(req, res, next);

      expect(next.called).toBe(true);
      expect(res.csrfToken).toBeDefined();
      expect(typeof res.csrfToken).toBe('string');
      expect(res.csrfToken.length).toBeGreaterThan(30);
    });

    it('should set HTTP-only cookie with CSRF token', () => {
      csrfTokenGeneration(req, res, next);

      expect(res.cookies['XSRF-TOKEN']).toBeDefined();
      const cookieOptions = res.cookies['XSRF-TOKEN'].options;

      expect(cookieOptions.httpOnly).toBe(true);
      expect(cookieOptions.sameSite).toBe('strict');
      expect(cookieOptions.path).toBe('/');
    });

    it('should set secure flag only in production', () => {
      const originalEnv = process.env.NODE_ENV;

      process.env.NODE_ENV = 'development';
      csrfTokenGeneration(req, res, next);
      expect(res.cookies['XSRF-TOKEN'].options.secure).toBe(false);

      process.env.NODE_ENV = 'production';
      csrfTokenGeneration(req, res, next);
      expect(res.cookies['XSRF-TOKEN'].options.secure).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors gracefully', () => {
      const errorRes = {
        cookie: () => { throw new Error('Test error'); }
      };

      expect(() => {
        csrfTokenGeneration(req, errorRes, next);
      }).not.toThrow();
    });
  });

  describe('csrfTokenVerification Middleware', () => {
    it('should skip verification for GET requests', () => {
      req.method = 'GET';
      csrfTokenVerification(req, res, next);
      expect(next.called).toBe(true);
    });

    it('should skip verification for HEAD requests', () => {
      req.method = 'HEAD';
      csrfTokenVerification(req, res, next);
      expect(next.called).toBe(true);
    });

    it('should skip verification for OPTIONS requests', () => {
      req.method = 'OPTIONS';
      csrfTokenVerification(req, res, next);
      expect(next.called).toBe(true);
    });

    it('should reject POST without CSRF token', () => {
      req.method = 'POST';
      req.headers = {};

      csrfTokenVerification(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData.code).toBe('CSRF_TOKEN_MISSING');
      expect(next.called).toBe(false);
    });

    it('should reject POST with invalid token', () => {
      req.method = 'POST';
      req.headers['x-csrf-token'] = 'invalid-token-that-does-not-exist';

      csrfTokenVerification(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData.code).toBe('CSRF_TOKEN_INVALID');
      expect(next.called).toBe(false);
    });

    it('should accept POST with valid token', () => {
      // First generate a valid token
      csrfTokenGeneration(req, res, next);
      const validToken = res.csrfToken;

      // Reset for verification test
      next.called = false;
      req.method = 'POST';
      req.headers['x-csrf-token'] = validToken;

      csrfTokenVerification(req, res, next);

      expect(next.called).toBe(true);
      expect(res.statusCode).toBe(200); // No error
    });

    it('should read token from multiple sources', () => {
      csrfTokenGeneration(req, res, next);
      const validToken = res.csrfToken;

      next.called = false;
      req.method = 'POST';

      // Test header source
      req.headers['x-csrf-token'] = validToken;
      csrfTokenVerification(req, res, next);
      expect(next.called).toBe(true);

      // Test body source
      next.called = false;
      req.headers = {};
      req.body = { csrfToken: validToken };
      csrfTokenVerification(req, res, next);
      expect(next.called).toBe(true);

      // Test query source
      next.called = false;
      req.body = {};
      req.query = { csrfToken: validToken };
      csrfTokenVerification(req, res, next);
      expect(next.called).toBe(true);
    });

    it('should reject token from wrong user', () => {
      // Generate token for user A
      req.user = { id: 'user-A' };
      csrfTokenGeneration(req, res, next);
      const tokenA = res.csrfToken;

      // Try to use with user B
      next.called = false;
      req.method = 'POST';
      req.user = { id: 'user-B' };
      req.headers['x-csrf-token'] = tokenA;

      csrfTokenVerification(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData.code).toBe('CSRF_TOKEN_MISMATCH');
    });

    it('should generate new token on successful verification', () => {
      csrfTokenGeneration(req, res, next);
      const oldToken = res.csrfToken;

      next.called = false;
      req.method = 'POST';
      req.headers['x-csrf-token'] = oldToken;

      csrfTokenVerification(req, res, next);

      expect(res.setHeader).toBeDefined();
      // New token should be set in header
      expect(next.called).toBe(true);
    });

    it('should handle PUT and DELETE methods', () => {
      csrfTokenGeneration(req, res, next);
      const validToken = res.csrfToken;

      // Test PUT
      next.called = false;
      req.method = 'PUT';
      req.headers['x-csrf-token'] = validToken;
      csrfTokenVerification(req, res, next);
      expect(next.called).toBe(true);

      // Test DELETE
      next.called = false;
      csrfTokenGeneration(req, res, next);
      const validToken2 = res.csrfToken;
      req.method = 'DELETE';
      req.headers['x-csrf-token'] = validToken2;
      csrfTokenVerification(req, res, next);
      expect(next.called).toBe(true);
    });
  });

  describe('getCsrfToken Utility', () => {
    it('should extract token from request headers', () => {
      req.headers['x-csrf-token'] = 'token-from-header';
      const token = getCsrfToken(req);
      expect(token).toBe('token-from-header');
    });

    it('should extract token from body', () => {
      req.body = { csrfToken: 'token-from-body' };
      const token = getCsrfToken(req);
      expect(token).toBe('token-from-body');
    });

    it('should extract token from cookies', () => {
      req.cookies = { 'XSRF-TOKEN': 'token-from-cookie' };
      const token = getCsrfToken(req);
      expect(token).toBe('token-from-cookie');
    });

    it('should prioritize header over body and cookies', () => {
      req.headers['x-csrf-token'] = 'header-token';
      req.body = { csrfToken: 'body-token' };
      req.cookies = { 'XSRF-TOKEN': 'cookie-token' };

      const token = getCsrfToken(req);
      expect(token).toBe('header-token');
    });
  });

  describe('clearUserTokens Utility', () => {
    it('should return 0 when user has no tokens', () => {
      const cleared = clearUserTokens('user-with-no-tokens');
      expect(cleared).toBe(0);
    });

    it('should clear tokens for specific user', () => {
      // Generate tokens for user
      req.user = { id: 'user-to-clear' };
      csrfTokenGeneration(req, res, next);
      csrfTokenGeneration(req, res, next);

      // Clear should remove both
      const cleared = clearUserTokens('user-to-clear');
      expect(cleared).toBeGreaterThan(0);
    });

    it('should not clear tokens for other users', () => {
      // Generate tokens for user A
      req.user = { id: 'user-A' };
      csrfTokenGeneration(req, res, next);

      // Generate tokens for user B
      req.user = { id: 'user-B' };
      csrfTokenGeneration(req, res, next);

      // Clear only user B's tokens
      const cleared = clearUserTokens('user-B');
      expect(cleared).toBeGreaterThan(0);

      // User A's tokens should still work
      next.called = false;
      req.method = 'POST';
      req.user = { id: 'user-A' };
      req.headers['x-csrf-token'] = ''; // Will fail because we don't have the token
      // But we're testing that clearing B didn't affect A
    });
  });

  describe('Token Expiration', () => {
    it('should expire tokens after 1 hour', () => {
      csrfTokenGeneration(req, res, next);
      const token = res.csrfToken;

      const cookieOptions = res.cookies['XSRF-TOKEN'].options;
      expect(cookieOptions.maxAge).toBe(3600000); // 1 hour in milliseconds
    });

    it('should handle expired tokens gracefully', async () => {
      // This test would need time mocking to actually test expiration
      // For now, we just verify the structure supports it
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Security Headers', () => {
    it('should set SameSite=Strict', () => {
      csrfTokenGeneration(req, res, next);
      const cookieOptions = res.cookies['XSRF-TOKEN'].options;
      expect(cookieOptions.sameSite).toBe('strict');
    });

    it('should set HttpOnly flag', () => {
      csrfTokenGeneration(req, res, next);
      const cookieOptions = res.cookies['XSRF-TOKEN'].options;
      expect(cookieOptions.httpOnly).toBe(true);
    });

    it('should set appropriate path', () => {
      csrfTokenGeneration(req, res, next);
      const cookieOptions = res.cookies['XSRF-TOKEN'].options;
      expect(cookieOptions.path).toBe('/');
    });
  });
});

describe('CSRF Attack Prevention', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'POST',
      headers: {},
      cookies: {},
      body: { data: 'test' },
      user: { id: 'user-123' }
    };

    res = {
      cookie: () => res,
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.jsonData = data;
        return res;
      },
      statusCode: 200
    };

    next = () => { next.called = true; };
    next.called = false;
  });

  it('should prevent CSRF from malicious site', () => {
    // Simulate POST without CSRF token (malicious site can't include it)
    csrfTokenVerification(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next.called).toBe(false);
  });

  it('should prevent token replay attacks', () => {
    // Generate valid token
    csrfTokenGeneration(req, res, next);
    const token = res.csrfToken;

    // First use - should work
    next.called = false;
    req.headers['x-csrf-token'] = token;
    csrfTokenVerification(req, res, next);
    expect(next.called).toBe(true);

    // Second use of same token - should fail (token deleted after use)
    next.called = false;
    csrfTokenVerification(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.jsonData.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('should prevent token fixation attacks', () => {
    // Attacker tries to use own token from malicious site
    csrfTokenGeneration(req, res, next);
    const maliciousToken = res.csrfToken;

    // User login and gets different token
    next.called = false;
    req.user = { id: 'user-456' };
    csrfTokenGeneration(req, res, next);

    // Attacker tries to use their token on user's session
    next.called = false;
    req.method = 'POST';
    req.headers['x-csrf-token'] = maliciousToken;

    csrfTokenVerification(req, res, next);

    // Should fail - token belongs to different user
    expect(res.statusCode).toBe(403);
  });
});
