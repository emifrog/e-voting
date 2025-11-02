/**
 * Token Management Utility
 * Handles JWT token generation, verification, and refresh logic
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key';

// Store for refresh tokens (in production, use Redis or database)
const refreshTokenStore = new Map();

/**
 * Generate access and refresh tokens
 * @param {Object} user - User object {id, email, role}
 * @param {Object} options - {rememberMe: boolean}
 * @returns {Object} - {accessToken, refreshToken, expiresIn}
 */
export function generateTokenPair(user, options = {}) {
  const { rememberMe = false } = options;

  // Access token: 1 hour expiry (or 7 days if rememberMe)
  const accessTokenExpiresIn = rememberMe ? '7d' : '1h';
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: accessTokenExpiresIn }
  );

  // Refresh token: 7 days expiry (or 30 days if rememberMe)
  const refreshTokenExpiresIn = rememberMe ? '30d' : '7d';
  const refreshToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: 'refresh'
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: refreshTokenExpiresIn }
  );

  // Store refresh token (with expiry time)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

  refreshTokenStore.set(refreshToken, {
    userId: user.id,
    userEmail: user.email,
    expiresAt,
    createdAt: new Date()
  });

  const getExpiresInSeconds = (tokenExpiresIn) => {
    if (tokenExpiresIn.includes('h')) {
      return parseInt(tokenExpiresIn) * 3600;
    } else if (tokenExpiresIn.includes('d')) {
      return parseInt(tokenExpiresIn) * 86400;
    }
    return 3600;
  };

  return {
    accessToken,
    refreshToken,
    expiresIn: getExpiresInSeconds(accessTokenExpiresIn),
    type: 'Bearer'
  };
}

/**
 * Verify access token
 * @param {string} token - Token to verify
 * @returns {Object} - Decoded token
 * @throws {Error} If token is invalid or expired
 */
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('ACCESS_TOKEN_EXPIRED');
    }
    throw new Error('INVALID_TOKEN');
  }
}

/**
 * Verify refresh token
 * @param {string} token - Refresh token to verify
 * @returns {Object} - Decoded token
 * @throws {Error} If token is invalid or expired
 */
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Check if token is in store and not blacklisted
    const tokenData = refreshTokenStore.get(token);
    if (!tokenData) {
      throw new Error('Token not found in store');
    }

    if (new Date() > tokenData.expiresAt) {
      refreshTokenStore.delete(token);
      throw new Error('Token expired');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('REFRESH_TOKEN_EXPIRED');
    }
    throw new Error('INVALID_REFRESH_TOKEN');
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @param {Object} user - User data from database
 * @returns {Object} - New token pair
 * @throws {Error} If refresh token is invalid
 */
export function refreshAccessToken(refreshToken, user) {
  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Generate new token pair (maintain rememberMe status)
  const tokenData = refreshTokenStore.get(refreshToken);
  const rememberMe = tokenData.expiresAt.getTime() - new Date().getTime() > 7 * 86400 * 1000;

  return generateTokenPair(user, { rememberMe });
}

/**
 * Revoke/blacklist a refresh token
 * @param {string} refreshToken - Token to revoke
 */
export function revokeRefreshToken(refreshToken) {
  refreshTokenStore.delete(refreshToken);
}

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId - User ID
 */
export function revokeAllUserTokens(userId) {
  for (const [token, data] of refreshTokenStore.entries()) {
    if (data.userId === userId) {
      refreshTokenStore.delete(token);
    }
  }
}

/**
 * Check if token is about to expire (within 5 minutes)
 * @param {Object} decoded - Decoded token
 * @returns {boolean}
 */
export function isTokenNearExpiry(decoded) {
  if (!decoded.exp) return false;

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = decoded.exp - now;
  const fiveMinutes = 5 * 60;

  return expiresIn < fiveMinutes && expiresIn > 0;
}

/**
 * Get remaining time for token expiry
 * @param {Object} decoded - Decoded token
 * @returns {number} - Milliseconds until expiry
 */
export function getTokenExpiryTime(decoded) {
  if (!decoded.exp) return -1;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, (decoded.exp - now) * 1000);
}

/**
 * Legacy function for backward compatibility
 * Generates simple token (no refresh)
 */
export function generateSimpleToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

export default {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  isTokenNearExpiry,
  getTokenExpiryTime,
  generateSimpleToken
};
