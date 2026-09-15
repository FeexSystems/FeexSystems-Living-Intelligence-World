import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createMockUser,
  createMockTokens,
  mockAuthStorage,
  clearAuthStorage,
  mockFetchSuccess,
  mockFetchError,
  mockApiResponses
} from '../utils/test-utils';

describe('Auth Store Utilities', () => {
  beforeEach(() => {
    clearAuthStorage();
    vi.clearAllMocks();
  });

  describe('Mock Helpers', () => {
    it('should create mock user data', () => {
      const user = createMockUser();
      
      expect(user).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        emailVerified: true,
      });
    });

    it('should create mock user with overrides', () => {
      const user = createMockUser({ 
        email: 'custom@example.com',
        role: 'ADMIN' 
      });
      
      expect(user.email).toBe('custom@example.com');
      expect(user.role).toBe('ADMIN');
      expect(user.firstName).toBe('Test'); // Default value preserved
    });

    it('should create mock tokens', () => {
      const tokens = createMockTokens();
      
      expect(tokens).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      });
    });

    it('should create mock tokens with overrides', () => {
      const tokens = createMockTokens({ 
        accessToken: 'custom-token',
        expiresIn: 7200 
      });
      
      expect(tokens.accessToken).toBe('custom-token');
      expect(tokens.expiresIn).toBe(7200);
      expect(tokens.refreshToken).toBe('mock-refresh-token'); // Default preserved
    });
  });

  describe('LocalStorage Mocking', () => {
    it('should mock localStorage with auth data', () => {
      const authState = {
        user: createMockUser(),
        tokens: createMockTokens(),
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

      mockAuthStorage(authState);

      const stored = localStorage.getItem('auth-storage');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored);
      expect(parsed.user).toEqual(authState.user);
      expect(parsed.tokens).toEqual(authState.tokens);
      expect(parsed.isAuthenticated).toBe(true);
    });

    it('should clear auth storage', () => {
      mockAuthStorage();
      
      clearAuthStorage();
      
      const stored = localStorage.getItem('auth-storage');
      expect(stored).toBeNull();
    });
  });

  describe('API Mocking', () => {
    it('should mock successful fetch response', () => {
      const mockData = { success: true };
      mockFetchSuccess(mockData);

      expect(fetch).toHaveBeenCalledTimes(0); // Not called yet
      
      // The mock is set up, would be called when fetch is invoked
      expect(vi.mocked(fetch)).toBeDefined();
    });

    it('should mock failed fetch response', () => {
      const mockError = { error: { message: 'Test error' } };
      mockFetchError(mockError, 400);

      expect(vi.mocked(fetch)).toBeDefined();
    });

    it('should have predefined API responses', () => {
      expect(mockApiResponses.login.success).toBeDefined();
      expect(mockApiResponses.login.error).toBeDefined();
      expect(mockApiResponses.register.success).toBeDefined();
      expect(mockApiResponses.register.error).toBeDefined();
      expect(mockApiResponses.refreshToken.success).toBeDefined();
      expect(mockApiResponses.refreshToken.error).toBeDefined();
    });
  });

  describe('Fetch Mocking', () => {
    it('should mock successful login response', async () => {
      mockFetchSuccess(mockApiResponses.login.success);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toEqual(mockApiResponses.login.success);
    });

    it('should mock failed login response', async () => {
      mockFetchError(mockApiResponses.login.error, 401);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid@example.com', password: 'password' }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toEqual(mockApiResponses.login.error);
    });
  });
});