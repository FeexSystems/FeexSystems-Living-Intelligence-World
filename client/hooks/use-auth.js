 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } async function _asyncNullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return await rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } async function _asyncOptionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = await fn(value); } else if (op === 'call' || op === 'optionalCall') { value = await fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Firebase Auth Hook — useAuth
 *
 * Provides Firebase Authentication state and actions.
 * Replaces the old custom JWT-based useAuth hook.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth, } from '@/lib/firebase-auth';
import { apiClient } from '@/lib/api-client';
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
    loginWithGoogle: firebaseLoginWithGoogle,
    clearError,
    refreshProfile,
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

  const loginWithGoogle = useCallback(async (redirectTo) => {
    try {
      await firebaseLoginWithGoogle();
      toast({
        title: 'Welcome!',
        description: 'You have been successfully authenticated.',
      });
      navigate(redirectTo || '/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google login failed';
      toast({
        title: 'Login Failed',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, [firebaseLoginWithGoogle, navigate]);

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

  const resendVerificationEmail = useCallback(async (_email) => {
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

  const verifyEmail = useCallback(async (_token) => {
    console.warn('verifyEmail is not fully implemented in use-auth');
  }, []);

  const resetPassword = useCallback(async (_token, _password) => {
    console.warn('resetPassword is not fully implemented in use-auth');
  }, []);

  const validateResetToken = useCallback(async (_token) => {
    console.warn('validateResetToken is not fully implemented in use-auth');
    return true;
  }, []);

  /**
   * Update the signed-in user's profile.
   *
   * The backend is authoritative, so the mutation is sent to the server and
   * the resulting profile is re-read from it. The email is NOT part of the
   * profile payload: Firebase Auth owns identity, and the email can only be
   * changed through the dedicated email endpoint (which re-verifies the
   * address in Firebase). Attempting to send it here would be rejected.
   */
  const updateProfile = useCallback(
    async (userData) => {
      const payload = {};
      if (typeof userData.firstName === 'string') payload.firstName = userData.firstName;
      if (typeof userData.lastName === 'string') payload.lastName = userData.lastName;
      if (typeof userData.profileImageUrl === 'string') {
        payload.profileImageUrl = userData.profileImageUrl;
      } else if (userData.profileImageUrl === null) {
        payload.profileImageUrl = null;
      }

      if (Object.keys(payload).length === 0) return;

      const response = await apiClient.put(
        '/users/profile',
        payload
      );
      const updated = await _asyncNullishCoalesce(await _asyncNullishCoalesce(await _asyncOptionalChain([response, 'optionalAccess', async _ => _.data, 'optionalAccess', async _2 => _2.user]), async () => ( _optionalChain([response, 'optionalAccess', _3 => _3.user]))), async () => ( (await refreshProfile())));
      if (updated) {
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been saved.',
        });
      }
    },
    [refreshProfile]
  );

  /**
   * Change the account's email address.
   *
   * Routed through its own endpoint because the email is owned by Firebase
   * Auth — the server applies the change there first and only then updates
   * the local projection.
   */
  const changeEmail = useCallback(
    async (email) => {
      await apiClient.put('/users/profile/email', { email });
      await refreshProfile();
      toast({
        title: 'Email Updated',
        description: 'Please check your inbox to verify the new address.',
      });
    },
    [refreshProfile]
  );

  /**
   * Upload a new profile image and return its public URL.
   *
   * The file is posted to the server, which stores it and returns the URL.
   * The caller is responsible for persisting that URL to the profile.
   */
  const uploadProfileImage = useCallback(
    async (file) => {
      const response = await apiClient.upload


('/users/profile/avatar', file, 'avatar');
      const url = _nullishCoalesce(_optionalChain([response, 'optionalAccess', _4 => _4.data, 'optionalAccess', _5 => _5.avatarUrl]), () => ( _optionalChain([response, 'optionalAccess', _6 => _6.avatarUrl])));
      if (!url) {
        throw new Error('The server did not return an image URL.');
      }
      return url;
    },
    []
  );

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    login,
    loginWithGoogle,
    register,
    logout,
    forgotPassword,
    resendVerificationEmail,
    clearError,
    verifyEmail,
    resetPassword,
    validateResetToken,
    updateProfile,
    changeEmail,
    uploadProfileImage,

    // Utilities
    hasRole,
    isAdmin: hasRole('ADMIN'),
    isSuperAdmin: hasRole('SUPER_ADMIN'),
  };
}

;