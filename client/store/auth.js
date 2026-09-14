 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Auth store — thin re-export wrapper around Firebase Auth.
 *
 * This file exists so that legacy imports of `useAuthStore` continue to work
 * while the underlying implementation delegates entirely to Firebase Auth.
 *
 * All token / refreshToken management is now handled internally by Firebase.
 */

import { useFirebaseAuth, AuthUser } from '@/lib/firebase-auth';

// Re-export the AuthUser type for legacy consumers
;

// Re-export the User interface shape for backward compatibility















































/**
 * Legacy Zustand-based auth store.
 *
 * ⚠️ DEPRECATED: This store is maintained for backward compatibility only.
 * New code should use `useFirebaseAuth()` from `@/lib/firebase-auth` directly.
 *
 * This store no longer persists tokens to localStorage (Firebase handles token storage).
 * The `login`, `logout`, etc. methods are no-ops — Firebase Auth state is the source of truth.
 */
import { create } from 'zustand';

export const useAuthStore = create()((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  expiresAt: null,
  isLoading: false,
  isInitialized: true,
  error: null,

  isLoggedIn: () => {
    const state = get();
    return !!state.user;
  },

  isTokenExpired: () => false,

  isAdmin: () => {
    const state = get();
    return _optionalChain([state, 'access', _ => _.user, 'optionalAccess', _2 => _2.role]) === 'ADMIN' || _optionalChain([state, 'access', _3 => _3.user, 'optionalAccess', _4 => _4.role]) === 'SUPER_ADMIN';
  },

  isSuperAdmin: () => {
    const state = get();
    return _optionalChain([state, 'access', _5 => _5.user, 'optionalAccess', _6 => _6.role]) === 'SUPER_ADMIN';
  },

  login: () => {},
  logout: () => {
    set({ user: null, token: null, refreshToken: null, expiresAt: null, error: null });
  },
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setInitialized: () => {},
  clearError: () => set({ error: null }),
  initialize: async () => {},
  refreshAuthToken: async () => false,
}));

/**
 * Hook that syncs Firebase Auth state into the legacy Zustand store.
 * Use this in components that still depend on `useAuthStore`.
 *
 * In new code, prefer `useFirebaseAuth()` directly.
 */
export function useFirebaseAuthSync() {
  const firebase = useFirebaseAuth();

  // Sync Firebase user into the legacy store
  useEffect(() => {
    if (firebase.user) {
      useAuthStore.getState().setUser({
        id: firebase.user.id,
        email: firebase.user.email,
        firstName: firebase.user.firstName,
        lastName: firebase.user.lastName,
        role: firebase.user.role,
        profileImageUrl: firebase.user.profileImageUrl,
        emailVerified: firebase.user.emailVerified,
      });
    } else {
      useAuthStore.getState().logout();
    }
  }, [firebase.user]);

  return firebase;
}

import { useEffect } from 'react';