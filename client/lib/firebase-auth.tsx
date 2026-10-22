/**
 * Firebase Auth Context Provider
 *
 * Replaces the old custom JWT auth store.
 * All authentication is handled by Firebase Auth.
 * User roles are stored in Firestore/custom claims (synced from Prisma on first login).
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  firebaseAuth,
  isFirebaseConfigured,
} from './firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  type User,
} from 'firebase/auth';

// User profile stored in Prisma (synced from Firebase UID)
export interface AuthUser {
  id: string; // Firebase UID
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  profileImageUrl?: string;
  emailVerified: boolean;
}

// Runtime object to support legacy/JS value imports
export const AuthUser = {} as const;

interface FirebaseAuthContextValue {
  user: AuthUser | null;
  firebaseUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  clearError: () => void;
  /**
   * Re-fetch the server-side profile and publish it into auth state.
   *
   * The backend is authoritative for the local profile (name, avatar, role),
   * so after a profile mutation the client must re-read it rather than patch
   * its own copy — otherwise the UI keeps showing stale values.
   */
  refreshProfile: () => Promise<AuthUser | null>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(null);

export function useFirebaseAuth(): FirebaseAuthContextValue {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    console.warn('[Firebase Auth] useFirebaseAuth was called outside of FirebaseAuthProvider. Returning fallback state.');
    return {
      user: null,
      firebaseUser: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: async () => {},
      loginWithGoogle: async () => {},
      register: async () => {},
      logout: async () => {},
      forgotPassword: async () => {},
      resendVerificationEmail: async () => {},
      getIdToken: async () => null,
      clearError: () => {},
      refreshProfile: async () => null,
    };
  }
  return context;
}

