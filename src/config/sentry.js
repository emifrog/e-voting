import * as Sentry from '@sentry/react';

/**
 * Initialise Sentry pour le monitoring des erreurs frontend
 */
export function initSentry() {
  // Ne pas initialiser Sentry si le DSN n'est pas configuré
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn('⚠️  VITE_SENTRY_DSN non configuré - monitoring des erreurs désactivé');
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE || 'development',

    // Intégrations
    integrations: [
      // Browser Tracing pour les performances
      Sentry.browserTracingIntegration({
        // Tracer les navigations
        tracePropagationTargets: [
          'localhost',
          /^\//,
          import.meta.env.VITE_API_URL
        ],
      }),
      // Replay pour enregistrer les sessions avec erreurs
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% des sessions normales
    replaysOnErrorSampleRate: 1.0, // 100% des sessions avec erreurs

    // Filtrer les informations sensibles
    beforeSend(event, hint) {
      // Ne pas envoyer d'informations d'authentification
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }

      // Filtrer les données sensibles des breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            // Supprimer les mots de passe, tokens, etc.
            const sensitiveKeys = ['password', 'token', 'secret', 'auth', 'key'];
            const filteredData = { ...breadcrumb.data };

            Object.keys(filteredData).forEach(key => {
              if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                filteredData[key] = '[FILTERED]';
              }
            });

            return { ...breadcrumb, data: filteredData };
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Ignorer certaines erreurs courantes
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Load failed',
      'NetworkError',
      'Failed to fetch',
      'cancelled',
      // Erreurs spécifiques aux extensions de navigateur
      'extension',
      'chrome-extension',
      'moz-extension',
    ],

    // Denylist des URLs à ne pas tracer
    denyUrls: [
      // Extensions de navigateur
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });

  console.log('✅ Sentry initialisé pour le frontend');
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
 * Définir l'utilisateur courant pour le contexte Sentry
 */
export function setUser(user) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Ajouter un breadcrumb personnalisé
 */
export function addBreadcrumb(message, category, level = 'info', data = {}) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Wrapper d'erreur pour les composants React
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * HOC pour profiler les composants React
 */
export const withProfiler = Sentry.withProfiler;

export default Sentry;
