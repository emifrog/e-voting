import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer l'authentification
 * Synchronise l'état avec localStorage et les événements cross-tab
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticatedState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Fonction interne pour mettre à jour l'état d'authentification
  const updateAuth = useCallback((authenticated) => {
    setIsAuthenticatedState(authenticated);
    if (authenticated) {
      const userData = localStorage.getItem('user');
      setUser(userData ? JSON.parse(userData) : null);
    } else {
      setUser(null);
    }
  }, []);

  // Initialisation au montage
  useEffect(() => {
    const token = localStorage.getItem('token');
    updateAuth(!!token);
    setLoading(false);
  }, [updateAuth]);

  // Écouter les changements de localStorage (autres onglets)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        // Le token a changé dans un autre onglet
        updateAuth(!!e.newValue);
      }
    };

    // Écouter les événements de déconnexion explicite
    const handleLogout = () => {
      updateAuth(false);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-logout', handleLogout);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-logout', handleLogout);
    };
  }, [updateAuth]);

  // Fonction de déconnexion
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuth(false);
    window.dispatchEvent(new Event('user-logout'));
  }, [updateAuth]);

  // Fonction de connexion
  const login = useCallback((token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    updateAuth(true);
  }, [updateAuth]);

  return {
    isAuthenticated,
    loading,
    user,
    logout,
    login,
    setIsAuthenticated: setIsAuthenticatedState
  };
}
