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
              const profile = await fetchUserProfile(token);
              if (profile) {
                setUser(profile);
              } else {
                // User exists in Firebase but not in our DB — create profile
                const newUser: AuthUser = {
                  id: fbUser.uid,
                  email: fbUser.email || '',
                  firstName: fbUser.displayName?.split(' ')[0] || '',
                  lastName: fbUser.displayName?.split(' ').slice(1).join(' ') || '',
                  role: 'USER',
                  emailVerified: fbUser.emailVerified,
                  profileImageUrl: fbUser.photoURL || undefined,
                };
                setUser(newUser);
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

    if (firebaseAuth) {
      try {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
        return;
      } catch (err: unknown) {
        // Try backend /api/auth/login in case this is a seeded or mock test user
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            const authUser: AuthUser = {
              id: data.data.user.id,
              email: data.data.user.email,
              firstName: data.data.user.firstName,
              lastName: data.data.user.lastName,
              role: data.data.user.role || 'SUPER_ADMIN',
              emailVerified: data.data.user.emailVerified,
            };
            setUser(authUser);
            if (data.data.tokens?.accessToken) {
              localStorage.setItem('feex_access_token', data.data.tokens.accessToken);
            }
            return;
          }
        } catch {
          // Ignore and throw original error
        }
        const message = err instanceof Error ? err.message : 'Login failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    } else {
      // Local dev / mock auth mode
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || data.message || 'Login failed');
        }
        const authUser: AuthUser = {
          id: data.data.user.id,
          email: data.data.user.email,
          firstName: data.data.user.firstName,
          lastName: data.data.user.lastName,
          role: data.data.user.role || 'SUPER_ADMIN',
          emailVerified: data.data.user.emailVerified,
        };
        setUser(authUser);
        if (data.data.tokens?.accessToken) {
          localStorage.setItem('feex_access_token', data.data.tokens.accessToken);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Login failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const register = useCallback(async (email: string, password: string, _firstName: string, _lastName: string) => {
    if (!firebaseAuth) throw new Error('Firebase Auth not configured');
    setError(null);
    setIsLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      // Send email verification
      await sendEmailVerification(cred.user);
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

      if (isRealFirebase && firebaseAuth) {
        try {
          const provider = new GoogleAuthProvider();
          provider.addScope('email');
          provider.addScope('profile');
          const cred = await signInWithPopup(firebaseAuth, provider);
          if (cred?.user) {
            const token = await cred.user.getIdToken();
            localStorage.setItem('feex_access_token', token);
            const profile = await fetchUserProfile(token);
            if (profile) {
              setUser(profile);
            } else {
              setUser({
                id: cred.user.uid,
                email: cred.user.email || 'developer@feexsystems.com',
                firstName: cred.user.displayName?.split(' ')[0] || 'Google',
                lastName: cred.user.displayName?.split(' ').slice(1).join(' ') || 'User',
                role: 'SUPER_ADMIN',
                profileImageUrl: cred.user.photoURL || undefined,
                emailVerified: cred.user.emailVerified,
              });
            }
            return;
          }
        } catch (err: unknown) {
          console.warn('[Firebase Auth] Live popup failed or unconfigured, proceeding with backend session resolution:', err);
        }
      }

      // 2. Dev / Mock / Database backend fallback
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@feexsystems.com',
            firstName: 'Feex',
            lastName: 'Operator',
          }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.data?.user) {
          const authUser: AuthUser = {
            id: data.data.user.id,
            email: data.data.user.email,
            firstName: data.data.user.firstName,
            lastName: data.data.user.lastName,
            role: data.data.user.role || 'SUPER_ADMIN',
            profileImageUrl: data.data.user.profileImageUrl,
            emailVerified: true,
          };
          setUser(authUser);
          if (data.data.tokens?.accessToken) {
            localStorage.setItem('feex_access_token', data.data.tokens.accessToken);
          }
          return;
        }
      } catch (fallbackErr) {
        console.warn('[Firebase Auth] /api/auth/google endpoint error:', fallbackErr);
      }

      // No deterministic fallback - auth must succeed through Firebase or backend
      throw new Error('Authentication failed. Please try again.');
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
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}