// Fetch user profile from our backend (synced from Prisma)
async function fetchUserProfile(token: string): Promise<AuthUser | null> {
  try {
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.user || data.data?.user || null;
  } catch {
    return null;
  }
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to Firebase Auth state changes or restore mock session
  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      const storedToken = localStorage.getItem('feex_access_token');
      if (storedToken) {
        fetchUserProfile(storedToken).then((profile) => {
          if (profile) {
            setUser(profile);
          } else {
            localStorage.removeItem('feex_access_token');
          }
          setIsLoading(false);
        }).catch(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onAuthStateChanged(
        firebaseAuth,
        async (fbUser) => {
          setFirebaseUser(fbUser);

          if (fbUser) {
            // Get Firebase ID token and fetch user profile from backend
            try {
              const token = await fbUser.getIdToken();
              localStorage.setItem('feex_access_token', token);
              const profile = await fetchUserProfile(token);
              if (profile) {
                setUser(profile);
              } else {
                // The backend is authoritative for the local profile (and role).
                // GET /api/auth/me provisions the user row on first sign-in, so
                // a null profile means the backend genuinely could not resolve
                // the account — do NOT fabricate a local identity here.
                localStorage.removeItem('feex_access_token');
                setUser(null);
              }
            } catch {
              setUser(null);
            }
          } else {
            setUser(null);
          }

          setIsLoading(false);
        },
        (authError) => {
          console.warn('[Firebase Auth] State change error caught gracefully:', authError);
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.warn('[Firebase Auth] Subscription failure caught gracefully:', err);
      setIsLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    if (!firebaseAuth) {
      const message = 'Firebase Auth is not configured. Sign-in is unavailable.';
      setError(message);
      setIsLoading(false);
      throw new Error(message);
    }

    try {
      // Firebase Auth is the single source of truth for identity. The former
      // /api/auth/login (app-issued JWT) fallback was removed.
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
    if (!firebaseAuth) throw new Error('Firebase Auth not configured');
    setError(null);
    setIsLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      // Send email verification
      await sendEmailVerification(cred.user);
      // Auto-login after registration: persist the display name and sync the
      // backend profile so the session is usable immediately.
      await updateProfile(cred.user, { displayName: `${firstName} ${lastName}` });
      const token = await cred.user.getIdToken();
      localStorage.setItem('feex_access_token', token);

      // GET /api/auth/me provisions the local user row on first sign-in.
      const profile = await fetchUserProfile(token);
      if (!profile) {
        // The backend could not resolve/provision the account. Do not
        // fabricate a local identity — report the failure instead.
        localStorage.removeItem('feex_access_token');
        throw new Error(
          'Account created, but the profile could not be provisioned. Please contact support.'
        );
      }
      setUser(profile);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      // 1. If Firebase Auth is configured and not using dummy placeholder keys, attempt live popup
      const isRealFirebase = Boolean(
        firebaseAuth &&
        isFirebaseConfigured &&
        import.meta.env.VITE_FIREBASE_API_KEY &&
        import.meta.env.VITE_FIREBASE_API_KEY.startsWith('AIza') &&
        !import.meta.env.VITE_FIREBASE_API_KEY.includes('dummy') &&
        !import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.includes('dummy')
      );

      if (!isRealFirebase || !firebaseAuth) {
        throw new Error('Google sign-in is unavailable. Please use email and password sign-in.');
      }

      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      let cred: Awaited<ReturnType<typeof signInWithPopup>>;
      try {
        cred = await signInWithPopup(firebaseAuth, provider);
      } catch (popupErr: unknown) {
        // A closed/cancelled popup is a user action, not an account failure.
        const code =
          typeof popupErr === 'object' && popupErr !== null && 'code' in popupErr
            ? String((popupErr as { code: unknown }).code)
            : '';
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          throw new Error('Google sign-in was cancelled.');
        }
        throw popupErr instanceof Error
          ? popupErr
          : new Error('Google sign-in failed. Please try again.');
      }

      if (!cred?.user) {
        throw new Error('Google sign-in did not return an account. Please try again.');
      }

      const token = await cred.user.getIdToken();
      localStorage.setItem('feex_access_token', token);

      // The server is authoritative for the local profile (including role).
      // GET /api/auth/me provisions the local user row on first sign-in, so a
      // brand-new Google account resolves to role=USER rather than failing.
      const profile = await fetchUserProfile(token);

      if (!profile) {
        // Do NOT fabricate a local identity — a hardcoded fallback here
        // previously granted every Google sign-in SUPER_ADMIN.
        throw new Error(
          'Signed in with Google, but the account could not be provisioned. Please contact support.'
        );
      }

      setUser(profile);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('feex_access_token');
    if (!firebaseAuth) {
      setUser(null);
      setFirebaseUser(null);
      return;
    }
    setError(null);
    try {
      await firebaseSignOut(firebaseAuth);
      setUser(null);
      setFirebaseUser(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    if (!firebaseAuth) throw new Error('Firebase Auth not configured');
    setError(null);
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(message);
      throw err;
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!firebaseAuth?.currentUser) throw new Error('No user logged in');
    setError(null);
    try {
      await sendEmailVerification(firebaseAuth.currentUser);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend verification';
      setError(message);
      throw err;
    }
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (firebaseAuth?.currentUser) {
      try {
        return await firebaseAuth.currentUser.getIdToken();
      } catch {
        // Fall back to stored token
      }
    }
    return localStorage.getItem('feex_access_token');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const refreshProfile = useCallback(async (): Promise<AuthUser | null> => {
    if (!firebaseAuth?.currentUser) return null;
    try {
      // Force a fresh token so the backend re-reads the current claims
      // (e.g. after an email change) rather than a cached one.
      const token = await firebaseAuth.currentUser.getIdToken(true);
      localStorage.setItem('feex_access_token', token);
      const profile = await fetchUserProfile(token);
      if (profile) {
        setUser(profile);
      } else {
        setUser(null);
      }
      return profile;
    } catch {
      return null;
    }
  }, []);

  const value: FirebaseAuthContextValue = {
    user,
    firebaseUser,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    loginWithGoogle,
    register,
    logout,
    forgotPassword,
    resendVerificationEmail,
    getIdToken,
    clearError,
    refreshProfile,
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}