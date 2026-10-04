import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * useAuth hook tests — rewritten 2026-10-03 for the Firebase architecture.
 *
 * The previous suite mocked `@/lib/auth-store` (a dependency the hook no
 * longer uses) and asserted a deleted JWT-era API (`tokens`, `refreshToken`,
 * `updateUser`, `setLoading`). The current hook (`client/hooks/use-auth.ts`)
 * wraps `useFirebaseAuth` from `@/lib/firebase-auth` and layers toast +
 * navigation side effects on top of it.
 *
 * This suite mocks the hook's real dependencies:
 *   - `@/lib/firebase-auth` → auth state + actions (the hook's data source)
 *   - `react-router-dom`    → `useNavigate` spy (MemoryRouter preserved)
 *   - `@/hooks/use-toast`   → `toast` spy
 *
 * Where the hook documents a stub (verifyEmail, resetPassword,
 * validateResetToken, updateProfile, uploadProfileImage), the stub behaviour
 * is asserted as-is rather than inventing success paths.
 */

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const navigateSpy = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: (payload: unknown) => toastSpy(payload),
}));

type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

interface MockAuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  emailVerified?: boolean;
}

/**
 * Stand-in for the FirebaseAuthContextValue consumed by `useAuth`.
 * Only the members the hook destructures are modelled; state is mutated
 * per test and reset in `beforeEach`.
 */
