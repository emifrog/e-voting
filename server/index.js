import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import authRoutes from './routes/auth.js';
import electionsRoutes from './routes/elections.js';
import votersRoutes from './routes/voters.js';
import votingRoutes from './routes/voting.js';
import resultsRoutes from './routes/results.js';
import observersRoutes from './routes/observers.js';
import remindersRoutes from './routes/reminders.js';
import twoFactorRoutes from './routes/twoFactor.js';
import quorumRoutes from './routes/quorum.js';
import notificationsRoutes from './routes/notifications.js';
import pushRoutes from './routes/push.js';
import keyManagementRoutes from './routes/keyManagement.js';

// Services
import { initScheduler } from './services/scheduler.js';
import { initializeWebSocket } from './services/websocket.js';
import { initKeyRotationScheduler, getKeyRotationStatus } from './services/keyRotationService.js';

// Advanced Rate Limiting
import {
  generalLimiter,
  loginLimiter,
  voteRateLimiter,
  checkRateLimitStatus,
  onLoginSuccess,
  onLoginFailure
} from './middleware/advancedRateLimit.js';

// Monitoring
import { initSentry, sentryErrorHandler } from './config/sentry.js';
import { prometheusMiddleware, register } from './config/prometheus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialiser Sentry (doit être fait en premier)
initSentry(app);

// Validation des variables d'environnement critiques au démarrage
function validateEnvironment() {
  const errors = [];

  // Valider ENCRYPTION_KEY (doit faire exactement 32 bytes pour AES-256)
  if (!process.env.ENCRYPTION_KEY) {
    errors.push('ENCRYPTION_KEY manquante dans les variables d\'environnement');
  } else {
    const keyLength = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8').length;
    if (keyLength !== 32) {
      errors.push(`ENCRYPTION_KEY doit faire exactement 32 bytes (actuellement: ${keyLength} bytes)`);
    }
  }

  // Valider JWT_SECRET
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET manquante dans les variables d\'environnement');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET doit faire au moins 32 caractères');
  }

  // Valider configuration production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.APP_URL) {
      errors.push('APP_URL manquante pour l\'environnement de production');
    }
    if (!process.env.DATABASE_URL && !process.env.SUPABASE_URL) {
      errors.push('DATABASE_URL ou SUPABASE_URL manquante pour l\'environnement de production');
    }
  }

  // Si des erreurs critiques sont détectées, arrêter le serveur
  if (errors.length > 0) {
    console.error('\n❌ ERREURS DE CONFIGURATION CRITIQUES DÉTECTÉES:\n');
    errors.forEach((error, index) => {
      console.error(`  ${index + 1}. ${error}`);
    });
    console.error('\n⚠️  Le serveur ne peut pas démarrer avec ces erreurs de configuration.\n');
    console.error('📝 Veuillez corriger le fichier .env et redémarrer le serveur.\n');
    process.exit(1);
  }

  console.log('✅ Validation des variables d\'environnement: OK');
}

// Exécuter la validation
validateEnvironment();

// Middleware de sécurité
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // React nécessite unsafe-inline pour le dev
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.APP_URL || "'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  } : false, // Désactivé en développement pour faciliter le debugging
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.APP_URL
    : '*',
  credentials: true
}));

// Apply general rate limiter to all API routes
app.use('/api/', generalLimiter);

