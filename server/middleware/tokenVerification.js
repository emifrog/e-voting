/**
 * Token Verification Middleware
 * Handles access token verification with expiry checks
 * Includes refresh token logic
 */

import {
  verifyAccessToken,
  isTokenNearExpiry,
  refreshAccessToken
} from '../utils/tokenManager.js';

/**
 * Middleware to verify access token and handle expiry
 * If token is near expiry, includes refreshed token in response headers
 */
export const verifyTokenMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: true,
        code: 'NO_TOKEN',
        message: 'Token manquant'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    req.user = decoded;

    // Check if token is near expiry
    if (isTokenNearExpiry(decoded)) {
      // Add warning header to frontend
      res.setHeader('X-Token-Warning', 'near-expiry');
    }

    next();
  } catch (error) {
    if (error.message === 'ACCESS_TOKEN_EXPIRED') {
      return res.status(401).json({
        error: true,
        code: 'TOKEN_EXPIRED',
        message: 'Votre session a expiré. Veuillez vous reconnecter.',
        needsLogin: true
      });
    }

    return res.status(401).json({
      error: true,
      code: 'INVALID_TOKEN',
      message: 'Token invalide'
    });
  }
};

/**
 * Middleware to require valid token
 * Used as: router.get('/protected', requireAuth, handler)
 */
export const requireAuth = verifyTokenMiddleware;

/**
 * Alias for backward compatibility with existing code
 */
export const authenticateToken = verifyTokenMiddleware;

export default {
  verifyTokenMiddleware,
  requireAuth,
  authenticateToken
};