const firebaseAuth = {
  user: null as MockAuthUser | null,
  isAuthenticated: false,
  isLoading: false,
  error: null as string | null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
  resendVerificationEmail: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('@/lib/firebase-auth', () => ({
  useFirebaseAuth: () => firebaseAuth,
  // The real module also exports a runtime `AuthUser` marker; provided so the
  // compiled `use-auth.js` artifact (which re-exports it) resolves cleanly.
  AuthUser: {},
}));

// Imported after the mocks are declared so they apply to the module graph
// (vitest hoists `vi.mock` above imports; factory bodies read their captures
// lazily, when the hook actually runs).
import { useAuth } from '@/hooks/use-auth';

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

function renderUseAuth() {
  return renderHook(() => useAuth(), { wrapper });
}

function resetFirebaseAuth() {
  firebaseAuth.user = null;
  firebaseAuth.isAuthenticated = false;
  firebaseAuth.isLoading = false;
  firebaseAuth.error = null;
  firebaseAuth.login.mockReset();
  firebaseAuth.register.mockReset();
  firebaseAuth.logout.mockReset();
  firebaseAuth.forgotPassword.mockReset();
  firebaseAuth.resendVerificationEmail.mockReset();
  firebaseAuth.clearError.mockReset();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFirebaseAuth();
  });

  describe('authentication state', () => {
    it('returns the signed-out default state', () => {
      const { result } = renderUseAuth();

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('surfaces user and isAuthenticated from the Firebase context', () => {
      const user: MockAuthUser = {
        id: 'u-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        emailVerified: true,
      };
      firebaseAuth.user = user;
      firebaseAuth.isAuthenticated = true;

      const { result } = renderUseAuth();

      expect(result.current.user).toEqual(user);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('surfaces the loading state', () => {
      firebaseAuth.isLoading = true;

      const { result } = renderUseAuth();

      expect(result.current.isLoading).toBe(true);
    });

    it('surfaces the error state', () => {
      firebaseAuth.error = 'Firebase is not configured';

      const { result } = renderUseAuth();

      expect(result.current.error).toBe('Firebase is not configured');
    });
  });

  describe('login', () => {
    it('delegates to Firebase, toasts, and navigates to /dashboard', async () => {
      firebaseAuth.login.mockResolvedValueOnce(undefined);
      const { result } = renderUseAuth();

      await act(async () => {
        await result.current.login('test@example.com', 'secret123');
      });

      expect(firebaseAuth.login).toHaveBeenCalledWith('test@example.com', 'secret123');
      expect(toastSpy).toHaveBeenCalledWith({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.',
      });
      expect(navigateSpy).toHaveBeenCalledWith('/dashboard');
    });

    it('honours a custom redirect target', async () => {
      firebaseAuth.login.mockResolvedValueOnce(undefined);
      const { result } = renderUseAuth();

      await act(async () => {
        await result.current.login('test@example.com', 'secret123', '/projects');
      });

      expect(navigateSpy).toHaveBeenCalledWith('/projects');
    });

    it('toasts destructively and rethrows on failure', async () => {
      firebaseAuth.login.mockRejectedValueOnce(new Error('Invalid credentials'));
      const { result } = renderUseAuth();

      await act(async () => {
        await expect(result.current.login('test@example.com', 'wrong')).rejects.toThrow(
          'Invalid credentials'
        );
      });

      expect(toastSpy).toHaveBeenCalledWith({
        title: 'Login Failed',
        description: 'Invalid credentials',
        variant: 'destructive',
      });
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('normalises non-Error rejections to "An error occurred"', async () => {
      firebaseAuth.login.mockRejectedValueOnce('raw failure');
      const { result } = renderUseAuth();

      await act(async () => {
        await expect(result.current.login('test@example.com', 'x')).rejects.toBe('raw failure');
      });

      expect(toastSpy).toHaveBeenCalledWith({
        title: 'Login Failed',
        description: 'An error occurred',
        variant: 'destructive',
      });
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('flattens the user object into positional Firebase args, toasts, and navigates to /verify-email', async () => {
      firebaseAuth.register.mockResolvedValueOnce(undefined);
      const { result } = renderUseAuth();

      await act(async () => {
        await result.current.register({
          email: 'new@example.com',
          password: 'secret123',
          firstName: 'New',
          lastName: 'User',
        });
      });

      expect(firebaseAuth.register).toHaveBeenCalledWith(
        'new@example.com',
        'secret123',
        'New',
        'User'
      );
      expect(toastSpy).toHaveBeenCalledWith({
        title: 'Account Created!',
        description: 'Welcome to FeexSystems. Please check your email to verify your account.',
      });
      expect(navigateSpy).toHaveBeenCalledWith('/verify-email');
    });

    it('toasts destructively and rethrows on registration failure', async () => {
      firebaseAuth.register.mockRejectedValueOnce(new Error('Email already in use'));
      const { result } = renderUseAuth();

      await act(async () => {
        await expect(
          result.current.register({
            email: 'dup@example.com',
            password: 'secret123',
            firstName: 'Dup',
            lastName: 'User',
          })
        ).rejects.toThrow('Email already in use');
      });

      expect(toastSpy).toHaveBeenCalledWith({
        title: 'Registration Failed',
        description: 'Email already in use',
        variant: 'destructive',
      });
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('delegates to Firebase, toasts, and navigates to /login', async () => {
      firebaseAuth.logout.mockResolvedValueOnce(undefined);
      const { result } = renderUseAuth();

      await act(async () => {
        await result.current.logout();
      });

      expect(firebaseAuth.logout).toHaveBeenCalledWith();
      expect(toastSpy).toHaveBeenCalledWith({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
      expect(navigateSpy).toHaveBeenCalledWith('/login');
    });

    it('swallows logout failures (never rejects) and toasts an error', async () => {
      firebaseAuth.logout.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderUseAuth();

      await act(async () => {
        await expect(result.current.logout()).resolves.toBeUndefined();
      });

      expect(toastSpy).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Network error',
        variant: 'destructive',
      });
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('calls Firebase with the email and toasts success without navigating', async () => {
      firebaseAuth.forgotPassword.mockResolvedValueOnce(undefined);
      const { result } = renderUseAuth();

      await act(async () => {
        await result.current.forgotPassword('test@example.com');
      });

      expect(firebaseAuth.forgotPassword).toHaveBeenCalledWith('test@example.com');
      expect(toastSpy).toHaveBeenCalledWith({
        title: 'Reset Link Sent',
        description: 'Check your email for password reset instructions.',
      });
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('toasts destructively and rethrows on failure', async () => {
      firebaseAuth.forgotPassword.mockRejectedValueOnce(new Error('User not found'));
      const { result } = renderUseAuth();

      await act(async () => {
        await expect(result.current.forgotPassword('nobody@example.com')).rejects.toThrow(
          'User not found'
        );
      });

      expect(toastSpy).toHaveBeenCalledWith({
        title: 'Error',
        description: 'User not found',
        variant: 'destructive',
      });
    });
  });

  describe('resendVerificationEmail', () => {
    it('calls Firebase with no args (the email parameter is ignored) and toasts success', async () => {
      firebaseAuth.resendVerificationEmail.mockResolvedValueOnce(undefined);
      const { result } = renderUseAuth();

      await act(async () => {
        await result.current.resendVerificationEmail('test@example.com');
      });

      expect(firebaseAuth.resendVerificationEmail).toHaveBeenCalledWith();
      expect(toastSpy).toHaveBeenCalledWith({
        title: 'Verification Email Sent',
        description: 'Please check your email for the new verification link.',
      });
    });

    it('toasts destructively and rethrows on failure', async () => {
      firebaseAuth.resendVerificationEmail.mockRejectedValueOnce(new Error('Too many requests'));
      const { result } = renderUseAuth();

      await act(async () => {
        await expect(result.current.resendVerificationEmail()).rejects.toThrow('Too many requests');
      });

      expect(toastSpy).toHaveBeenCalledWith({
        title: 'Failed to Resend',
        description: 'Too many requests',
        variant: 'destructive',
      });
    });
  });

  describe('role-based access control', () => {
    it('grants an ADMIN every role up to (but not including) SUPER_ADMIN', () => {
      firebaseAuth.user = { id: 'a-1', email: 'admin@example.com', role: 'ADMIN' };

      const { result } = renderUseAuth();

      expect(result.current.hasRole('USER')).toBe(true);
      expect(result.current.hasRole('ADMIN')).toBe(true);
      expect(result.current.hasRole('SUPER_ADMIN')).toBe(false);
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isSuperAdmin).toBe(false);
    });

    it('grants a SUPER_ADMIN every role', () => {
      firebaseAuth.user = { id: 's-1', email: 'root@example.com', role: 'SUPER_ADMIN' };

      const { result } = renderUseAuth();

      expect(result.current.hasRole('USER')).toBe(true);
      expect(result.current.hasRole('ADMIN')).toBe(true);
      expect(result.current.hasRole('SUPER_ADMIN')).toBe(true);
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isSuperAdmin).toBe(true);
    });

    it('limits a plain USER to the USER role', () => {
      firebaseAuth.user = { id: 'u-1', email: 'user@example.com', role: 'USER' };

      const { result } = renderUseAuth();

      expect(result.current.hasRole('USER')).toBe(true);
      expect(result.current.hasRole('ADMIN')).toBe(false);
      expect(result.current.hasRole('SUPER_ADMIN')).toBe(false);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isSuperAdmin).toBe(false);
    });

    it('denies every role when there is no user', () => {
      const { result } = renderUseAuth();

      expect(result.current.hasRole('USER')).toBe(false);
      expect(result.current.hasRole('ADMIN')).toBe(false);
      expect(result.current.hasRole('SUPER_ADMIN')).toBe(false);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isSuperAdmin).toBe(false);
    });
  });

  it('exposes clearError directly from the Firebase auth context', () => {
    const { result } = renderUseAuth();

    expect(result.current.clearError).toBe(firebaseAuth.clearError);
  });

  describe('implemented stubs', () => {
    it('verifyEmail resolves undefined and warns', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { result } = renderUseAuth();

      await act(async () => {
        await expect(result.current.verifyEmail('token-123')).resolves.toBeUndefined();
      });

      expect(warn).toHaveBeenCalledWith('verifyEmail is not fully implemented in use-auth');
    });

    it('resetPassword resolves undefined and warns', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { result } = renderUseAuth();

      await act(async () => {
        await expect(
          result.current.resetPassword('token-123', 'new-password')
        ).resolves.toBeUndefined();
      });

      expect(warn).toHaveBeenCalledWith('resetPassword is not fully implemented in use-auth');
    });

    it('validateResetToken currently resolves true and warns', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { result } = renderUseAuth();

      await act(async () => {
        await expect(result.current.validateResetToken('token-123')).resolves.toBe(true);
      });

      expect(warn).toHaveBeenCalledWith('validateResetToken is not fully implemented in use-auth');
    });

    it('updateProfile resolves undefined and warns', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { result } = renderUseAuth();

      await act(async () => {
        await expect(
          result.current.updateProfile({ firstName: 'Updated' })
        ).resolves.toBeUndefined();
      });

      expect(warn).toHaveBeenCalledWith('updateProfile is not fully implemented in use-auth');
    });

    it('uploadProfileImage resolves an empty string and warns', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const file = new File(['dummy'], 'avatar.png', { type: 'image/png' });
      const { result } = renderUseAuth();

      await act(async () => {
        await expect(result.current.uploadProfileImage(file)).resolves.toBe('');
      });

      expect(warn).toHaveBeenCalledWith('uploadProfileImage is not fully implemented in use-auth');
    });
  });

  describe('API surface', () => {
    it('exposes every state property and method of the current hook', () => {
      const { result } = renderUseAuth();

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');

      const functionKeys = [
        'login',
        'register',
        'logout',
        'forgotPassword',
        'resendVerificationEmail',
        'clearError',
        'verifyEmail',
        'resetPassword',
        'validateResetToken',
        'updateProfile',
        'uploadProfileImage',
        'hasRole',
      ] as const;

      for (const key of functionKeys) {
        expect(typeof result.current[key]).toBe('function');
      }

      expect(typeof result.current.isAdmin).toBe('boolean');
      expect(typeof result.current.isSuperAdmin).toBe('boolean');
    });

    it('no longer exposes the removed JWT-era API', () => {
      const { result } = renderUseAuth();

      expect(result.current).not.toHaveProperty('tokens');
      expect(result.current).not.toHaveProperty('accessToken');
      expect(result.current).not.toHaveProperty('refreshToken');
      expect(result.current).not.toHaveProperty('setLoading');
      expect(result.current).not.toHaveProperty('updateUser');
    });
  });
});