// Prometheus metrics middleware (avant body parsing pour tout capturer)
app.use(prometheusMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes API with advanced rate limiting
app.use('/api/auth', loginLimiter, checkRateLimitStatus('login'), authRoutes);
app.use('/api/2fa', loginLimiter, twoFactorRoutes);
app.use('/api/elections', electionsRoutes);
app.use('/api/elections', votersRoutes);
app.use('/api/vote', voteRateLimiter, votingRoutes); // Advanced rate limiting for votes
app.use('/api/elections', resultsRoutes);
app.use('/api/elections', observersRoutes);
app.use('/api/observer', observersRoutes);
app.use('/api/elections', remindersRoutes);
app.use('/api/quorum', quorumRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', keyManagementRoutes);

// Page d'accueil API
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>E-Voting API</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 40px;
          max-width: 800px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        h1 {
          font-size: 48px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 10px;
        }
        .status {
          display: inline-block;
          padding: 8px 16px;
          background: linear-gradient(135deg, #dcfce7, #a7f3d0);
          color: #065f46;
          border-radius: 999px;
          font-weight: 600;
          margin-bottom: 30px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }
        .info-card {
          background: linear-gradient(135deg, #f9fafb, #f3f4f6);
          padding: 20px;
          border-radius: 12px;
          border-left: 4px solid #6366f1;
        }
        .info-card strong {
          display: block;
          color: #6366f1;
          font-size: 14px;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-card span {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }
        .endpoints {
          margin-top: 40px;
        }
        .endpoint {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 10px;
          border-left: 3px solid #8b5cf6;
        }
        .method {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          margin-right: 10px;
        }
        .get { background: #dbeafe; color: #1e40af; }
        .post { background: #dcfce7; color: #065f46; }
        .btn {
          display: inline-block;
          margin-top: 30px;
          padding: 12px 30px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
          transition: transform 0.2s;
        }
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🗳️ E-Voting API</h1>
        <span class="status">✅ Serveur en ligne</span>

        <div class="info-grid">
          <div class="info-card">
            <strong>Version</strong>
            <span>2.0</span>
          </div>
          <div class="info-card">
            <strong>Environnement</strong>
            <span>${process.env.NODE_ENV || 'development'}</span>
          </div>
          <div class="info-card">
            <strong>Base de données</strong>
            <span>Supabase PostgreSQL</span>
          </div>
          <div class="info-card">
            <strong>Uptime</strong>
            <span>${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s</span>
          </div>
        </div>

        <div class="endpoints">
          <h2 style="margin-bottom: 20px; color: #111827;">Endpoints disponibles</h2>

          <div class="endpoint">
            <span class="method get">GET</span>
            <code>/api/health</code>
            <p style="margin-top: 8px; color: #6b7280; font-size: 14px;">Status du serveur</p>
          </div>

          <div class="endpoint">
            <span class="method post">POST</span>
            <code>/api/auth/login</code>
            <p style="margin-top: 8px; color: #6b7280; font-size: 14px;">Connexion administrateur</p>
          </div>

          <div class="endpoint">
            <span class="method post">POST</span>
            <code>/api/auth/register</code>
            <p style="margin-top: 8px; color: #6b7280; font-size: 14px;">Inscription administrateur</p>
          </div>

          <div class="endpoint">
            <span class="method get">GET</span>
            <code>/api/elections</code>
            <p style="margin-top: 8px; color: #6b7280; font-size: 14px;">Liste des élections</p>
          </div>

          <div class="endpoint">
            <span class="method get">GET</span>
            <code>/api/vote/:token</code>
            <p style="margin-top: 8px; color: #6b7280; font-size: 14px;">Interface de vote</p>
          </div>
        </div>

        <a href="http://localhost:5173" class="btn">
          🚀 Ouvrir l'application
        </a>

        <p style="margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
          <strong>Documentation :</strong> <a href="https://github.com/anthropics/e-voting" style="color: #6366f1;">README.md</a>
        </p>
      </div>
    </body>
    </html>
  `);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'Supabase PostgreSQL',
    version: '2.0.0'
  });
});

// Endpoint pour les métriques Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err);
  }
});

// Servir les fichiers statiques en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Gestionnaire d'erreurs Sentry (doit être avant les autres gestionnaires d'erreur)
app.use(sentryErrorHandler());

// Gestion des erreurs 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Gestion globale des erreurs
app.use((err, _req, res, _next) => {
  console.error('Erreur:', err);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Créer le serveur HTTP pour Socket.IO
const httpServer = createServer(app);

// Initialiser WebSocket
initializeWebSocket(httpServer);

// Initialiser le planificateur
initScheduler();

// Initialiser la rotation des clés de chiffrement (hebdomadaire par défaut)
try {
  initKeyRotationScheduler('0 0 * * 0'); // Dimanche à 00:00
  console.log('✅ Key rotation scheduler initialized');
} catch (error) {
  console.warn('⚠️  Key rotation scheduler initialization failed:', error.message);
}

// Démarrer le serveur
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   🗳️  E-Voting Platform Started          ║
╠═══════════════════════════════════════════╣
║   Server: http://localhost:${PORT}        ║
║   WebSocket: ✅ Enabled                   ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   Database: ${process.env.DB_PATH || 'SQLite'}                ║
╚═══════════════════════════════════════════╝
  `);
});

export default app;
