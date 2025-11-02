import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import { validatePasswordOrThrow } from '../utils/passwordValidator.js';
import {
  generateTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens
} from '../utils/tokenManager.js';
import { verifyTokenMiddleware } from '../middleware/tokenVerification.js';
import {
  onLoginSuccess,
  onLoginFailure
} from '../middleware/advancedRateLimit.js';

const router = express.Router();

/**
 * POST /api/auth/register - Inscription admin
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation des données
    if (!email || !password || !name) {
      return res.status(400).json({
        error: true,
        code: 'MISSING_FIELDS',
        message: 'Email, mot de passe et nom requis'
      });
    }

    // Validate password strength
    try {
      validatePasswordOrThrow(password);
    } catch (error) {
      return res.status(400).json({
        error: true,
        code: 'PASSWORD_WEAK',
        message: error.message,
        details: 'Le mot de passe doit contenir: 12+ caractères, majuscule, minuscule, chiffre, caractère spécial'
      });
    }

    // Vérifier si l'email existe déjà
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({
        error: true,
        code: 'DUPLICATE_EMAIL',
        message: 'Email déjà utilisé. Veuillez vous connecter ou utiliser une autre adresse email.'
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const userId = uuidv4();
    await db.run(`
      INSERT INTO users (id, email, password, name, role)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, email, hashedPassword, name, 'admin']);

    const newUser = { id: userId, email, name, role: 'admin' };
    const tokens = generateTokenPair(newUser, { rememberMe: false });

    res.status(201).json({
      message: 'Compte créé avec succès',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      type: tokens.type,
      user: newUser
    });
  } catch (error) {
    console.error('Erreur inscription détaillée:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

/**
 * POST /api/auth/login - Connexion admin
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, twoFactorToken, rememberMe = false } = req.body;

    // Trouver l'utilisateur
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({
        error: true,
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      // Track failed login attempt
      const failureInfo = onLoginFailure(req.ip);

      return res.status(401).json({
        error: true,
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect',
        attempts: failureInfo.attempts,
        blocked: failureInfo.blocked,
        retryAfter: failureInfo.blockInfo?.remaining
      });
    }

    // Si 2FA activé, vérifier le code
    if (user.two_factor_enabled) {
      if (!twoFactorToken) {
        // Demander le code 2FA
        return res.status(200).json({
          require2FA: true,
          userId: user.id,
          message: 'Code d\'authentification à deux facteurs requis'
        });
      }

      // Vérifier le code 2FA
      const { verifyToken } = await import('../services/twoFactor.js');
      const isValid = verifyToken(user.two_factor_secret, twoFactorToken);

      if (!isValid) {
        return res.status(401).json({
          error: true,
          code: 'INVALID_2FA',
          message: 'Code 2FA invalide'
        });
      }
    }

    // Generate new token pair
    const tokens = generateTokenPair(user, { rememberMe });

    // Track successful login (clear failed attempts)
    onLoginSuccess(req.ip);

    res.json({
      message: 'Connexion réussie',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      type: tokens.type,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        twoFactorEnabled: user.two_factor_enabled
      }
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      error: true,
      code: 'LOGIN_ERROR',
      message: 'Erreur lors de la connexion'
    });
  }
});

/**
 * POST /api/auth/refresh - Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: true,
        code: 'NO_REFRESH_TOKEN',
        message: 'Refresh token manquant'
      });
    }

    // Get user from token (if we can decode it)
    const decoded = require('jsonwebtoken').decode(refreshToken);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        error: true,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token invalide'
      });
    }

    // Get user from database
    const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({
        error: true,
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur introuvable'
      });
    }

    // Refresh tokens
    const newTokens = refreshAccessToken(refreshToken, user);

    res.json({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresIn: newTokens.expiresIn,
      type: newTokens.type
    });
  } catch (error) {
    console.error('Erreur refresh token:', error);
    res.status(401).json({
      error: true,
      code: 'TOKEN_REFRESH_FAILED',
      message: 'Impossible de rafraîchir le token'
    });
  }
});

/**
 * POST /api/auth/logout - Logout and revoke tokens
 */
router.post('/logout', verifyTokenMiddleware, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user.id;

    if (refreshToken) {
      // Revoke specific refresh token
      revokeRefreshToken(refreshToken);
    } else {
      // Revoke all tokens for this user
      revokeAllUserTokens(userId);
    }

    res.json({
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    console.error('Erreur logout:', error);
    res.status(500).json({
      error: true,
      code: 'LOGOUT_ERROR',
      message: 'Erreur lors de la déconnexion'
    });
  }
});

export default router;
