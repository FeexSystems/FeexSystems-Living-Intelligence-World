/**
 * Test Utilities
 * 
 * Custom render function and testing utilities
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Create a new query client for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

/**
 * Custom render function that includes providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { route?: string }
) {
  const { route = '/', ...renderOptions } = options;
  
  const queryClient = createTestQueryClient();
  
  window.history.pushState({}, '', route);
  
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    ),
    ...renderOptions,
  });
}

/**
 * Provider wrapper for tests that need to compose their own router.
 * Supplies the React Query provider without imposing a BrowserRouter, so a test
 * can wrap its subject in a custom router (e.g. ProtectedRoute tests).
 */
export function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/**
 * Re-export everything from testing library
 */
export * from '@testing-library/react';
export { renderWithProviders as render };

/**
 * Convenience barrel: mock factories & API fixtures.
 *
 * Several auth specs import these from `test-utils`; re-exporting here keeps a
 * single import surface without duplicating the source of truth.
 */
export { createMockUser, createMockTokens } from './mock-factories';
export { mockApiResponses, mockFetchSuccess, mockFetchError } from '../mocks/api';

/**
 * Create a mock `useAuth()` return value.
 *
 * The real hook (`@/hooks/use-auth`) exposes state, actions and role helpers.
 * Page tests that `vi.mock('@/hooks/use-auth')` need a stand-in covering the
 * same surface, otherwise rendering throws on a missing property. Overrides
 * are shallow-merged over a fully-populated default, so a test only specifies
 * the members it cares about.
 */
export function createMockUseAuth(overrides: Record<string, unknown> = {}): Record<string, any> {
  const hasRole = (role: string) => role === 'USER';
  return {
    // State
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

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
    validateResetToken: vi.fn().mockResolvedValue(true),
    updateProfile: vi.fn(),
    uploadProfileImage: vi.fn().mockResolvedValue(''),

    // Utilities
    hasRole: vi.fn(hasRole),
    isAdmin: false,
    isSuperAdmin: false,

    ...overrides,
  };
}

/** Shape of the persisted zustand auth slice used by the app (key: `auth-storage`). */
export interface MockAuthState {
  user?: unknown;
  tokens?: unknown;
  isAuthenticated?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Seed `localStorage['auth-storage']` with a mock auth state.
 *
 * The persisted payload is written at the top level (`user`, `tokens`, ...) to
 * match how the auth specs read it back. Called with no arguments it seeds a
 * default authenticated state.
 */
export function mockAuthStorage(state?: MockAuthState): void {
  const payload = state ?? {
    user: { id: 'user-1', email: 'test@example.com', role: 'USER' },
    tokens: { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' },
    isAuthenticated: true,
    isLoading: false,
    error: null,
  };
  localStorage.setItem('auth-storage', JSON.stringify(payload));
}

/** Remove the persisted auth slice from localStorage. */
export function clearAuthStorage(): void {
  localStorage.removeItem('auth-storage');
}

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const start = Date.now();
  
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Condition not met within timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Mock a successful API response
 */
export function mockApiResponse<T>(data: T, delay = 0) {
  return new Promise<Response>((resolve) => {
    setTimeout(() => {
      resolve(new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    }, delay);
  });
}

/**
 * Mock an error API response
 */
export function mockApiError(message: string, status = 500, delay = 0) {
  return new Promise<Response>((resolve) => {
    setTimeout(() => {
      resolve(new Response(JSON.stringify({ success: false, error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }));
    }, delay);
  });
}
