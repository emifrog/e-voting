import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Initialise Sentry pour le monitoring des erreurs backend
 * @param {Object} app - Instance Express
 */
export function initSentry(app) {
  if (!process.env.SENTRY_DSN) {
    console.warn('⚠️  SENTRY_DSN non configuré - monitoring des erreurs désactivé');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
      // Enable profiling
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Capture context
    beforeSend(event, hint) {
      // Filtrer les informations sensibles
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
    // Ignorer certaines erreurs courantes
    ignoreErrors: [
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'NetworkError',
      'Non-Error promise rejection captured'
    ],
  });

  // Request handler doit être le premier middleware
  app.use(Sentry.Handlers.requestHandler());

  // TracingHandler pour les performances
  app.use(Sentry.Handlers.tracingHandler());

  console.log('✅ Sentry initialisé pour le backend');
}

/**
 * Middleware de gestion des erreurs Sentry
 * À utiliser comme dernier middleware avant les gestionnaires d'erreur personnalisés
 */
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capturer toutes les erreurs 500+
      return error.status >= 500;
    }
  });
}

/**
 * Capture une erreur manuellement dans Sentry
 */
export function captureException(error, context = {}) {
  Sentry.captureException(error, {
    extra: context
  });
}

/**
 * Capture un message dans Sentry
 */
export function captureMessage(message, level = 'info', context = {}) {
  Sentry.captureMessage(message, {
    level,
    extra: context
  });
}

/**
 * Crée un span de transaction pour mesurer les performances
 */
export function startTransaction(name, op) {
  return Sentry.startTransaction({
    name,
    op
  });
}

export default Sentry;
