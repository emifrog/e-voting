import express from 'express';
import db from '../database/db.js';
import * as twoFactorService from '../services/twoFactor.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/2fa/setup
 * Génère un secret 2FA pour l'utilisateur
 */
router.post('/setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer l'utilisateur
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (user.two_factor_enabled) {
      return res.status(400).json({ error: '2FA déjà activé' });
    }

    // Générer le secret
    const { secret, qrCode } = await twoFactorService.generateSecret(
      user.email,
      user.name
    );

    // Stocker temporairement le secret (pas encore activé)
    await db.run(
      'UPDATE users SET two_factor_secret = ? WHERE id = ?',
      [secret, userId]
    );

    res.json({
      secret,
      qrCode,
      message: 'Scannez le QR code avec votre application d\'authentification (Google Authenticator, Authy, etc.)'
    });
  } catch (error) {
    console.error('Erreur setup 2FA:', error);
    res.status(500).json({ error: 'Erreur lors de la configuration 2FA' });
  }
});

/**
 * POST /api/2fa/verify
 * Vérifie et active le 2FA
 */
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Code requis' });
    }

    // Récupérer l'utilisateur
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

    if (!user || !user.two_factor_secret) {
      return res.status(400).json({ error: 'Configuration 2FA non initialisée' });
    }

    // Vérifier le code
    const isValid = twoFactorService.verifyToken(user.two_factor_secret, token);

    if (!isValid) {
      return res.status(400).json({ error: 'Code invalide' });
    }

    // Générer les codes de secours
    const backupCodes = twoFactorService.generateBackupCodes(10);
    const hashedBackupCodes = twoFactorService.hashBackupCodes(backupCodes);

    // Activer le 2FA
    await db.run(
      'UPDATE users SET two_factor_enabled = true, two_factor_backup_codes = ? WHERE id = ?',
      [JSON.stringify(hashedBackupCodes), userId]
    );

    res.json({
      success: true,
      message: '2FA activé avec succès',
      backupCodes: backupCodes,
      warning: 'Conservez ces codes de secours dans un endroit sûr. Ils ne seront plus affichés.'
    });
  } catch (error) {
    console.error('Erreur vérification 2FA:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification 2FA' });
  }
});

/**
 * POST /api/2fa/validate
 * Valide un code 2FA lors de la connexion
 */
router.post('/validate', async (req, res) => {
  try {
    const { userId, token, useBackupCode } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: 'UserId et code requis' });
    }

    // Récupérer l'utilisateur
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

    if (!user || !user.two_factor_enabled) {
      return res.status(400).json({ error: '2FA non configuré' });
    }

    let isValid = false;

    if (useBackupCode) {
      // Vérifier avec un code de secours
      const backupCodes = JSON.parse(user.two_factor_backup_codes || '[]');
      isValid = twoFactorService.verifyBackupCode(token, backupCodes);

      if (isValid) {
        // Retirer le code utilisé
        const updatedCodes = twoFactorService.removeUsedBackupCode(token, backupCodes);
        await db.run(
          'UPDATE users SET two_factor_backup_codes = ? WHERE id = ?',
          [JSON.stringify(updatedCodes), userId]
        );
      }
    } else {
      // Vérifier avec TOTP
      isValid = twoFactorService.verifyToken(user.two_factor_secret, token);
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Code invalide' });
    }

    res.json({
      success: true,
      message: 'Code validé'
    });
  } catch (error) {
    console.error('Erreur validation 2FA:', error);
    res.status(500).json({ error: 'Erreur lors de la validation 2FA' });
  }
});

/**
 * POST /api/2fa/disable
 * Désactive le 2FA
 */
router.post('/disable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, token } = req.body;

    if (!password || !token) {
      return res.status(400).json({ error: 'Mot de passe et code 2FA requis' });
    }

    // Récupérer l'utilisateur
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier le mot de passe
    const bcrypt = await import('bcryptjs');
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Vérifier le code 2FA
    const isValid = twoFactorService.verifyToken(user.two_factor_secret, token);

    if (!isValid) {
      return res.status(400).json({ error: 'Code 2FA invalide' });
    }

    // Désactiver le 2FA
    await db.run(
      'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL, two_factor_backup_codes = NULL WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: '2FA désactivé avec succès'
    });
  } catch (error) {
    console.error('Erreur désactivation 2FA:', error);
    res.status(500).json({ error: 'Erreur lors de la désactivation 2FA' });
  }
});

/**
 * GET /api/2fa/status
 * Vérifie si le 2FA est activé pour l'utilisateur
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await db.get(
      'SELECT two_factor_enabled FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      enabled: user?.two_factor_enabled || false
    });
  } catch (error) {
    console.error('Erreur statut 2FA:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification du statut 2FA' });
  }
});

/**
 * POST /api/2fa/regenerate-backup-codes
 * Régénère les codes de secours
 */
router.post('/regenerate-backup-codes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Code 2FA requis' });
    }

    // Récupérer l'utilisateur
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

    if (!user || !user.two_factor_enabled) {
      return res.status(400).json({ error: '2FA non configuré' });
    }

    // Vérifier le code
    const isValid = twoFactorService.verifyToken(user.two_factor_secret, token);

    if (!isValid) {
      return res.status(400).json({ error: 'Code invalide' });
    }

    // Générer de nouveaux codes
    const backupCodes = twoFactorService.generateBackupCodes(10);
    const hashedBackupCodes = twoFactorService.hashBackupCodes(backupCodes);

    await db.run(
      'UPDATE users SET two_factor_backup_codes = ? WHERE id = ?',
      [JSON.stringify(hashedBackupCodes), userId]
    );

    res.json({
      success: true,
      backupCodes: backupCodes,
      message: 'Nouveaux codes de secours générés',
      warning: 'Les anciens codes ne fonctionnent plus. Conservez ces nouveaux codes en lieu sûr.'
    });
  } catch (error) {
    console.error('Erreur régénération codes:', error);
    res.status(500).json({ error: 'Erreur lors de la régénération des codes' });
  }
});

export default router;
