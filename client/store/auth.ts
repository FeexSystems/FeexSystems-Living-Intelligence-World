/**
 * Auth store — thin re-export wrapper around Firebase Auth.
 *
 * This file exists so that legacy imports of `useAuthStore` continue to work
 * while the underlying implementation delegates entirely to Firebase Auth.
 *
 * All token / refreshToken management is now handled internally by Firebase.
 */

import { useFirebaseAuth, AuthUser } from '@/lib/firebase-auth';

// Re-export the AuthUser type for legacy consumers
export type { AuthUser };

// Re-export the User interface shape for backward compatibility
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  profileImageUrl?: string;
  emailVerified?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthError {
  type: string;
  message: string;
  code: string;
  timestamp: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: AuthError | null;

  // Computed
  isLoggedIn: () => boolean;
  isTokenExpired: () => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;

  // Actions
  login: (user: User, token: string, refreshToken?: string, expiresIn?: number) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: AuthError | null) => void;
  setInitialized: (initialized: boolean) => void;
  refreshAuthToken: () => Promise<boolean>;
  clearError: () => void;
  initialize: () => Promise<void>;
}

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

export const useAuthStore = create<AuthState>()((set, get) => ({
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
    return state.user?.role === 'ADMIN' || state.user?.role === 'SUPER_ADMIN';
  },

  isSuperAdmin: () => {
    const state = get();
    return state.user?.role === 'SUPER_ADMIN';
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