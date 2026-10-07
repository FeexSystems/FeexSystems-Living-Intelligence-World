/**
 * Auth State Validation
 *
 * Provides functions to validate user sessions against the backend
 * and verify authentication state is consistent.
 */

import { AuthUser } from './firebase-auth';

// Re-export so consumers (e.g. hooks/useAuthHealth) can import AuthUser from
// this module alongside the validation helpers.
export { AuthUser } from './firebase-auth';

/**
 * Logger helper for auth state
 */
function logAuthState(message: string, data?: any) {
  console.log(`[AuthState] ${message}`, data);
}

/**
 * Validate current auth state by checking session with backend
 * Returns true if session is valid, false otherwise
 */
export async function validateAuthState(): Promise<boolean> {
  try {
    const token = localStorage.getItem('feex_access_token');
    if (!token) {
      return false;
    }

    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get current auth user from local storage or backend
 * Returns null if no valid session exists
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const token = localStorage.getItem('feex_access_token');
    if (!token) {
      return null;
    }

    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user || data.data?.user || null;
  } catch {
    return null;
  }
}

/**
 * Check if current session is valid
 */
export async function isSessionValid(): Promise<boolean> {
  return await validateAuthState();
}

/**
 * Refresh auth state from backend
 */
export async function refreshAuthState(): Promise<AuthUser | null> {
  return await getAuthUser();
}
