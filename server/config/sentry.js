import * as Sentry from '@sentry/node';

/**
 * Initialise Sentry pour le monitoring des erreurs backend
 * @param {Object} app - Instance Express
 */
export function initSentry(app) {
  if (!process.env.SENTRY_DSN) {
    console.warn('⚠️  SENTRY_DSN non configuré - monitoring des erreurs désactivé');
    return;
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Capture context
      beforeSend(event) {
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
    app.use(Sentry.requestHandler());

    // TracingHandler pour les performances
    app.use(Sentry.tracingHandler?.() || ((_req, _res, next) => next()));

    console.log('✅ Sentry initialisé pour le backend');
  } catch (error) {
    console.warn('⚠️  Erreur lors de l\'initialisation de Sentry:', error.message);
  }
}

/**
 * Middleware de gestion des erreurs Sentry
 * À utiliser comme dernier middleware avant les gestionnaires d'erreur personnalisés
 */
export function sentryErrorHandler() {
  // Retourner un middleware simple si Sentry n'est pas disponible
  return (error, _req, _res, next) => {
    if (error.status >= 500) {
      Sentry.captureException(error);
    }
    next(error);
  };
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
