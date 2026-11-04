/**
 * useAuthHealth Hook
 *
 * Periodically validates auth session health and auto-logout
 * if session becomes invalid
 */

import { useEffect, useState, useCallback } from 'react';
import { validateAuthState, refreshAuthState, } from '../lib/auth-state';

/**
 * Options for auth health checks
 */







































/**
 * Hook to monitor auth session health with periodic validation
 * Auto-invalidates session if backend validation fails
 */
export function useAuthHealth(options = {}) {
  const {
    interval = 5 * 60 * 1000, // 5 minutes default
    immediate = true,
  } = options;

  const [isValid, setIsValid] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const checkHealth = useCallback(async () => {
    try {
      const token = localStorage.getItem('feex_access_token');
      
      // If no token, session is invalid
      if (!token) {
        setIsValid(false);
        setLastCheck(new Date());
        return;
      }

      // Validate against backend
      const valid = await validateAuthState();
      setIsValid(valid);
      setLastCheck(new Date());

      // If invalid, clear local session
      if (!valid) {
        localStorage.removeItem('feex_access_token');
        setUser(null);
        return;
      }

      // Fetch current user
      const currentUser = await refreshAuthState();
      setUser(currentUser);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown auth health check error'));
      setIsValid(false);
      setLastCheck(new Date());
    }
  }, []);

  const refresh = useCallback(async () => {
    const currentUser = await refreshAuthState();
    if (currentUser) {
      setUser(currentUser);
      setIsValid(true);
    } else {
      setIsValid(false);
      localStorage.removeItem('feex_access_token');
    }
  }, []);

  useEffect(() => {
    // Initial check
    if (immediate) {
      checkHealth();
    }

    // Set up periodic checks
    const timer = setInterval(checkHealth, interval);

    return () => {
      clearInterval(timer);
    };
  }, [checkHealth, interval, immediate]);

  return {
    isValid,
    lastCheck,
    error,
    user,
    refresh,
  };
}

export default useAuthHealth;
