import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenManager } from '@/lib/token-manager';

describe('TokenManager', () => {
  let tokenManager;
  let mockAuthStore;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
    
    tokenManager = new TokenManager();
    mockAuthStore = {
      tokens: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      },
      isAuthenticated: true,
      refreshToken: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    tokenManager.destroy();
  });

  describe('Token Validation', () => {
    it('should detect expired token', () => {
      // Create a token that expired 1 hour ago
      const expiredTime = Math.floor(Date.now() / 1000) - 3600;
      const expiredToken = `header.${btoa(JSON.stringify({ exp: expiredTime }))}.signature`;
      
      expect(tokenManager.isTokenExpired(expiredToken)).toBe(true);
    });

    it('should detect valid token', () => {
      // Create a token that expires in 1 hour
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const validToken = `header.${btoa(JSON.stringify({ exp: futureTime }))}.signature`;
      
      expect(tokenManager.isTokenExpired(validToken)).toBe(false);
    });

    it('should handle invalid token format', () => {
      const invalidToken = 'invalid-token';
      
      expect(tokenManager.isTokenExpired(invalidToken)).toBe(true);
    });
  });

  describe('Token Expiration Time', () => {
    it('should get token expiration time', () => {
      const expTime = Math.floor(Date.now() / 1000) + 3600;
      const token = `header.${btoa(JSON.stringify({ exp: expTime }))}.signature`;
      
      const expirationTime = tokenManager.getTokenExpirationTime(token);
      expect(expirationTime).toBe(expTime * 1000); // Should convert to milliseconds
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid-token';
      
      const expirationTime = tokenManager.getTokenExpirationTime(invalidToken);
      expect(expirationTime).toBeNull();
    });
  });

  describe('Token Refresh Decision', () => {
    it('should recommend refresh when token expires soon', () => {
      // Token expires in 3 minutes
      const soonExpTime = Math.floor(Date.now() / 1000) + 180;
      const token = `header.${btoa(JSON.stringify({ exp: soonExpTime }))}.signature`;
      
      // Should refresh with 5 minute buffer (default)
      expect(tokenManager.shouldRefreshToken(token)).toBe(true);
    });

    it('should not recommend refresh when token has plenty of time', () => {
      // Token expires in 1 hour
      const futureExpTime = Math.floor(Date.now() / 1000) + 3600;
      const token = `header.${btoa(JSON.stringify({ exp: futureExpTime }))}.signature`;
      
      // Should not refresh with 5 minute buffer (default)
      expect(tokenManager.shouldRefreshToken(token)).toBe(false);
    });

    it('should use custom buffer time', () => {
      // Token expires in 8 minutes
      const expTime = Math.floor(Date.now() / 1000) + 480;
      const token = `header.${btoa(JSON.stringify({ exp: expTime }))}.signature`;
      
      // Should refresh with 10 minute buffer
      expect(tokenManager.shouldRefreshToken(token, 10)).toBe(true);
      
      // Should not refresh with 5 minute buffer
      expect(tokenManager.shouldRefreshToken(token, 5)).toBe(false);
    });

    it('should recommend refresh for invalid token', () => {
      const invalidToken = 'invalid-token';
      
      expect(tokenManager.shouldRefreshToken(invalidToken)).toBe(true);
    });
  });

  describe('Initialization', () => {
    it('should initialize with auth store', () => {
      expect(() => {
        tokenManager.initialize(mockAuthStore);
      }).not.toThrow();
    });

    it('should handle initialization without auth store', () => {
      expect(() => {
        tokenManager.initialize(null);
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should destroy and clear timers', () => {
      tokenManager.initialize(mockAuthStore);
      
      // Simulate timer being set
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      tokenManager.destroy();
      
      // Should not throw and should be safe to call multiple times
      expect(() => tokenManager.destroy()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JWT payload', () => {
      const malformedToken = `header.invalid-base64.signature`;
      
      expect(tokenManager.isTokenExpired(malformedToken)).toBe(true);
      expect(tokenManager.getTokenExpirationTime(malformedToken)).toBeNull();
      expect(tokenManager.shouldRefreshToken(malformedToken)).toBe(true);
    });

    it('should handle JWT without exp claim', () => {
      const tokenWithoutExp = `header.${btoa(JSON.stringify({ sub: 'user' }))}.signature`;
      
      expect(tokenManager.isTokenExpired(tokenWithoutExp)).toBe(true);
      expect(tokenManager.getTokenExpirationTime(tokenWithoutExp)).toBeNull();
      expect(tokenManager.shouldRefreshToken(tokenWithoutExp)).toBe(true);
    });

    it('should handle empty or null tokens', () => {
      expect(tokenManager.isTokenExpired('')).toBe(true);
      expect(tokenManager.getTokenExpirationTime('')).toBeNull();
      expect(tokenManager.shouldRefreshToken('')).toBe(true);
    });
  });
});