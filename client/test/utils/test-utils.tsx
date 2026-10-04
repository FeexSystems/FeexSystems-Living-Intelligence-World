import React from 'react';
import { vi } from 'vitest';
import { render, renderHook, act, waitFor } from '@testing-library/react';
import { AuthStoreProvider } from '@/lib/auth-store';
import { mockApiResponses } from '../mocks/api';
import { createMockUser, createMockTokens } from './mock-factories';

// Re-export testing utilities and mock factories
export { render, renderHook, act, waitFor };
export { createMockUser, createMockTokens };

// Helper function to create mock auth state
export const createMockAuthState = (overrides = {}) => ({
  user: createMockUser(),
  tokens: createMockTokens(),
  isAuthenticated: true,
  isLoading: false,
  error: null,
  ...overrides,
});

// Helper to mock localStorage with auth data
/**
 * Build a complete `useAuth()` mock.
 *
 * `useAuth` (client/hooks/use-auth.ts) is Firebase-backed and exposes a wide
 * surface. Suites used to hand-roll partial literals, so any page that
 * destructured a function the mock omitted crashed on render — e.g. Register
 * calls `clearError()` on mount and threw "clearError is not a function".
 * Always spread a full shape so adding a member to the hook cannot break
 * unrelated suites.
 */
export const createMockUseAuth = (overrides = {}) => ({
  // State
  user: null as ReturnType<typeof createMockUser> | null,
  isAuthenticated: false,
  isLoading: false,
  error: null as string | null,

  // Actions
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
  resendVerificationEmail: vi.fn(),
  clearError: vi.fn(),
  verifyEmail: vi.fn(),
  resetPassword: vi.fn(),
  validateResetToken: vi.fn(async () => true),
  updateProfile: vi.fn(),
  uploadProfileImage: vi.fn(async () => ''),

  // Utilities
  hasRole: vi.fn(() => false),
  isAdmin: false,
  isSuperAdmin: false,

  ...overrides,
});

// Helper to mock localStorage with auth data
export const mockAuthStorage = (authState = createMockAuthState()) => {
  const mockStorage = {
    user: authState.user,
    tokens: authState.tokens,
    isAuthenticated: authState.isAuthenticated,
  };
  
  vi.mocked(localStorage.getItem).mockImplementation((key) => {
    if (key === 'auth-storage') {
      return JSON.stringify(mockStorage);
    }
    return null;
  });
};

// Helper to clear auth storage mock
export const clearAuthStorage = () => {
  vi.mocked(localStorage.getItem).mockReturnValue(null);
};

// Helper to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Resolve the current global fetch as a Vitest mock.
 *
 * `setup.ts` assigns `global.fetch = vi.fn()`, but MSW's `server.listen()` replaces
 * that same global during `beforeAll` with its request interceptor. Test helpers
 * that later call `vi.mocked(fetch).mockResolvedValueOnce(...)` would therefore be
 * typing the interceptor, which has no mock methods. Re-install a spy at call
 * time so direct-fetch tests keep working alongside MSW.
 */
const fetchMock = () => {
  const current = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  if (typeof current?.mockResolvedValueOnce !== 'function') {
    vi.stubGlobal('fetch', vi.fn());
  }
  return vi.mocked(globalThis.fetch);
};

// Helper to mock successful fetch responses
export const mockFetchSuccess = (data: any, status = 200) => {
  fetchMock().mockResolvedValueOnce({
    ok: true,
    status,
    json: async () => data,
    headers: new Headers({ 'content-type': 'application/json' }),
  } as Response);
};

// Helper to mock failed fetch responses
export const mockFetchError = (error: any, status = 400) => {
  fetchMock().mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => error,
    headers: new Headers({ 'content-type': 'application/json' }),
  } as Response);
};

// Test wrapper component
export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthStoreProvider>{children}</AuthStoreProvider>;
};

// Export mock API responses for convenience
export { mockApiResponses };