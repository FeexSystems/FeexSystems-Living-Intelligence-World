import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { JWTService, AuthError, PasswordUtils, TokenBlacklistService } from './auth';



// Setup environment variables for tests
beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-16-chars-for-testing';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-at-least-16-chars-for-testing';
  process.env.JWT_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
});

describe('JWTService — JWT Token Generation & Verification', () => {
  describe('generateAccessToken', () => {
    it('should generate valid JWT token', () => {
      // Arrange
      const testUser = {
        id: 'user-123',
        email: 'test@feex.local',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const token = JWTService.generateAccessToken(testUser);

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Token should be decodable
      const decoded = jwt.decode(token) ;
      expect(decoded).toBeDefined();
      
      // Verify token contains user ID and email
      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('test@feex.local');
      expect(decoded.role).toBe('user');
      
      // Verify token structure matches JWT format
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.iss).toBe('feexsystems');
      expect(decoded.aud).toBe('feexsystems-users');
      
      // Verify token is not expired
      expect(decoded.exp * 1000).toBeGreaterThan(Date.now());
    });

    it('should include all required user fields in token payload', () => {
      // Arrange
      const testUser = {
        id: 'user-456',
        email: 'alice@feex.local',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const token = JWTService.generateAccessToken(testUser);
      const decoded = jwt.decode(token) ;

      // Assert
      expect(decoded.userId).toBe('user-456');
      expect(decoded.email).toBe('alice@feex.local');
      expect(decoded.role).toBe('admin');
    });

    it('should create unique tokens for different users', () => {
      // Arrange
      const user1 = {
        id: 'user-1',
        email: 'user1@feex.local',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user2 = {
        id: 'user-2',
        email: 'user2@feex.local',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const token1 = JWTService.generateAccessToken(user1);
      const token2 = JWTService.generateAccessToken(user2);

      // Assert
      expect(token1).not.toBe(token2);
      expect(jwt.decode(token1)).not.toEqual(jwt.decode(token2));
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid token', () => {
      // Arrange
      const testUser = {
        id: 'user-verify-1',
        email: 'verify@feex.local',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = JWTService.generateAccessToken(testUser);

      // Act
      const decoded = JWTService.verifyAccessToken(token);

      // Assert
      expect(decoded.userId).toBe('user-verify-1');
      expect(decoded.email).toBe('verify@feex.local');
      expect(decoded.role).toBe('user');
    });

    it('should reject expired token', () => {
      // Arrange
      const expiredPayload = {
        userId: 'user-expired',
        email: 'expired@feex.local',
        role: 'user',
        iat: Math.floor(Date.now() / 1000) - 3600, // Issued 1 hour ago
        exp: Math.floor(Date.now() / 1000) - 1800, // Expired 30 minutes ago
      };

      // Create a token with expired timestamp manually
      const expiredToken = jwt.sign(
        expiredPayload,
        process.env.JWT_SECRET || 'test-secret',
        { noTimestamp: true } // Don't override the iat/exp we provided
      );

      // Act & Assert
      expect(() => JWTService.verifyAccessToken(expiredToken)).toThrow(AuthError);
    });

    it('should reject invalid signature', () => {
      // Arrange
      const payload = {
        userId: 'user-invalid',
        email: 'invalid@feex.local',
        role: 'user',
      };

      // Create token with different secret to simulate tampering
      const tamperingToken = jwt.sign(payload, 'wrong-secret', {
        expiresIn: '15m',
        issuer: 'feexsystems',
        audience: 'feexsystems-users',
      });

      // Act & Assert
      expect(() => JWTService.verifyAccessToken(tamperingToken)).toThrow(AuthError);
      expect(() => JWTService.verifyAccessToken(tamperingToken)).toThrow('Invalid access token');
    });

    it('should reject malformed token', () => {
      // Act & Assert
      expect(() => JWTService.verifyAccessToken('not.a.valid.token')).toThrow(AuthError);
      expect(() => JWTService.verifyAccessToken('malformed')).toThrow(AuthError);
      expect(() => JWTService.verifyAccessToken('')).toThrow(AuthError);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Authorization header', () => {
      // Arrange
      const token = 'valid-jwt-token-string';
      const header = `Bearer ${token}`;

      // Act
      const extracted = JWTService.extractTokenFromHeader(header);

      // Assert
      expect(extracted).toBe(token);
    });

    it('should handle missing Authorization header', () => {
      // Act
      const result1 = JWTService.extractTokenFromHeader(undefined);
      const result2 = JWTService.extractTokenFromHeader('');

      // Assert
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should reject invalid Bearer format', () => {
      // Arrange
      const invalidHeaders = [
        'Bearer', // Missing token
        'Bearer token1 token2', // Too many parts
        'Basic token', // Wrong scheme
        'token-without-scheme',
        'bearer token', // Wrong case (should be Bearer)
      ];

      // Act & Assert
      invalidHeaders.forEach(header => {
        const result = JWTService.extractTokenFromHeader(header);
        expect(result).toBeNull();
      });
    });
  });

  describe('Token Expiration', () => {
    it('should have correct expiration time', () => {
      // Arrange
      const testUser = {
        id: 'user-exp',
        email: 'exp@feex.local',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const token = JWTService.generateAccessToken(testUser);
      const exp = JWTService.getTokenExpirationTime(token);

      // Assert
      expect(exp).toBeDefined();
      expect(typeof exp).toBe('number');
      
      // Should be future timestamp
      const now = Math.floor(Date.now() / 1000);
      expect(exp).toBeGreaterThan(now);
      
      // Should be approximately 15 minutes from now (900 seconds)
      expect(exp).toBeLessThanOrEqual(now + 920); // Allow 20 second buffer for test execution
      expect(exp).toBeGreaterThanOrEqual(now + 880); // At least 14m 40s from now
    });

    it('should identify expired tokens', () => {
      // Arrange
      const expiredPayload = {
        userId: 'user-test',
        email: 'test@feex.local',
        role: 'user',
      };

      const expiredToken = jwt.sign(
        expiredPayload,
        process.env.JWT_SECRET || 'test-secret',
        {
          expiresIn: '-1h',
          issuer: 'feexsystems',
          audience: 'feexsystems-users',
        }
      );

      // Act
      const isExpired = JWTService.isTokenExpired(expiredToken);

      // Assert
      expect(isExpired).toBe(true);
    });

    it('should identify valid (non-expired) tokens', () => {
      // Arrange
      const testUser = {
        id: 'user-valid',
        email: 'valid@feex.local',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const token = JWTService.generateAccessToken(testUser);
      const isExpired = JWTService.isTokenExpired(token);

      // Assert
      expect(isExpired).toBe(false);
    });

    it('should handle invalid token in expiration check', () => {
      // Act
      const result = JWTService.getTokenExpirationTime('invalid-token');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Refresh Token Generation', () => {
    it('should generate valid refresh token', () => {
      // Arrange
      const userId = 'user-refresh-1';
      const tokenId = 'token-id-123';

      // Act
      const token = JWTService.generateRefreshToken(userId, tokenId);
      const decoded = jwt.decode(token) ;

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(decoded.userId).toBe(userId);
      expect(decoded.tokenId).toBe(tokenId);
      expect(decoded.aud).toBe('feexsystems-refresh');
    });

    it('should verify valid refresh token', () => {
      // Arrange
      const userId = 'user-refresh-2';
      const tokenId = 'token-id-456';

      const token = JWTService.generateRefreshToken(userId, tokenId);

      // Act
      const decoded = JWTService.verifyRefreshToken(token);

      // Assert
      expect(decoded.userId).toBe(userId);
      expect(decoded.tokenId).toBe(tokenId);
    });
  });

  describe('Email Verification Token', () => {
    it('should generate email verification token', () => {
      // Arrange
      const userId = 'user-verify-email';
      const email = 'verify@feex.local';

      // Act
      const token = JWTService.generateEmailVerificationToken(userId, email);
      const decoded = jwt.decode(token) ;

      // Assert
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.type).toBe('email_verification');
      expect(decoded.aud).toBe('feexsystems-email-verification');
    });

    it('should verify valid email verification token', () => {
      // Arrange
      const userId = 'user-verify-2';
      const email = 'verify2@feex.local';

      const token = JWTService.generateEmailVerificationToken(userId, email);

      // Act
      const decoded = JWTService.verifyEmailVerificationToken(token);

      // Assert
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.type).toBe('email_verification');
    });

    it('should reject email verification token with wrong type', () => {
      // Arrange
      const wrongPayload = {
        userId: 'user-wrong',
        email: 'wrong@feex.local',
        type: 'password_reset', // Wrong type
      };

      const token = jwt.sign(
        wrongPayload,
        process.env.JWT_SECRET || 'test-secret',
        {
          expiresIn: '24h',
          issuer: 'feexsystems',
          audience: 'feexsystems-email-verification',
        }
      );

      // Act & Assert
      expect(() => JWTService.verifyEmailVerificationToken(token)).toThrow(AuthError);
    });
  });

  describe('Password Reset Token', () => {
    it('should generate password reset token', () => {
      // Arrange
      const userId = 'user-reset';
      const email = 'reset@feex.local';

      // Act
      const token = JWTService.generatePasswordResetToken(userId, email);
      const decoded = jwt.decode(token) ;

      // Assert
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.type).toBe('password_reset');
      expect(decoded.aud).toBe('feexsystems-password-reset');
    });

    it('should verify valid password reset token', () => {
      // Arrange
      const userId = 'user-reset-2';
      const email = 'reset2@feex.local';

      const token = JWTService.generatePasswordResetToken(userId, email);

      // Act
      const decoded = JWTService.verifyPasswordResetToken(token);

      // Assert
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.type).toBe('password_reset');
    });
  });

  describe('Token Pair Generation', () => {
    it('should generate token pair with both access and refresh tokens', () => {
      // Arrange
      const testUser = {
        id: 'user-pair',
        email: 'pair@feex.local',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const refreshTokenId = 'refresh-id-123';

      // Act
      const pair = JWTService.generateTokenPair(testUser, refreshTokenId);

      // Assert
      expect(pair).toBeDefined();
      expect(pair.accessToken).toBeDefined();
      expect(pair.refreshToken).toBeDefined();
      expect(pair.tokenType).toBe('Bearer');
      expect(pair.expiresIn).toBeGreaterThan(0);

      // Verify both tokens are valid
      const accessDecoded = JWTService.verifyAccessToken(pair.accessToken);
      const refreshDecoded = JWTService.verifyRefreshToken(pair.refreshToken);

      expect(accessDecoded.userId).toBe('user-pair');
      expect(refreshDecoded.userId).toBe('user-pair');
    });
  });

  describe('Secure Token Generation', () => {
    it('should generate cryptographically secure random tokens', () => {
      // Act
      const token1 = JWTService.generateSecureToken(32);
      const token2 = JWTService.generateSecureToken(32);

      // Assert
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      
      // Should be hex strings of expected length
      expect(token1).toMatch(/^[a-f0-9]{64}$/); // 32 bytes = 64 hex chars
      expect(token2).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate tokens of specified length', () => {
      // Act
      const token16 = JWTService.generateSecureToken(16);
      const token64 = JWTService.generateSecureToken(64);

      // Assert
      expect(token16).toMatch(/^[a-f0-9]{32}$/); // 16 bytes = 32 hex chars
      expect(token64).toMatch(/^[a-f0-9]{128}$/); // 64 bytes = 128 hex chars
    });
  });
});

describe('PasswordUtils', () => {
  describe('checkPasswordStrength', () => {
    it('should accept strong passwords', () => {
      // Arrange
      const strongPassword = 'MySecure!Password123';

      // Act
      const result = PasswordUtils.checkPasswordStrength(strongPassword);

      // Assert
      expect(result.isStrong).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(5);
      expect(result.feedback.length).toBe(0);
    });

    it('should reject weak passwords', () => {
      // Arrange
      const weakPassword = 'weak';

      // Act
      const result = PasswordUtils.checkPasswordStrength(weakPassword);

      // Assert
      expect(result.isStrong).toBe(false);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should provide specific feedback for password issues', () => {
      // Arrange
      const passwordNoNumbers = 'MyPassword!';

      // Act
      const result = PasswordUtils.checkPasswordStrength(passwordNoNumbers);

      // Assert
      expect(result.feedback).toContain('Add numbers');
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate passwords with required character types', () => {
      // Act
      const password = PasswordUtils.generateSecurePassword();

      // Assert
      expect(password.length).toBeGreaterThanOrEqual(16);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
      expect(/[@$!%*?&]/.test(password)).toBe(true);
    });

    it('should generate passwords of specified length', () => {
      // Act
      const password20 = PasswordUtils.generateSecurePassword(20);
      const password32 = PasswordUtils.generateSecurePassword(32);

      // Assert
      expect(password20.length).toBe(20);
      expect(password32.length).toBe(32);
    });
  });
});


describe('TokenBlacklistService', () => {
  describe('addToBlacklist', () => {
    it('should add token to blacklist', async () => {
      // Arrange
      const token = 'test-token-to-blacklist-123';

      // Act
      await TokenBlacklistService.addToBlacklist(token);

      // Assert
      const isBlacklisted = await TokenBlacklistService.isBlacklisted(token);
      expect(isBlacklisted).toBe(true);
    });

    it('should add multiple tokens to blacklist', async () => {
      // Arrange
      const token1 = 'token-1-for-blacklist';
      const token2 = 'token-2-for-blacklist';

      // Act
      await TokenBlacklistService.addToBlacklist(token1);
      await TokenBlacklistService.addToBlacklist(token2);

      // Assert
      const isToken1Blacklisted = await TokenBlacklistService.isBlacklisted(token1);
      const isToken2Blacklisted = await TokenBlacklistService.isBlacklisted(token2);
      
      expect(isToken1Blacklisted).toBe(true);
      expect(isToken2Blacklisted).toBe(true);
    });

    it('should handle duplicate blacklist adds idempotently', async () => {
      // Arrange
      const token = 'duplicate-blacklist-token';

      // Act
      await TokenBlacklistService.addToBlacklist(token);
      const sizeAfterFirst = await TokenBlacklistService.size();
      
      await TokenBlacklistService.addToBlacklist(token);
      const sizeAfterSecond = await TokenBlacklistService.size();

      // Assert
      expect(sizeAfterFirst).toBe(sizeAfterSecond);
      const isBlacklisted = await TokenBlacklistService.isBlacklisted(token);
      expect(isBlacklisted).toBe(true);
    });
  });

  describe('isBlacklisted', () => {
    it('should verify token in blacklist', async () => {
      // Arrange
      const token = 'verify-blacklist-token';
      await TokenBlacklistService.addToBlacklist(token);

      // Act
      const result = await TokenBlacklistService.isBlacklisted(token);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      // Arrange
      const token = 'non-blacklisted-token';

      // Act
      const result = await TokenBlacklistService.isBlacklisted(token);

      // Assert
      expect(result).toBe(false);
    });

    it('should not blacklist non-existent token', async () => {
      // Arrange
      const token = 'does-not-exist-token';

      // Act
      const result = await TokenBlacklistService.isBlacklisted(token);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle empty token gracefully', async () => {
      // Act
      const result = await TokenBlacklistService.isBlacklisted('');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('size', () => {
    it('should track size of blacklist', async () => {
      // Arrange
      // Clear any previous state
      await TokenBlacklistService.clear();
      
      const token1 = 'size-test-token-1';
      const token2 = 'size-test-token-2';

      // Act
      const sizeBeforeAdd = await TokenBlacklistService.size();
      await TokenBlacklistService.addToBlacklist(token1);
      const sizeAfterFirstAdd = await TokenBlacklistService.size();
      
      await TokenBlacklistService.addToBlacklist(token2);
      const sizeAfterSecondAdd = await TokenBlacklistService.size();

      // Assert
      expect(sizeBeforeAdd).toBe(0);
      expect(sizeAfterFirstAdd).toBe(1);
      expect(sizeAfterSecondAdd).toBe(2);
    });

    it('should return 0 for empty blacklist', async () => {
      // Arrange
      await TokenBlacklistService.clear();

      // Act
      const size = await TokenBlacklistService.size();

      // Assert
      expect(size).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all tokens from blacklist', async () => {
      // Arrange
      const token1 = 'clear-test-token-1';
      const token2 = 'clear-test-token-2';
      
      await TokenBlacklistService.addToBlacklist(token1);
      await TokenBlacklistService.addToBlacklist(token2);

      // Act
      await TokenBlacklistService.clear();

      // Assert
      const size = await TokenBlacklistService.size();
      expect(size).toBe(0);
      
      const token1Blacklisted = await TokenBlacklistService.isBlacklisted(token1);
      const token2Blacklisted = await TokenBlacklistService.isBlacklisted(token2);
      
      expect(token1Blacklisted).toBe(false);
      expect(token2Blacklisted).toBe(false);
    });

    it('should handle clearing empty blacklist', async () => {
      // Arrange
      await TokenBlacklistService.clear();

      // Act
      await TokenBlacklistService.clear();

      // Assert
      const size = await TokenBlacklistService.size();
      expect(size).toBe(0);
    });
  });

  describe('Token Blacklist Round-Trip', () => {
    it('should add and verify token in complete workflow', async () => {
      // Arrange
      const testUser = {
        id: 'user-blacklist-test',
        email: 'blacklist@feex.local',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const token = JWTService.generateAccessToken(testUser);
      
      // Initially not blacklisted
      let isBlacklisted = await TokenBlacklistService.isBlacklisted(token);
      expect(isBlacklisted).toBe(false);

      // Add to blacklist
      await TokenBlacklistService.addToBlacklist(token);
      
      // Now it should be blacklisted
      isBlacklisted = await TokenBlacklistService.isBlacklisted(token);
      expect(isBlacklisted).toBe(true);

      // Verify token is still valid (not expired)
      const decoded = JWTService.verifyAccessToken(token);
      expect(decoded.userId).toBe('user-blacklist-test');
    });
  });
});
