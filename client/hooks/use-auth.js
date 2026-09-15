/**
 * Firebase Auth Hook — useAuth
 *
 * Provides Firebase Authentication state and actions.
 * Replaces the old custom JWT-based useAuth hook.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth, AuthUser } from '@/lib/firebase-auth';
import { toast } from '@/hooks/use-toast';

export function useAuth() {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: firebaseLogin,
    register: firebaseRegister,
    logout: firebaseLogout,
    forgotPassword: firebaseForgotPassword,
    resendVerificationEmail: firebaseResendVerification,
    clearError,
  } = useFirebaseAuth();

  const login = useCallback(
    async (email, password, redirectTo) => {
      try {
        await firebaseLogin(email, password);
        toast({
          title: 'Welcome back!',
          description: 'You have been successfully logged in.',
        });
        navigate(redirectTo || '/dashboard');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        toast({
          title: 'Login Failed',
          description: message,
          variant: 'destructive',
        });
        throw error;
      }
    },
    [firebaseLogin, navigate]
  );

  const register = useCallback(
    async (userData




) => {
      try {
        await firebaseRegister(userData.email, userData.password, userData.firstName, userData.lastName);
        toast({
          title: 'Account Created!',
          description: 'Welcome to FeexSystems. Please check your email to verify your account.',
        });
        navigate('/verify-email');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        toast({
          title: 'Registration Failed',
          description: message,
          variant: 'destructive',
        });
        throw error;
      }
    },
    [firebaseRegister, navigate]
  );

  const logout = useCallback(async () => {
    try {
      await firebaseLogout();
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
      navigate('/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  }, [firebaseLogout, navigate]);

  const forgotPassword = useCallback(
    async (email) => {
      try {
        await firebaseForgotPassword(email);
        toast({
          title: 'Reset Link Sent',
          description: 'Check your email for password reset instructions.',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send reset email';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
        throw error;
      }
    },
    [firebaseForgotPassword]
  );

  const resendVerificationEmail = useCallback(async (email) => {
    try {
      await firebaseResendVerification();
      toast({
        title: 'Verification Email Sent',
        description: 'Please check your email for the new verification link.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send verification email';
      toast({
        title: 'Failed to Resend',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, [firebaseResendVerification]);

  const hasRole = useCallback(
    (role) => {
      if (!user) return false;
      const roleHierarchy = { USER: 0, ADMIN: 1, SUPER_ADMIN: 2 };
      return roleHierarchy[user.role] >= roleHierarchy[role];
    },
    [user]
  );

  const verifyEmail = useCallback(async (token) => {
    console.warn('verifyEmail is not fully implemented in use-auth');
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    console.warn('resetPassword is not fully implemented in use-auth');
  }, []);

  const validateResetToken = useCallback(async (token) => {
    console.warn('validateResetToken is not fully implemented in use-auth');
    return true;
  }, []);

  const updateProfile = useCallback(async (userData) => {
    console.warn('updateProfile is not fully implemented in use-auth');
  }, []);

  const uploadProfileImage = useCallback(async (file) => {
    console.warn('uploadProfileImage is not fully implemented in use-auth');
    return "";
  }, []);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    login,
    register,
    logout,
    forgotPassword,
    resendVerificationEmail,
    clearError,
    verifyEmail,
    resetPassword,
    validateResetToken,
    updateProfile,
    uploadProfileImage,

    // Utilities
    hasRole,
    isAdmin: hasRole('ADMIN'),
    isSuperAdmin: hasRole('SUPER_ADMIN'),
  };
}

;