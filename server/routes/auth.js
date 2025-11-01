import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import { generateAdminToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/register - Inscription admin
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation des données
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, mot de passe et nom requis' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Vérifier si l'email existe déjà
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const userId = uuidv4();
    await db.run(`
      INSERT INTO users (id, email, password, name, role)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, email, hashedPassword, name, 'admin']);

    const token = generateAdminToken({ id: userId, email, role: 'admin' });

    res.status(201).json({
      message: 'Compte créé avec succès',
      token,
      user: { id: userId, email, name, role: 'admin' }
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
    const { email, password, twoFactorToken } = req.body;

    // Trouver l'utilisateur
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
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
        return res.status(401).json({ error: 'Code 2FA invalide' });
      }
    }

    const token = generateAdminToken(user);

    res.json({
      message: 'Connexion réussie',
      token,
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
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

export default router;
