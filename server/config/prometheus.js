import client from 'prom-client';

// Créer un registre pour toutes les métriques
export const register = new client.Registry();

// Ajouter les métriques par défaut (CPU, mémoire, etc.)
client.collectDefaultMetrics({ register });

// === Métriques HTTP ===

// Compteur de requêtes HTTP
export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total des requêtes HTTP reçues',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Histogramme de durée des requêtes
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Durée des requêtes HTTP en millisecondes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [register]
});

// === Métriques métier (E-Voting) ===

// Compteur de votes
export const votesCounter = new client.Counter({
  name: 'votes_total',
  help: 'Nombre total de votes enregistrés',
  labelNames: ['election_id', 'status'],
  registers: [register]
});

// Compteur d'authentifications
export const authCounter = new client.Counter({
  name: 'auth_attempts_total',
  help: 'Nombre total de tentatives d\'authentification',
  labelNames: ['type', 'status'],
  registers: [register]
});

// Jauge pour les connexions WebSocket actives
export const activeWebSocketConnections = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Nombre de connexions WebSocket actives',
  registers: [register]
});

// Compteur d'élections
export const electionsCounter = new client.Counter({
  name: 'elections_total',
  help: 'Nombre total d\'élections créées',
  labelNames: ['status'],
  registers: [register]
});

// Jauge pour les électeurs enregistrés
export const registeredVotersGauge = new client.Gauge({
  name: 'voters_registered_total',
  help: 'Nombre total d\'électeurs enregistrés',
  labelNames: ['election_id'],
  registers: [register]
});

// Compteur d'erreurs
export const errorCounter = new client.Counter({
  name: 'errors_total',
  help: 'Nombre total d\'erreurs',
  labelNames: ['type', 'route'],
  registers: [register]
});

// Histogramme de latence de la base de données
export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_ms',
  help: 'Durée des requêtes base de données en millisecondes',
  labelNames: ['operation', 'table'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500],
  registers: [register]
});

// === Métriques de sécurité ===

// Compteur de tentatives de rate limiting
export const rateLimitCounter = new client.Counter({
  name: 'rate_limit_hits_total',
  help: 'Nombre de requêtes bloquées par rate limiting',
  labelNames: ['type', 'route'],
  registers: [register]
});

// Compteur d'authentification 2FA
export const twoFactorCounter = new client.Counter({
  name: 'two_factor_auth_total',
  help: 'Tentatives d\'authentification 2FA',
  labelNames: ['status'],
  registers: [register]
});

// === Middleware Prometheus ===

/**
 * Middleware pour collecter les métriques HTTP
 */
export const prometheusMiddleware = (req, res, next) => {
  const start = Date.now();

  // Capturer la réponse
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode;

    // Incrémenter le compteur de requêtes
    httpRequestCounter.inc({
      method,
      route,
      status_code: statusCode
    });

    // Enregistrer la durée
    httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode
      },
      duration
    );

    // Incrémenter le compteur d'erreurs si erreur
    if (statusCode >= 400) {
      errorCounter.inc({
        type: statusCode >= 500 ? 'server_error' : 'client_error',
        route
      });
    }
  });

  next();
};

/**
 * Fonction helper pour enregistrer une métrique de vote
 */
export function recordVote(electionId, status = 'success') {
  votesCounter.inc({ election_id: electionId, status });
}

/**
 * Fonction helper pour enregistrer une tentative d'authentification
 */
export function recordAuth(type, status) {
  authCounter.inc({ type, status });
}

/**
 * Fonction helper pour enregistrer une requête DB
 */
export function recordDbQuery(operation, table, durationMs) {
  dbQueryDuration.observe({ operation, table }, durationMs);
}

/**
 * Fonction helper pour enregistrer un rate limit
 */
export function recordRateLimit(type, route) {
  rateLimitCounter.inc({ type, route });
}

/**
 * Fonction helper pour enregistrer une tentative 2FA
 */
export function record2FA(status) {
  twoFactorCounter.inc({ status });
}

export default {
  register,
  prometheusMiddleware,
  recordVote,
  recordAuth,
  recordDbQuery,
  recordRateLimit,
  record2FA
};
