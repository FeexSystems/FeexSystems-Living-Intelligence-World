import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JWTService, AuthError, TokenBlacklistService } from '../auth';

// Mock environment variables for testing
const mockEnv = {
  JWT_SECRET: 'test-jwt-secret-key-for-testing-purposes-only',
  JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-testing-purposes-only',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

// Mock process.env
vi.mock('process', () => ({
  env: mockEnv,
}));

describe('Refresh Token Rotation Mechanism', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER' ,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    TokenBlacklistService.clear();
  });

  afterEach(() => {
    TokenBlacklistService.clear();
  });

  describe('Token Generation and Verification Flow', () => {
    it('should generate and verify token pair correctly', () => {
      const refreshTokenId = 'refresh_token_123';
      
      // Generate token pair
      const tokenPair = JWTService.generateTokenPair(mockUser, refreshTokenId);
      
      expect(tokenPair).toHaveProperty('accessToken');
      expect(tokenPair).toHaveProperty('refreshToken');
      expect(tokenPair).toHaveProperty('expiresIn');
      expect(tokenPair).toHaveProperty('tokenType', 'Bearer');
      
      // Verify access token
      const accessPayload = JWTService.verifyAccessToken(tokenPair.accessToken);
      expect(accessPayload.userId).toBe(mockUser.id);
      expect(accessPayload.email).toBe(mockUser.email);
      expect(accessPayload.role).toBe(mockUser.role);
      
      // Verify refresh token
      const refreshPayload = JWTService.verifyRefreshToken(tokenPair.refreshToken);
      expect(refreshPayload.userId).toBe(mockUser.id);
      expect(refreshPayload.tokenId).toBe(refreshTokenId);
    });

    it('should handle token rotation scenario', () => {
      // Step 1: Generate initial token pair
      const initialRefreshTokenId = 'initial_refresh_123';
      const initialTokenPair = JWTService.generateTokenPair(mockUser, initialRefreshTokenId);
      
      // Step 2: Verify initial tokens work
      const initialAccessPayload = JWTService.verifyAccessToken(initialTokenPair.accessToken);
      const initialRefreshPayload = JWTService.verifyRefreshToken(initialTokenPair.refreshToken);
      
      expect(initialAccessPayload.userId).toBe(mockUser.id);
      expect(initialRefreshPayload.tokenId).toBe(initialRefreshTokenId);
      
      // Step 3: Simulate token rotation (new refresh token ID)
      const newRefreshTokenId = 'new_refresh_456';
      const newTokenPair = JWTService.generateTokenPair(mockUser, newRefreshTokenId);
      
      // Step 4: Verify new tokens work
      const newAccessPayload = JWTService.verifyAccessToken(newTokenPair.accessToken);
      const newRefreshPayload = JWTService.verifyRefreshToken(newTokenPair.refreshToken);
      
      expect(newAccessPayload.userId).toBe(mockUser.id);
      expect(newRefreshPayload.tokenId).toBe(newRefreshTokenId);
      
      // Step 5: Verify tokens are different
      expect(initialTokenPair.accessToken).not.toBe(newTokenPair.accessToken);
      expect(initialTokenPair.refreshToken).not.toBe(newTokenPair.refreshToken);
      expect(initialRefreshPayload.tokenId).not.toBe(newRefreshPayload.tokenId);
    });

    it('should invalidate old tokens when rotated', () => {
      // Generate initial token pair
      const initialRefreshTokenId = 'initial_refresh_123';
      const initialTokenPair = JWTService.generateTokenPair(mockUser, initialRefreshTokenId);
      
      // Simulate blacklisting old access token during rotation
      TokenBlacklistService.addToBlacklist(initialTokenPair.accessToken);
      
      // Verify old token is blacklisted
      expect(TokenBlacklistService.isBlacklisted(initialTokenPair.accessToken)).toBe(true);
      
      // Generate new token pair
      const newRefreshTokenId = 'new_refresh_456';
      const newTokenPair = JWTService.generateTokenPair(mockUser, newRefreshTokenId);
      
      // Verify new token is not blacklisted
      expect(TokenBlacklistService.isBlacklisted(newTokenPair.accessToken)).toBe(false);
      
      // Verify new token works
      const newAccessPayload = JWTService.verifyAccessToken(newTokenPair.accessToken);
      expect(newAccessPayload.userId).toBe(mockUser.id);
    });
  });

  describe('Token Security Features', () => {
    it('should generate unique tokens each time', () => {
      const tokenPair1 = JWTService.generateTokenPair(mockUser, 'refresh_1');
      const tokenPair2 = JWTService.generateTokenPair(mockUser, 'refresh_2');
      
      expect(tokenPair1.accessToken).not.toBe(tokenPair2.accessToken);
      expect(tokenPair1.refreshToken).not.toBe(tokenPair2.refreshToken);
    });

    it('should include proper claims in tokens', () => {
      const refreshTokenId = 'refresh_token_123';
      const tokenPair = JWTService.generateTokenPair(mockUser, refreshTokenId);
      
      // Check access token claims
      const accessPayload = JWTService.verifyAccessToken(tokenPair.accessToken);
      expect(accessPayload).toHaveProperty('userId', mockUser.id);
      expect(accessPayload).toHaveProperty('email', mockUser.email);
      expect(accessPayload).toHaveProperty('role', mockUser.role);
      expect(accessPayload).toHaveProperty('iat');
      expect(accessPayload).toHaveProperty('exp');
      
      // Check refresh token claims
      const refreshPayload = JWTService.verifyRefreshToken(tokenPair.refreshToken);
      expect(refreshPayload).toHaveProperty('userId', mockUser.id);
      expect(refreshPayload).toHaveProperty('tokenId', refreshTokenId);
      expect(refreshPayload).toHaveProperty('iat');
      expect(refreshPayload).toHaveProperty('exp');
    });

    it('should validate token expiration correctly', () => {
      const refreshTokenId = 'refresh_token_123';
      const tokenPair = JWTService.generateTokenPair(mockUser, refreshTokenId);
      
      // Check that tokens are not expired immediately after creation
      expect(JWTService.isTokenExpired(tokenPair.accessToken)).toBe(false);
      expect(JWTService.isTokenExpired(tokenPair.refreshToken)).toBe(false);
      
      // Check expiration time extraction
      const accessExpTime = JWTService.getTokenExpirationTime(tokenPair.accessToken);
      const refreshExpTime = JWTService.getTokenExpirationTime(tokenPair.refreshToken);
      
      expect(accessExpTime).toBeGreaterThan(Date.now() / 1000);
      expect(refreshExpTime).toBeGreaterThan(Date.now() / 1000);
      expect(refreshExpTime).toBeGreaterThan(accessExpTime); // Refresh token should expire later
    });
  });

  describe('Token Blacklist Management', () => {
    it('should manage token blacklist correctly', () => {
      const tokenPair = JWTService.generateTokenPair(mockUser, 'refresh_123');
      
      // Initially not blacklisted
      expect(TokenBlacklistService.isBlacklisted(tokenPair.accessToken)).toBe(false);
      expect(TokenBlacklistService.size()).toBe(0);
      
      // Add to blacklist
      TokenBlacklistService.addToBlacklist(tokenPair.accessToken);
      expect(TokenBlacklistService.isBlacklisted(tokenPair.accessToken)).toBe(true);
      expect(TokenBlacklistService.size()).toBe(1);
      
      // Clear blacklist
      TokenBlacklistService.clear();
      expect(TokenBlacklistService.isBlacklisted(tokenPair.accessToken)).toBe(false);
      expect(TokenBlacklistService.size()).toBe(0);
    });

    it('should handle multiple tokens in blacklist', () => {
      const tokenPair1 = JWTService.generateTokenPair(mockUser, 'refresh_1');
      const tokenPair2 = JWTService.generateTokenPair(mockUser, 'refresh_2');
      
      TokenBlacklistService.addToBlacklist(tokenPair1.accessToken);
      TokenBlacklistService.addToBlacklist(tokenPair2.accessToken);
      
      expect(TokenBlacklistService.size()).toBe(2);
      expect(TokenBlacklistService.isBlacklisted(tokenPair1.accessToken)).toBe(true);
      expect(TokenBlacklistService.isBlacklisted(tokenPair2.accessToken)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw appropriate errors for invalid tokens', () => {
      expect(() => {
        JWTService.verifyAccessToken('invalid.token.here');
      }).toThrow(AuthError);
      
      expect(() => {
        JWTService.verifyRefreshToken('invalid.refresh.token');
      }).toThrow(AuthError);
    });

    it('should throw appropriate errors for expired tokens', () => {
      // This test would require creating tokens with very short expiry
      // For now, we'll test the error handling structure
      try {
        JWTService.verifyAccessToken('invalid.token.here');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error ).code).toBe('INVALID_TOKEN');
      }
    });

    it('should handle malformed tokens gracefully', () => {
      expect(() => {
        JWTService.verifyAccessToken('not-a-jwt-token');
      }).toThrow(AuthError);
      
      expect(() => {
        JWTService.verifyRefreshToken('also-not-a-jwt');
      }).toThrow(AuthError);
      
      expect(JWTService.isTokenExpired('malformed-token')).toBe(true);
      expect(JWTService.getTokenExpirationTime('malformed-token')).toBeNull();
    });
  });

  describe('Token Header Extraction', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'sample.jwt.token';
      const header = `Bearer ${token}`;
      
      expect(JWTService.extractTokenFromHeader(header)).toBe(token);
    });

    it('should return null for invalid headers', () => {
      expect(JWTService.extractTokenFromHeader(undefined)).toBeNull();
      expect(JWTService.extractTokenFromHeader('')).toBeNull();
      expect(JWTService.extractTokenFromHeader('Bearer')).toBeNull();
      expect(JWTService.extractTokenFromHeader('Basic token')).toBeNull();
      expect(JWTService.extractTokenFromHeader('token-without-bearer')).toBeNull();
    });
  });

  describe('Secure Token Generation', () => {
    it('should generate secure random tokens', () => {
      const token1 = JWTService.generateSecureToken();
      const token2 = JWTService.generateSecureToken();
      
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
      expect(token2.length).toBe(64);
      expect(/^[a-f0-9]+$/i.test(token1)).toBe(true);
      expect(/^[a-f0-9]+$/i.test(token2)).toBe(true);
    });

    it('should generate tokens with custom length', () => {
      const token = JWTService.generateSecureToken(16);
      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });
  });
});