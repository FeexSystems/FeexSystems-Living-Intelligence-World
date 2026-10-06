import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tokenManager } from '@/lib/token-manager';


// Mock timers
vi.useFakeTimers();

describe('TokenManager', () => {
  let mockRefreshCallback;
  let mockExpiredCallback;
  let mockTokens;

  beforeEach(() => {
    mockRefreshCallback = vi.fn();
    mockExpiredCallback = vi.fn();
    
    // Mock tokens that expire in 1 hour (epoch seconds)
    mockTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      tokenType: 'Bearer',
    };

    tokenManager.initialize(mockRefreshCallback, mockExpiredCallback);
  });

  afterEach(() => {
    tokenManager.stopAutoRefresh();
    vi.clearAllMocks();
  });

  describe('isTokenExpired', () => {
    it('should return false for valid tokens', () => {
      const result = tokenManager.isTokenExpired(mockTokens);
      expect(result).toBe(false);
    });

    it('should return true for expired tokens', () => {
      const expiredTokens = {
        ...mockTokens,
        expiresIn: Math.floor(Date.now() / 1000) - 1, // 1 second ago
      };
      
      const result = tokenManager.isTokenExpired(expiredTokens);
      expect(result).toBe(true);
    });

    it('should return true for tokens expiring within buffer time', () => {
      const soonToExpireTokens = {
        ...mockTokens,
        expiresIn: Math.floor(Date.now() / 1000) + 120, // 2 minutes from now
      };
      
      const result = tokenManager.isTokenExpired(soonToExpireTokens, 5); // 5 minute buffer
      expect(result).toBe(true);
    });

    it('should return true for tokens without expiration time', () => {
      const tokensWithoutExpiry = {
        ...mockTokens,
        expiresIn: 0,
      };
      
      const result = tokenManager.isTokenExpired(tokensWithoutExpiry);
      expect(result).toBe(true);
    });
  });

  describe('getValidAccessToken', () => {
    it('should return access token for valid tokens', async () => {
      const result = await tokenManager.getValidAccessToken(mockTokens);
      expect(result).toBe(mockTokens.accessToken);
    });

    it('should refresh and return new token for expired tokens', async () => {
      const expiredTokens = {
        ...mockTokens,
        expiresIn: Math.floor(Date.now() / 1000) - 1,
      };

      const newTokens = {
        ...mockTokens,
        accessToken: 'new-access-token',
        expiresIn: Math.floor(Date.now() / 1000) + 3600,
      };

      mockRefreshCallback.mockResolvedValue(newTokens);

      const result = await tokenManager.getValidAccessToken(expiredTokens);
      expect(result).toBe(newTokens.accessToken);
      expect(mockRefreshCallback).toHaveBeenCalledOnce();
    });

    it('should return null if refresh fails', async () => {
      const expiredTokens = {
        ...mockTokens,
        expiresIn: Math.floor(Date.now() / 1000) - 1,
      };

      mockRefreshCallback.mockRejectedValue(new Error('Refresh failed'));

      const result = await tokenManager.getValidAccessToken(expiredTokens);
      expect(result).toBeNull();
      expect(mockExpiredCallback).toHaveBeenCalledOnce();
    });

    it('should return null for null tokens', async () => {
      const result = await tokenManager.getValidAccessToken(null);
      expect(result).toBeNull();
    });
  });

  describe('startAutoRefresh', () => {
    it('should schedule token refresh before expiration', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      tokenManager.startAutoRefresh(mockTokens);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token refresh scheduled in')
      );
      
      consoleSpy.mockRestore();
    });

    it('should refresh token when timer expires', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const newTokens = {
        ...mockTokens,
        accessToken: 'refreshed-token',
        expiresIn: nowSeconds + 3600,
      };

      mockRefreshCallback.mockResolvedValue(newTokens);

      // Tokens that expire in 4 minutes (less than 5 minute buffer)
      const soonToExpireTokens = {
        ...mockTokens,
        expiresIn: nowSeconds + 240,
      };

      tokenManager.startAutoRefresh(soonToExpireTokens);

      // Fast-forward time to trigger refresh
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockRefreshCallback).toHaveBeenCalledOnce();
    });
  });

  describe('refreshTokens', () => {
    it('should call refresh callback and return new tokens', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const newTokens = {
        ...mockTokens,
        accessToken: 'new-token',
        expiresIn: nowSeconds + 3600,
      };

      mockRefreshCallback.mockResolvedValue(newTokens);

      const result = await tokenManager.refreshTokens();
      expect(result).toEqual(newTokens);
      expect(mockRefreshCallback).toHaveBeenCalledOnce();
    });

    it('should call expired callback on refresh failure', async () => {
      mockRefreshCallback.mockRejectedValue(new Error('Refresh failed'));

      await expect(tokenManager.refreshTokens()).rejects.toThrow('Refresh failed');
      expect(mockExpiredCallback).toHaveBeenCalledOnce();
    });

    it('should deduplicate concurrent refresh requests', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const newTokens = {
        ...mockTokens,
        accessToken: 'new-token',
        expiresIn: nowSeconds + 3600,
      };

      mockRefreshCallback.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(newTokens), 100))
      );

      // Start multiple refresh requests
      const promise1 = tokenManager.refreshTokens();
      const promise2 = tokenManager.refreshTokens();
      const promise3 = tokenManager.refreshTokens();

      // Fast-forward time to resolve promises
      await vi.advanceTimersByTimeAsync(150);

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      expect(result1).toEqual(newTokens);
      expect(result2).toEqual(newTokens);
      expect(result3).toEqual(newTokens);
      expect(mockRefreshCallback).toHaveBeenCalledOnce(); // Should only be called once
    });
  });

  describe('makeAuthenticatedRequest', () => {
    it('should make request with valid token', async () => {
      const mockRequestFn = vi.fn().mockResolvedValue('success');
      
      const result = await tokenManager.makeAuthenticatedRequest(
        mockRequestFn,
        mockTokens
      );

      expect(result).toBe('success');
      expect(mockRequestFn).toHaveBeenCalledWith(mockTokens.accessToken);
    });

    it('should refresh token and retry on 401 error', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const mockRequestFn = vi.fn()
        .mockRejectedValueOnce({ status: 401 })
        .mockResolvedValueOnce('success');

      const newTokens = {
        ...mockTokens,
        accessToken: 'new-token',
        expiresIn: nowSeconds + 3600,
      };

      mockRefreshCallback.mockResolvedValue(newTokens);

      const result = await tokenManager.makeAuthenticatedRequest(
        mockRequestFn,
        mockTokens
      );

      expect(result).toBe('success');
      expect(mockRequestFn).toHaveBeenCalledTimes(2);
      expect(mockRequestFn).toHaveBeenNthCalledWith(1, mockTokens.accessToken);
      expect(mockRequestFn).toHaveBeenNthCalledWith(2, newTokens.accessToken);
      expect(mockRefreshCallback).toHaveBeenCalledOnce();
    });

    it('should throw error if max retries exceeded', async () => {
      const mockRequestFn = vi.fn().mockRejectedValue({ status: 401 });
      mockRefreshCallback.mockResolvedValue(mockTokens);

      await expect(
        tokenManager.makeAuthenticatedRequest(mockRequestFn, mockTokens, 1)
      ).rejects.toThrow('Max retry attempts exceeded');

      expect(mockRequestFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should throw non-401 errors immediately', async () => {
      const mockRequestFn = vi.fn().mockRejectedValue({ status: 500 });

      await expect(
        tokenManager.makeAuthenticatedRequest(mockRequestFn, mockTokens)
      ).rejects.toEqual({ status: 500 });

      expect(mockRequestFn).toHaveBeenCalledOnce();
      expect(mockRefreshCallback).not.toHaveBeenCalled();
    });
  });

  describe('getTimeUntilExpiration', () => {
    it('should return correct time in minutes', () => {
      const result = tokenManager.getTimeUntilExpiration(mockTokens);
      expect(result).toBeCloseTo(60, 0); // Should be close to 60 minutes
    });

    it('should return null for tokens without expiration', () => {
      const tokensWithoutExpiry = {
        ...mockTokens,
        expiresIn: 0,
      };

      const result = tokenManager.getTimeUntilExpiration(tokensWithoutExpiry);
      expect(result).toBeNull();
    });

    it('should return 0 for expired tokens', () => {
      const expiredTokens = {
        ...mockTokens,
        expiresIn: Math.floor(Date.now() / 1000) - 1,
      };

      const result = tokenManager.getTimeUntilExpiration(expiredTokens);
      expect(result).toBe(0);
    });
  });

  describe('stopAutoRefresh', () => {
    it('should clear refresh timer and reset state', () => {
      tokenManager.startAutoRefresh(mockTokens);
      expect(tokenManager.isCurrentlyRefreshing).toBe(false);

      tokenManager.stopAutoRefresh();
      
      // Fast-forward time to ensure timer doesn't fire
      vi.runAllTimers();
      expect(mockRefreshCallback).not.toHaveBeenCalled();
    });
  });
});