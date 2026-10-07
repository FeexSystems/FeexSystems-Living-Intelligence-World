/**
 * useAuthHealth Hook
 *
 * Periodically validates auth session health and auto-logout
 * if session becomes invalid
 */

import { useEffect, useState, useCallback } from 'react';
import { validateAuthState, refreshAuthState, AuthUser } from '../lib/auth-state';

/**
 * Options for auth health checks
 */
export interface AuthHealthOptions {
  /**
   * Check interval in milliseconds
   * @default 5 * 60 * 1000 (5 minutes)
   */
  interval?: number;
  /**
   * Whether to start checking immediately
   * @default true
   */
  immediate?: boolean;
}

/**
 * Auth health check results
 */
export interface AuthHealthResult {
  /**
   * Current health status
   */
  isValid: boolean;
  /**
   * Last check timestamp
   */
  lastCheck: Date | null;
  /**
   * Error if any occurred
   */
  error: Error | null;
  /**
   * Current auth user (if any)
   */
  user: AuthUser | null;
  /**
   * Refresh auth state manually
   */
  refresh: () => Promise<void>;
}

/**
 * Hook to monitor auth session health with periodic validation
 * Auto-invalidates session if backend validation fails
 */
export function useAuthHealth(options: AuthHealthOptions = {}): AuthHealthResult {
  const {
    interval = 5 * 60 * 1000, // 5 minutes default
    immediate = true,
  } = options;

  const [isValid, setIsValid] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const checkHealth = useCallback(async (): Promise<void> => {
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

  const refresh = useCallback(async (): Promise<void> => {
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
