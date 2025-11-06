import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies (for CSRF token)
});

/**
 * Intercepteur pour ajouter les tokens JWT et CSRF
 */
api.interceptors.request.use((config) => {
  // Ajouter le token JWT d'authentification
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Ajouter le token CSRF depuis sessionStorage
  // Le serveur définit automatiquement le cookie XSRF-TOKEN
  // On ajoute aussi le token dans l'en-tête pour les requêtes POST/PUT/DELETE
  const csrfToken = sessionStorage.getItem('CSRF_TOKEN');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

/**
 * Intercepteur pour gérer les réponses et mettre à jour le CSRF token
 */
api.interceptors.response.use(
  (response) => {
    // Mettre à jour le CSRF token si le serveur envoie un nouveau
    const newCsrfToken = response.headers['x-new-csrf-token'];
    if (newCsrfToken) {
      try {
        sessionStorage.setItem('CSRF_TOKEN', newCsrfToken);
      } catch (err) {
        console.warn('Could not store CSRF token in sessionStorage:', err);
      }
    }

    return response;
  },
  (error) => {
    // Gérer les erreurs CSRF
    if (error.response?.status === 403) {
      const csrfError = error.response?.data?.code;
      if (csrfError && csrfError.includes('CSRF')) {
        console.error('CSRF token error:', error.response.data.message);
        // Recharger la page pour obtenir un nouveau token
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        return Promise.reject(new Error('CSRF protection: Page reloading...'));
      }
    }

    // Gérer l'authentification expirée
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      try {
        sessionStorage.removeItem('CSRF_TOKEN');
      } catch (err) {
        console.warn('Could not clear CSRF token from sessionStorage:', err);
      }

      // Dispatcher un événement pour notifier l'App de la déconnexion
      window.dispatchEvent(new Event('user-logout'));

      // Rediriger après un court délai
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }

    return Promise.reject(error);
  }
);

export default api;
