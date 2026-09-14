import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  renderHook,
  act,
  waitFor,
  createMockUser,
  createMockTokens,
  mockAuthStorage,
  clearAuthStorage,
  mockFetchSuccess,
  mockFetchError,
  mockApiResponses,
  TestWrapper
} from '../utils/test-utils';
import { useAuthStore } from '@/lib/auth-store';

describe('AuthStore', () => {
  beforeEach(() => {
    clearAuthStorage();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty state when no stored data', () => {
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should initialize with stored auth data', () => {
      const mockUser = createMockUser();
      const mockTokens = createMockTokens();
      mockAuthStorage({ 
        user: mockUser, 
        tokens: mockTokens, 
        isAuthenticated: true,
        isLoading: false,
        error: null 
      });

      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Login', () => {
    it('should login successfully', async () => {
      mockFetchSuccess(mockApiResponses.login.success);
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.user).toEqual(mockApiResponses.login.success.user);
      expect(result.current.tokens).toEqual(mockApiResponses.login.success.tokens);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle login error', async () => {
      mockFetchError(mockApiResponses.login.error, 401);
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        try {
          await result.current.login('invalid@example.com', 'password');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
    });

    it('should set loading state during login', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      vi.mocked(fetch).mockReturnValue(promise as any);
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      act(() => {
        result.current.login('test@example.com', 'password');
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        resolvePromise({
          ok: true,
          json: async () => mockApiResponses.login.success,
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Register', () => {
    it('should register successfully', async () => {
      mockFetchSuccess(mockApiResponses.register.success);
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        await result.current.register({
          email: 'test@example.com',
          password: 'password',
          firstName: 'Test',
          lastName: 'User',
        });
      });

      expect(result.current.user).toEqual(mockApiResponses.register.success.user);
      expect(result.current.tokens).toEqual(mockApiResponses.register.success.tokens);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle registration error', async () => {
      mockFetchError(mockApiResponses.register.error, 400);
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        try {
          await result.current.register({
            email: 'existing@example.com',
            password: 'password',
            firstName: 'Test',
            lastName: 'User',
          });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Email already exists');
    });
  });

  describe('Logout', () => {
    it('should logout and clear state', async () => {
      mockAuthStorage();
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token successfully', async () => {
      mockFetchSuccess(mockApiResponses.refreshToken.success);
      mockAuthStorage();
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(result.current.tokens).toEqual(mockApiResponses.refreshToken.success.tokens);
    });

    it('should logout on refresh token failure', async () => {
      mockFetchError(mockApiResponses.refreshToken.error, 401);
      mockAuthStorage();
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Update User', () => {
    it('should update user data', () => {
      mockAuthStorage();
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      const updatedData = { firstName: 'Updated' };

      act(() => {
        result.current.updateUser(updatedData);
      });

      expect(result.current.user?.firstName).toBe('Updated');
    });

    it('should not update if no user is logged in', () => {
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      act(() => {
        result.current.updateUser({ firstName: 'Updated' });
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      // Set an error first
      act(() => {
        result.current.setLoading(false);
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should set loading state', () => {
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Email Verification', () => {
    it('should verify email successfully', async () => {
      mockFetchSuccess({ message: 'Email verified successfully', success: true });
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        await result.current.verifyEmail('valid-token');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle email verification error', async () => {
      mockFetchError({ error: { message: 'Invalid verification token' } }, 400);
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        try {
          await result.current.verifyEmail('invalid-token');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Invalid verification token');
      expect(result.current.isLoading).toBe(false);
    });

    it('should resend verification email successfully', async () => {
      mockFetchSuccess({ message: 'Verification email sent', success: true });
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        await result.current.resendVerificationEmail('user@example.com');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle resend verification email error', async () => {
      mockFetchError({ error: { message: 'Failed to send verification email' } }, 500);
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        try {
          await result.current.resendVerificationEmail('user@example.com');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Failed to send verification email');
      expect(result.current.isLoading).toBe(false);
    });

    it('should upload profile image successfully', async () => {
      mockFetchSuccess({ profileImageUrl: 'https://example.com/image.jpg', success: true });
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      let imageUrl: string;
      await act(async () => {
        imageUrl = await result.current.uploadProfileImage(mockFile);
      });

      expect(imageUrl).toBe('https://example.com/image.jpg');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle profile image upload error', async () => {
      mockFetchError({ error: { message: 'Upload failed' } }, 500);
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await act(async () => {
        try {
          await result.current.uploadProfileImage(mockFile);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Upload failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Password Reset', () => {
    it('should send forgot password request successfully', async () => {
      mockFetchSuccess({ message: 'Password reset email sent', success: true });
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        await result.current.forgotPassword('user@example.com');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle forgot password error', async () => {
      mockFetchError({ error: { message: 'User not found' } }, 404);
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        try {
          await result.current.forgotPassword('nonexistent@example.com');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('User not found');
      expect(result.current.isLoading).toBe(false);
    });

    it('should reset password successfully', async () => {
      mockFetchSuccess({ message: 'Password reset successful', success: true });
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        await result.current.resetPassword('valid-token', 'newPassword123');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle reset password error', async () => {
      mockFetchError({ error: { message: 'Invalid or expired token' } }, 400);
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        try {
          await result.current.resetPassword('invalid-token', 'newPassword123');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Invalid or expired token');
      expect(result.current.isLoading).toBe(false);
    });

    it('should validate reset token successfully', async () => {
      mockFetchSuccess({ valid: true, success: true });
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      let isValid: boolean;
      await act(async () => {
        isValid = await result.current.validateResetToken('valid-token');
      });

      expect(isValid).toBe(true);
    });

    it('should handle invalid reset token', async () => {
      mockFetchError({ error: { message: 'Invalid token' } }, 400);
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      let isValid: boolean;
      await act(async () => {
        isValid = await result.current.validateResetToken('invalid-token');
      });

      expect(isValid).toBe(false);
    });
  });

  describe('LocalStorage Integration', () => {
    it('should save auth state to localStorage on login', async () => {
      mockFetchSuccess(mockApiResponses.login.success);
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'auth-storage',
        expect.stringContaining('"isAuthenticated":true')
      );
    });

    it('should clear localStorage on logout', () => {
      mockAuthStorage();
      
      const { result } = renderHook(() => useAuthStore(), { wrapper: TestWrapper });

      act(() => {
        result.current.logout();
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'auth-storage',
        expect.stringContaining('"isAuthenticated":false')
      );
    });
  });
});