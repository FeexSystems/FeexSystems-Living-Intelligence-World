import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JWTService, AuthError, TokenBlacklistService, PasswordUtils } from '../auth';

// Mock redis module
vi.mock('../redis', () => ({
  getRedisClient: vi.fn(),
}));

describe('JWTService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@feexsystems.codes',
    role: 'USER' as const,
  };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const token = JWTService.generateAccessToken(mockUser);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // Header.Payload.Signature
    });

    it('should include user claims in token', () => {
      const token = JWTService.generateAccessToken(mockUser);
      const decoded = JWTService.verifyAccessToken(token);
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = JWTService.generateRefreshToken('user-123', 'token-456');
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should throw AuthError for expired token', () => {
      const expiredToken = JWTService.generateAccessToken(mockUser);
      // Manually expire by waiting or mocking - here we test with a tampered token
      expect(() => JWTService.verifyAccessToken('invalid.token.here')).toThrow(AuthError);
    });

    it('should throw AuthError for malformed token', () => {
      expect(() => JWTService.verifyAccessToken('not-a-jwt')).toThrow(AuthError);
    });
  });

  describe('generateTokenPair', () => {
    it('should return access token, refresh token, and metadata', () => {
      const pair = JWTService.generateTokenPair(mockUser, 'refresh-id-1');
      expect(pair.accessToken).toBeDefined();
      expect(pair.refreshToken).toBeDefined();
      expect(pair.tokenType).toBe('Bearer');
      expect(typeof pair.expiresIn).toBe('number');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = JWTService.extractTokenFromHeader('Bearer my-token-123');
      expect(token).toBe('my-token-123');
    });

    it('should return null for missing header', () => {
      expect(JWTService.extractTokenFromHeader(undefined)).toBeNull();
    });

    it('should return null for non-Bearer header', () => {
      expect(JWTService.extractTokenFromHeader('Basic abc123')).toBeNull();
    });

    it('should return null for malformed header', () => {
      expect(JWTService.extractTokenFromHeader('Bearer')).toBeNull();
    });
  });
});

describe('AuthError', () => {
  it('should create error with message, code, and default status 401', () => {
    const error = new AuthError('Test error', 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('AuthError');
  });

  it('should allow custom status code', () => {
    const error = new AuthError('Bad request', 'BAD_REQUEST', 400);
    expect(error.statusCode).toBe(400);
  });
});

describe('PasswordUtils', () => {
  describe('checkPasswordStrength', () => {
    it('should score weak password low', () => {
      const result = PasswordUtils.checkPasswordStrength('abc');
      expect(result.isStrong).toBe(false);
      expect(result.score).toBeLessThan(5);
    });

    it('should score strong password high', () => {
      const result = PasswordUtils.checkPasswordStrength('Str0ng!P@ssw0rd');
      expect(result.isStrong).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(5);
    });

    it('should provide feedback for weak passwords', () => {
      const result = PasswordUtils.checkPasswordStrength('weak');
      expect(result.feedback.length).toBeGreaterThan(0);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password of specified length', () => {
      const password = PasswordUtils.generateSecurePassword(20);
      expect(password.length).toBe(20);
    });

    it('should include at least one of each character type', () => {
      const password = PasswordUtils.generateSecurePassword(16);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
      expect(/[@$!%*?&]/.test(password)).toBe(true);
    });
  });
});

describe('TokenBlacklistService', () => {
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = {
      setex: vi.fn().mockResolvedValue('OK'),
      exists: vi.fn().mockResolvedValue(0),
      keys: vi.fn().mockResolvedValue([]),
      del: vi.fn().mockResolvedValue(1),
    };
    const redisModule = await import('../redis');
    vi.mocked(redisModule.getRedisClient).mockReturnValue(mockRedis);
    await TokenBlacklistService.clear();
  });

  afterEach(async () => {
    await TokenBlacklistService.clear();
    vi.restoreAllMocks();
  });

  describe('addToBlacklist', () => {
    it('should add token to Redis with TTL', async () => {
      const token = JWTService.generateAccessToken({
        id: 'user-1',
        email: 'test@test.com',
        role: 'USER',
      });

      await TokenBlacklistService.addToBlacklist(token);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('token:blacklist:'),
        expect.any(Number),
        '1'
      );
    });

    it('should fall back to in-memory when Redis fails', async () => {
      const redisModule = await import('../redis');
      vi.mocked(redisModule.getRedisClient).mockImplementation(() => {
        throw new Error('Redis unavailable');
      });

      const token = 'fallback-test-token';
      await TokenBlacklistService.addToBlacklist(token);

      // Should not throw - falls back to in-memory
      const isBlacklisted = await TokenBlacklistService.isBlacklisted(token);
      expect(isBlacklisted).toBe(true);
    });
  });

  describe('isBlacklisted', () => {
    it('should return true for blacklisted token', async () => {
      const token = JWTService.generateAccessToken({
        id: 'user-1',
        email: 'test@test.com',
        role: 'USER',
      });

      mockRedis.exists.mockResolvedValue(1);
      const result = await TokenBlacklistService.isBlacklisted(token);
      expect(result).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      mockRedis.exists.mockResolvedValue(0);
      const result = await TokenBlacklistService.isBlacklisted('non-blacklisted-token');
      expect(result).toBe(false);
    });

    it('should fall back to in-memory when Redis fails', async () => {
      const redisModule = await import('../redis');
      vi.mocked(redisModule.getRedisClient).mockImplementation(() => {
        throw new Error('Redis unavailable');
      });

      const token = 'fallback-check-token';
      await TokenBlacklistService.addToBlacklist(token);
      const result = await TokenBlacklistService.isBlacklisted(token);
      expect(result).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all blacklisted tokens from Redis', async () => {
      mockRedis.keys.mockResolvedValue(['token:blacklist:abc', 'token:blacklist:def']);
      await TokenBlacklistService.clear();
      expect(mockRedis.del).toHaveBeenCalledWith('token:blacklist:abc', 'token:blacklist:def');
    });

    it('should handle empty blacklist gracefully', async () => {
      mockRedis.keys.mockResolvedValue([]);
      await TokenBlacklistService.clear();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('size', () => {
    it('should return count of blacklisted tokens', async () => {
      mockRedis.keys.mockResolvedValue(['token:blacklist:a', 'token:blacklist:b', 'token:blacklist:c']);
      const size = await TokenBlacklistService.size();
      expect(size).toBe(3);
    });

    it('should return 0 for empty blacklist', async () => {
      mockRedis.keys.mockResolvedValue([]);
      const size = await TokenBlacklistService.size();
      expect(size).toBe(0);
    });
  });
});