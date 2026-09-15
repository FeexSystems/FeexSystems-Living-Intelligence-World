import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockUser, createMockTokens } from '../utils/test-utils';

// Mock the dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

describe('useAuth Hook Logic', () => {
  let mockNavigate;
  let mockToast;
  let mockAuthStore;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockNavigate = vi.fn();
    mockToast = vi.fn();
    
    mockAuthStore = {
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      updateUser: vi.fn(),
      clearError: vi.fn(),
      setLoading: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      validateResetToken: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerificationEmail: vi.fn(),
      uploadProfileImage: vi.fn(),
    };

    // Mock the imports
    vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(require('@/hooks/use-toast').toast).mockImplementation(mockToast);
    vi.mocked(require('@/lib/auth-store').useAuthStore).mockReturnValue(mockAuthStore);
  });

  describe('Authentication State', () => {
    it('should return auth state from store', () => {
      const mockUser = createMockUser();
      const mockTokens = createMockTokens();
      
      mockAuthStore.user = mockUser;
      mockAuthStore.tokens = mockTokens;
      mockAuthStore.isAuthenticated = true;

      // Import and test the hook logic
      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      expect(authHook.user).toEqual(mockUser);
      expect(authHook.tokens).toEqual(mockTokens);
      expect(authHook.isAuthenticated).toBe(true);
    });

    it('should return loading state', () => {
      mockAuthStore.isLoading = true;

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      expect(authHook.isLoading).toBe(true);
    });

    it('should return error state', () => {
      mockAuthStore.error = 'Test error';

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      expect(authHook.error).toBe('Test error');
    });
  });

  describe('Login Function', () => {
    it('should call store login and navigate on success', async () => {
      mockAuthStore.login.mockResolvedValueOnce(undefined);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      await authHook.login('test@example.com', 'password');

      expect(mockAuthStore.login).toHaveBeenCalledWith('test@example.com', 'password');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to custom redirect URL', async () => {
      mockAuthStore.login.mockResolvedValueOnce(undefined);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      await authHook.login('test@example.com', 'password', '/custom-page');

      expect(mockNavigate).toHaveBeenCalledWith('/custom-page');
    });

    it('should handle login error', async () => {
      const error = new Error('Login failed');
      mockAuthStore.login.mockRejectedValueOnce(error);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      await expect(authHook.login('test@example.com', 'password')).rejects.toThrow('Login failed');

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Login Failed',
        description: 'Login failed',
        variant: 'destructive',
      });
    });
  });

  describe('Register Function', () => {
    it('should call store register and navigate on success', async () => {
      mockAuthStore.register.mockResolvedValueOnce(undefined);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      const userData = {
        email: 'test@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
      };

      await authHook.register(userData);

      expect(mockAuthStore.register).toHaveBeenCalledWith(userData);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Account Created!',
        description: 'Welcome to FeexSystems. Please verify your email.',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/verify-email');
    });

    it('should handle registration error', async () => {
      const error = new Error('Registration failed');
      mockAuthStore.register.mockRejectedValueOnce(error);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      const userData = {
        email: 'test@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
      };

      await expect(authHook.register(userData)).rejects.toThrow('Registration failed');

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Registration Failed',
        description: 'Registration failed',
        variant: 'destructive',
      });
    });
  });

  describe('Logout Function', () => {
    it('should call store logout and navigate', () => {
      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      authHook.logout();

      expect(mockAuthStore.logout).toHaveBeenCalledOnce();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Role-based Access', () => {
    it('should check user role correctly', () => {
      mockAuthStore.user = createMockUser({ role: 'ADMIN' });

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      expect(authHook.hasRole('USER')).toBe(true);
      expect(authHook.hasRole('ADMIN')).toBe(true);
      expect(authHook.hasRole('SUPER_ADMIN')).toBe(false);
    });

    it('should return false for role check when no user', () => {
      mockAuthStore.user = null;

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      expect(authHook.hasRole('USER')).toBe(false);
      expect(authHook.hasRole('ADMIN')).toBe(false);
      expect(authHook.hasRole('SUPER_ADMIN')).toBe(false);
    });

    it('should check admin role', () => {
      mockAuthStore.user = createMockUser({ role: 'ADMIN' });

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      expect(authHook.isAdmin()).toBe(true);
    });

    it('should check super admin role', () => {
      mockAuthStore.user = createMockUser({ role: 'SUPER_ADMIN' });

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      expect(authHook.isSuperAdmin()).toBe(true);
      expect(authHook.isAdmin()).toBe(true); // Super admin should also be admin
    });
  });

  describe('Profile Update', () => {
    it('should update profile optimistically', async () => {
      mockAuthStore.user = createMockUser();

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      const updateData = { firstName: 'Updated' };
      await authHook.updateProfile(updateData);

      expect(mockAuthStore.setLoading).toHaveBeenCalledWith(true);
      expect(mockAuthStore.updateUser).toHaveBeenCalledWith(updateData);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
      expect(mockAuthStore.setLoading).toHaveBeenCalledWith(false);
    });

    it('should handle profile update error', async () => {
      mockAuthStore.user = createMockUser();
      // Simulate error by making setLoading throw
      mockAuthStore.setLoading.mockImplementationOnce(() => {
        throw new Error('Update failed');
      });

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      const updateData = { firstName: 'Updated' };
      await expect(authHook.updateProfile(updateData)).rejects.toThrow('Update failed');

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Update Failed',
        description: 'Update failed',
        variant: 'destructive',
      });
    });
  });

  describe('Auth Status Check', () => {
    it('should return false when no tokens', async () => {
      mockAuthStore.tokens = null;

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      const isValid = await authHook.checkAuthStatus();
      expect(isValid).toBe(false);
    });

    it('should return true when tokens exist', async () => {
      mockAuthStore.tokens = createMockTokens();

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      const isValid = await authHook.checkAuthStatus();
      expect(isValid).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should expose refresh token function', () => {
      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      expect(authHook.refreshToken).toBe(mockAuthStore.refreshToken);
    });

    it('should expose clear error function', () => {
      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      expect(authHook.clearError).toBe(mockAuthStore.clearError);
    });
  });

  describe('Password Reset Functions', () => {
    it('should call forgot password and show success toast', async () => {
      mockAuthStore.forgotPassword.mockResolvedValueOnce(undefined);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      await authHook.forgotPassword('user@example.com');

      expect(mockAuthStore.forgotPassword).toHaveBeenCalledWith('user@example.com');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Reset Link Sent',
        description: 'Check your email for password reset instructions.',
      });
    });

    it('should handle forgot password error', async () => {
      const error = new Error('Failed to send reset email');
      mockAuthStore.forgotPassword.mockRejectedValueOnce(error);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      await expect(authHook.forgotPassword('user@example.com')).rejects.toThrow('Failed to send reset email');

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to send reset email',
        variant: 'destructive',
      });
    });

    it('should call reset password and show success toast', async () => {
      mockAuthStore.resetPassword.mockResolvedValueOnce(undefined);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      await authHook.resetPassword('valid-token', 'newPassword123');

      expect(mockAuthStore.resetPassword).toHaveBeenCalledWith('valid-token', 'newPassword123');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Password Reset Successful',
        description: 'Your password has been updated successfully.',
      });
    });

    it('should handle reset password error', async () => {
      const error = new Error('Failed to reset password');
      mockAuthStore.resetPassword.mockRejectedValueOnce(error);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      await expect(authHook.resetPassword('invalid-token', 'newPassword123')).rejects.toThrow('Failed to reset password');

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Reset Failed',
        description: 'Failed to reset password',
        variant: 'destructive',
      });
    });

    it('should validate reset token', async () => {
      mockAuthStore.validateResetToken.mockResolvedValueOnce(true);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      const isValid = await authHook.validateResetToken('valid-token');

      expect(mockAuthStore.validateResetToken).toHaveBeenCalledWith('valid-token');
      expect(isValid).toBe(true);
    });
  });

  describe('Email Verification Functions', () => {
    it('should call verify email and show success toast', async () => {
      mockAuthStore.verifyEmail.mockResolvedValueOnce(undefined);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      await authHook.verifyEmail('valid-token');

      expect(mockAuthStore.verifyEmail).toHaveBeenCalledWith('valid-token');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Email Verified!',
        description: 'Your account has been successfully verified.',
      });
    });

    it('should handle verify email error', async () => {
      const error = new Error('Invalid verification token');
      mockAuthStore.verifyEmail.mockRejectedValueOnce(error);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      await expect(authHook.verifyEmail('invalid-token')).rejects.toThrow('Invalid verification token');

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Verification Failed',
        description: 'Invalid verification token',
        variant: 'destructive',
      });
    });

    it('should call resend verification email and show success toast', async () => {
      mockAuthStore.resendVerificationEmail.mockResolvedValueOnce(undefined);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      await authHook.resendVerificationEmail('user@example.com');

      expect(mockAuthStore.resendVerificationEmail).toHaveBeenCalledWith('user@example.com');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Verification Email Sent',
        description: 'Please check your email for the new verification link.',
      });
    });

    it('should handle resend verification email error', async () => {
      const error = new Error('Failed to send verification email');
      mockAuthStore.resendVerificationEmail.mockRejectedValueOnce(error);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      await expect(authHook.resendVerificationEmail('user@example.com')).rejects.toThrow('Failed to send verification email');

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to Resend',
        description: 'Failed to send verification email',
        variant: 'destructive',
      });
    });
  });

  describe('Profile Image Upload Functions', () => {
    it('should call upload profile image and show success toast', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockAuthStore.uploadProfileImage.mockResolvedValueOnce('https://example.com/image.jpg');

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      const imageUrl = await authHook.uploadProfileImage(mockFile);

      expect(mockAuthStore.uploadProfileImage).toHaveBeenCalledWith(mockFile);
      expect(imageUrl).toBe('https://example.com/image.jpg');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Profile Image Updated',
        description: 'Your profile image has been successfully updated.',
      });
    });

    it('should handle upload profile image error', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const error = new Error('Upload failed');
      mockAuthStore.uploadProfileImage.mockRejectedValueOnce(error);

      const { useAuth } = require('@/hooks/use-auth');
      const authHook = useAuth();

      await expect(authHook.uploadProfileImage(mockFile)).rejects.toThrow('Upload failed');

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Upload Failed',
        description: 'Upload failed',
        variant: 'destructive',
      });
    });
  });
});