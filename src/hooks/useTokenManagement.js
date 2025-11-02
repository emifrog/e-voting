import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

/**
 * Hook for managing JWT token lifecycle
 * Handles token storage, refresh, and expiration
 */
export function useTokenManagement() {
  const navigate = useNavigate();
  const [tokenState, setTokenState] = useState({
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    expiresIn: localStorage.getItem('expiresIn'),
    isExpired: false,
    isNearExpiry: false
  });

  // Check token expiry on mount and interval
  useEffect(() => {
    const checkTokenExpiry = () => {
      const expiresIn = localStorage.getItem('expiresIn');
      if (!expiresIn) return;

      const expiresAt = parseInt(expiresIn);
      const now = Date.now();
      const timeLeft = expiresAt - now;

      // If less than 5 minutes or expired, trigger refresh
      if (timeLeft < 5 * 60 * 1000) {
        setTokenState(prev => ({
          ...prev,
          isNearExpiry: timeLeft > 0,
          isExpired: timeLeft <= 0
        }));

        if (timeLeft <= 0) {
          // Token expired, force logout
          handleLogout();
        } else if (timeLeft < 5 * 60 * 1000) {
          // Token near expiry, auto-refresh
          refreshToken();
        }
      }
    };

    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const saveTokens = useCallback((accessToken, refreshToken, expiresIn) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('expiresIn', expiresIn + Date.now());

    setTokenState({
      accessToken,
      refreshToken,
      expiresIn,
      isExpired: false,
      isNearExpiry: false
    });

    // Update API default header
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        handleLogout();
        return false;
      }

      const response = await api.post('/auth/refresh', { refreshToken });
      const { accessToken, expiresIn } = response.data;

      saveTokens(accessToken, refreshToken, expiresIn);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      handleLogout();
      return false;
    }
  }, [saveTokens]);

  const handleLogout = useCallback(() => {
    // Clear tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresIn');
    localStorage.removeItem('user');

    setTokenState({
      accessToken: null,
      refreshToken: null,
      expiresIn: null,
      isExpired: true,
      isNearExpiry: false
    });

    // Redirect to login
    navigate('/login', {
      state: { message: 'Votre session a expiré. Veuillez vous reconnecter.' }
    });
  }, [navigate]);

  const login = useCallback((accessToken, refreshToken, expiresIn) => {
    saveTokens(accessToken, refreshToken, expiresIn);
  }, [saveTokens]);

  return {
    tokenState,
    saveTokens,
    refreshToken,
    handleLogout,
    login
  };
}

export default useTokenManagement;
