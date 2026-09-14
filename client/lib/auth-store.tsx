// Cookie-based auth store — tokens stored in httpOnly cookies, not localStorage
import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { apiClient } from './api-client';
import {
  setAccessToken,
  clearAccessToken,
  refreshAccessToken,
  initializeSession,
  getValidAccessToken,
} from './cookie-token-manager';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  profileImageUrl?: string;
  emailVerified: boolean;
  subscription?: {
    id: string;
    status: string;
    planId: string;
    currentPeriodEnd: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  validateResetToken: (token: string) => Promise<boolean>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  uploadProfileImage: (file: File) => Promise<string>;
}

type AuthStore = AuthState & AuthActions;

// Context for auth state
const AuthContext = createContext<AuthStore | null>(null);

// Hook to use auth context
export const useAuthStore = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthStore must be used within AuthStoreProvider');
  }
  return context;
};

// Provider component
export function AuthStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true, // Start loading until session check completes
    error: null,
  });

  // On mount: check if a valid session exists via httpOnly refresh cookie
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const hasSession = await initializeSession();
        if (cancelled) return;

        if (hasSession) {
          // Fetch user profile using the refreshed access token
          const data: any = await apiClient.get('/auth/me');
          if (!cancelled && data?.user) {
            setState(prev => ({
              ...prev,
              user: data.user,
              isAuthenticated: true,
              isLoading: false,
            }));
            return;
          }
        }
      } catch {
        // No valid session — user needs to log in
      }

      if (!cancelled) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Initialize API client with cookie-based token getter
  useEffect(() => {
    apiClient.initialize(async () => {
      const token = await getValidAccessToken();
      return token;
    });
  }, []);

  const updateState = useCallback((newState: Partial<AuthState>) => {
    setState(prevState => ({ ...prevState, ...newState }));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    updateState({ isLoading: true, error: null });
    
    try {
      const data: any = await apiClient.post('/auth/login', 
        { email, password },
        { requireAuth: false }
      );
      
      const newState = {
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
      
      updateState(newState);
      
      // Store access token in memory
      if (data.tokens) {
        setAccessToken(data.tokens.accessToken, data.tokens.expiresIn);
      }
    } catch (error) {
      updateState({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  }, [updateState]);

  const register = useCallback(async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    updateState({ isLoading: true, error: null });
    
    try {
      const data: any = await apiClient.post('/auth/register', 
        userData,
        { requireAuth: false }
      );
      
      // Store access token in memory (refresh token is set via httpOnly cookie by server)
      if (data.tokens?.accessToken) {
        setAccessToken(data.tokens.accessToken, data.tokens.expiresIn || 900);
      }
      
      updateState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      updateState({
        error: error instanceof Error ? error.message : 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  }, [updateState]);

  const logout = useCallback(async () => {
    // Clear access token in memory
    clearAccessToken();
    
    // Clear state
    updateState({
      user: null,
      isAuthenticated: false,
      error: null,
    });
    
    // Call logout endpoint to invalidate tokens (including httpOnly refresh cookie)
    try {
      await apiClient.post('/auth/logout', {}, { requireAuth: true });
    } catch (e) {
      // Ignore errors on logout endpoint
    }
  }, [updateState]);

  const refreshToken = useCallback(async () => {
    try {
      const newTokens = await refreshAccessToken();
      return newTokens;
    } catch (error) {
      // On refresh failure, logout user
      updateState({ user: null, isAuthenticated: false });
      throw error;
    }
  }, [updateState]);

  const updateUser = useCallback((userData: Partial<User>) => {
    if (state.user) {
      updateState({
        user: { ...state.user, ...userData },
      });
    }
  }, [state.user, updateState]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const setLoading = useCallback((loading: boolean) => {
    updateState({ isLoading: loading });
  }, [updateState]);

  const forgotPassword = useCallback(async (email: string) => {
    updateState({ isLoading: true, error: null });
    
    try {
      await apiClient.post('/auth/forgot-password', 
        { email },
        { requireAuth: false }
      );
      updateState({ isLoading: false });
    } catch (error) {
      updateState({
        error: error instanceof Error ? error.message : 'Failed to send reset email',
        isLoading: false,
      });
      throw error;
    }
  }, [updateState]);

  const resetPassword = useCallback(async (token: string, password: string) => {
    updateState({ isLoading: true, error: null });
    
    try {
      await apiClient.post('/auth/reset-password', 
        { token, password },
        { requireAuth: false }
      );
      updateState({ isLoading: false });
    } catch (error) {
      updateState({
        error: error instanceof Error ? error.message : 'Failed to reset password',
        isLoading: false,
      });
      throw error;
    }
  }, [updateState]);

  const validateResetToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      await apiClient.post('/auth/validate-reset-token', 
        { token },
        { requireAuth: false }
      );
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    updateState({ isLoading: true, error: null });
    
    try {
      await apiClient.post('/auth/verify-email', 
        { token },
        { requireAuth: false }
      );
      updateState({ isLoading: false });
    } catch (error) {
      updateState({
        error: error instanceof Error ? error.message : 'Email verification failed',
        isLoading: false,
      });
      throw error;
    }
  }, [updateState]);

  const resendVerificationEmail = useCallback(async (email: string) => {
    updateState({ isLoading: true, error: null });
    
    try {
      await apiClient.post('/auth/resend-verification', 
        { email },
        { requireAuth: false }
      );
      updateState({ isLoading: false });
    } catch (error) {
      updateState({
        error: error instanceof Error ? error.message : 'Failed to resend verification email',
        isLoading: false,
      });
      throw error;
    }
  }, [updateState]);

  const uploadProfileImage = useCallback(async (file: File): Promise<string> => {
    updateState({ isLoading: true, error: null });
    
    try {
      const data: any = await apiClient.upload('/users/upload-avatar', file, 'avatar');
      updateState({ isLoading: false });
      return data.profileImageUrl;
    } catch (error) {
      updateState({
        error: error instanceof Error ? error.message : 'Failed to upload profile image',
        isLoading: false,
      });
      throw error;
    }
  }, [updateState]);

  const value: AuthStore = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    clearError,
    setLoading,
    forgotPassword,
    resetPassword,
    validateResetToken,
    verifyEmail,
    resendVerificationEmail,
    uploadProfileImage,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}