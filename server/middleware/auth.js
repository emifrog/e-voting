import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware pour vérifier l'authentification admin
 */
export const authenticateAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

/**
 * Middleware pour vérifier le token de vote
 */
export const authenticateVoter = (req, res, next) => {
  try {
    const token = req.params.token || req.query.token || req.body.token;

    if (!token) {
      return res.status(401).json({ error: 'Token de vote manquant' });
    }

    req.voterToken = token;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Erreur d\'authentification' });
  }
};

/**
 * Middleware pour vérifier le token d'observateur
 */
export const authenticateObserver = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;

    if (!token) {
      return res.status(401).json({ error: 'Token d\'observateur manquant' });
    }

    req.observerToken = token;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Erreur d\'authentification observateur' });
  }
};

/**
 * Génère un JWT pour l'admin
 */
export const generateAdminToken = (user, require2FA = false) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      require2FA: require2FA // Indique si le 2FA doit être vérifié
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * Alias pour authenticateAdmin (pour compatibilité)
 */
export const authenticateToken = authenticateAdmin;
