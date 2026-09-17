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
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as firebaseSignOut,
  type User,
} from './firebase';

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
    throw new Error('useFirebaseAuth must be used within FirebaseAuthProvider');
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

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
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
    });

    return unsubscribe;
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

  const register = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
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