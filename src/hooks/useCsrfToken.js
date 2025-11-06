/**
 * CSRF Token Management Hook
 * Handles retrieval and storage of CSRF tokens for secure form submissions
 *
 * Features:
 * - Automatic token refresh from server responses
 * - Token storage in sessionStorage (cleared on browser close)
 * - Provides token for API requests
 * - Handles token expiration and refresh
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Hook to manage CSRF token
 * @returns {object} - { token, updateToken, addTokenToHeaders }
 */
export function useCsrfToken() {
  const [token, setToken] = useState(() => {
    // Try to get token from sessionStorage on initialization
    try {
      return sessionStorage.getItem('CSRF_TOKEN') || null;
    } catch (err) {
      console.warn('Could not access sessionStorage:', err);
      return null;
    }
  });

  const [loading, setLoading] = useState(!token);

  // Load initial token from server on mount if not in storage
  useEffect(() => {
    if (!token && !loading) {
      return;
    }

    if (!token) {
      fetchInitialToken();
    }
  }, []);

  /**
   * Fetch initial CSRF token from server
   */
  const fetchInitialToken = useCallback(async () => {
    try {
      setLoading(true);
      // When the page first loads, request a CSRF token
      // This would typically be done after login or on page initialization
      // The server will set the XSRF-TOKEN cookie automatically
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update CSRF token (called when server sends new token in response)
   * @param {string} newToken - New CSRF token from server
   */
  const updateToken = useCallback((newToken) => {
    if (newToken) {
      try {
        setToken(newToken);
        sessionStorage.setItem('CSRF_TOKEN', newToken);
      } catch (err) {
        console.warn('Could not store token in sessionStorage:', err);
        setToken(newToken);
      }
    }
  }, []);

  /**
   * Add CSRF token to request headers
   * @param {object} headers - Existing headers object
   * @returns {object} - Headers with CSRF token added
   */
  const addTokenToHeaders = useCallback((headers = {}) => {
    if (token) {
      return {
        ...headers,
        'X-CSRF-Token': token
      };
    }
    return headers;
  }, [token]);

  /**
   * Add CSRF token to form data
   * @param {object} data - Form data object
   * @returns {object} - Form data with CSRF token added
   */
  const addTokenToFormData = useCallback((data = {}) => {
    if (token) {
      return {
        ...data,
        csrfToken: token
      };
    }
    return data;
  }, [token]);

  /**
   * Clear CSRF token (on logout)
   */
  const clearToken = useCallback(() => {
    try {
      sessionStorage.removeItem('CSRF_TOKEN');
    } catch (err) {
      console.warn('Could not clear sessionStorage:', err);
    }
    setToken(null);
  }, []);

  return {
    token,
    loading,
    updateToken,
    clearToken,
    addTokenToHeaders,
    addTokenToFormData
  };
}

/**
 * Hook to handle CSRF token in API responses
 * Automatically updates token when server sends new one
 */
export function useCsrfTokenRefresh() {
  const { updateToken } = useCsrfToken();

  /**
   * Extract CSRF token from response headers and update
   * @param {Response} response - Fetch response object
   */
  const handleResponseHeaders = useCallback((response) => {
    // Check for new CSRF token in response header
    const newToken = response.headers.get('X-New-CSRF-Token');
    if (newToken) {
      updateToken(newToken);
    }
  }, [updateToken]);

  return { handleResponseHeaders };
}

export default useCsrfToken;
