import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserRole } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { JWTService, AuthError, TokenBlacklistService } from '../auth';
import { UserService } from '../services/user.service';
import { SessionService } from '../services/session.service';

// Mock dependencies
vi.mock('../auth');
vi.mock('../services/user.service');
vi.mock('../services/session.service');

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  session: {
    deleteMany: vi.fn(),
  },
} ;

// Mock user data
const mockUser = {
  id: 'user_123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.USER,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
};

const mockUserWithPassword = {
  ...mockUser,
  passwordHash: 'hashed_password',
};

const mockRefreshToken = {
  id: 'refresh_123',
  userId: mockUser.id,
  token: 'refresh_token_string',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  createdAt: new Date(),
};

const mockTokens = {
  accessToken: 'access_token_string',
  refreshToken: 'refresh_token_string',
  expiresIn: 900,
  tokenType: 'Bearer',
};

describe('AuthService', () => {
  let authService;
  let mockUserService;
  let mockSessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    TokenBlacklistService.clear();

    // Setup mock services
    mockUserService = {
      findUserByEmail: vi.fn(),
      createUser: vi.fn(),
      verifyPassword: vi.fn(),
      updateLastLogin: vi.fn(),
      findUserById: vi.fn(),
      findUserByIdWithPassword: vi.fn(),
      updateUserPassword: vi.fn(),
      verifyEmail: vi.fn(),
      updateUserProfile: vi.fn(),
      getUserStats: vi.fn(),
    };

    mockSessionService = {
      createRefreshToken: vi.fn(),
      findValidRefreshTokenByToken: vi.fn(),
      rotateRefreshToken: vi.fn(),
      deleteRefreshToken: vi.fn(),
      deleteAllUserRefreshTokens: vi.fn(),
      deleteAllUserSessions: vi.fn(),
      getUserSessions: vi.fn(),
      getUserRefreshTokens: vi.fn(),
      getUserSessionStats: vi.fn(),
      cleanupExpiredTokens: vi.fn(),
    };

    vi.mocked(UserService).mockImplementation(() => mockUserService);
    vi.mocked(SessionService).mockImplementation(() => mockSessionService);

    authService = new AuthService(mockPrisma);
  });

  afterEach(() => {
    TokenBlacklistService.clear();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserService.findUserByEmail.mockResolvedValue(null);
      mockUserService.createUser.mockResolvedValue(mockUser);
      mockSessionService.createRefreshToken.mockResolvedValue(mockRefreshToken);
      vi.mocked(JWTService.generateTokenPair).mockReturnValue(mockTokens);

      const result = await authService.register(userData);

      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokens);
      expect(mockUserService.findUserByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockUserService.createUser).toHaveBeenCalledWith(userData);
      expect(mockSessionService.createRefreshToken).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserService.findUserByEmail.mockResolvedValue(mockUserWithPassword);

      await expect(authService.register(userData)).rejects.toThrow(AuthError);
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'StrongPass123!',
      };

      mockUserService.findUserByEmail.mockResolvedValue(mockUserWithPassword);
      mockUserService.verifyPassword.mockResolvedValue(true);
      mockUserService.updateLastLogin.mockResolvedValue(undefined);
      mockUserService.findUserById.mockResolvedValue(mockUser);
      mockSessionService.createRefreshToken.mockResolvedValue(mockRefreshToken);
      vi.mocked(JWTService.generateTokenPair).mockReturnValue(mockTokens);

      const result = await authService.login(credentials);

      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokens);
      expect(mockUserService.verifyPassword).toHaveBeenCalledWith(mockUserWithPassword, credentials.password);
      expect(mockUserService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw error for invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockUserService.findUserByEmail.mockResolvedValue(mockUserWithPassword);
      mockUserService.verifyPassword.mockResolvedValue(false);

      await expect(authService.login(credentials)).rejects.toThrow(AuthError);
      expect(mockUserService.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent user', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password',
      };

      mockUserService.findUserByEmail.mockResolvedValue(null);

      await expect(authService.login(credentials)).rejects.toThrow(AuthError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const input = { refreshToken: 'valid_refresh_token' };
      const mockPayload = {
        userId: mockUser.id,
        tokenId: mockRefreshToken.id,
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      vi.mocked(JWTService.verifyRefreshToken).mockReturnValue(mockPayload);
      mockSessionService.findValidRefreshTokenByToken.mockResolvedValue(mockRefreshToken);
      mockUserService.findUserById.mockResolvedValue(mockUser);
      mockSessionService.rotateRefreshToken.mockResolvedValue({
        ...mockRefreshToken,
        id: 'new_refresh_123',
      });
      vi.mocked(JWTService.generateTokenPair).mockReturnValue(mockTokens);

      const result = await authService.refreshToken(input);

      expect(result).toEqual(mockTokens);
      expect(mockSessionService.rotateRefreshToken).toHaveBeenCalledWith(
        input.refreshToken,
        mockUser.id,
        expect.any(Date)
      );
    });

    it('should throw error for invalid refresh token', async () => {
      const input = { refreshToken: 'invalid_refresh_token' };

      vi.mocked(JWTService.verifyRefreshToken).mockImplementation(() => {
        throw new AuthError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
      });

      await expect(authService.refreshToken(input)).rejects.toThrow(AuthError);
    });

    it('should throw error when refresh token not found in database', async () => {
      const input = { refreshToken: 'valid_refresh_token' };
      const mockPayload = {
        userId: mockUser.id,
        tokenId: 'different_token_id',
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      vi.mocked(JWTService.verifyRefreshToken).mockReturnValue(mockPayload);
      mockSessionService.findValidRefreshTokenByToken.mockResolvedValue(null);

      await expect(authService.refreshToken(input)).rejects.toThrow(AuthError);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const accessToken = 'access_token';
      const refreshToken = 'refresh_token';

      vi.mocked(TokenBlacklistService.addToBlacklist).mockImplementation(() => {});
      mockSessionService.deleteRefreshToken.mockResolvedValue(undefined);

      await authService.logout(accessToken, refreshToken);

      expect(TokenBlacklistService.addToBlacklist).toHaveBeenCalledWith(accessToken);
      expect(mockSessionService.deleteRefreshToken).toHaveBeenCalledWith(refreshToken);
    });

    it('should logout user even if refresh token deletion fails', async () => {
      const accessToken = 'access_token';
      const refreshToken = 'refresh_token';

      vi.mocked(TokenBlacklistService.addToBlacklist).mockImplementation(() => {});
      mockSessionService.deleteRefreshToken.mockRejectedValue(new Error('Database error'));

      // Should not throw error
      await expect(authService.logout(accessToken, refreshToken)).resolves.toBeUndefined();
      expect(TokenBlacklistService.addToBlacklist).toHaveBeenCalledWith(accessToken);
    });
  });

  describe('logoutAll', () => {
    it('should logout from all devices successfully', async () => {
      const userId = mockUser.id;
      const currentAccessToken = 'current_access_token';

      vi.mocked(TokenBlacklistService.addToBlacklist).mockImplementation(() => {});
      mockSessionService.deleteAllUserRefreshTokens.mockResolvedValue(undefined);
      mockSessionService.deleteAllUserSessions.mockResolvedValue(undefined);

      await authService.logoutAll(userId, currentAccessToken);

      expect(TokenBlacklistService.addToBlacklist).toHaveBeenCalledWith(currentAccessToken);
      expect(mockSessionService.deleteAllUserRefreshTokens).toHaveBeenCalledWith(userId);
      expect(mockSessionService.deleteAllUserSessions).toHaveBeenCalledWith(userId);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const input = { token: 'email_verification_token' };
      const mockPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        type: 'email_verification' ,
        iat: Date.now(),
        exp: Date.now() + 24 * 60 * 60 * 1000,
      };

      vi.mocked(JWTService.verifyEmailVerificationToken).mockReturnValue(mockPayload);
      mockUserService.findUserById.mockResolvedValue(mockUser);
      mockUserService.verifyEmail.mockResolvedValue(undefined);

      await authService.verifyEmail(input);

      expect(mockUserService.verifyEmail).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw error for invalid verification token', async () => {
      const input = { token: 'invalid_token' };

      vi.mocked(JWTService.verifyEmailVerificationToken).mockImplementation(() => {
        throw new AuthError('Invalid token', 'INVALID_TOKEN');
      });

      await expect(authService.verifyEmail(input)).rejects.toThrow(AuthError);
    });

    it('should throw error when user not found', async () => {
      const input = { token: 'email_verification_token' };
      const mockPayload = {
        userId: 'non_existent_user',
        email: 'test@example.com',
        type: 'email_verification' ,
        iat: Date.now(),
        exp: Date.now() + 24 * 60 * 60 * 1000,
      };

      vi.mocked(JWTService.verifyEmailVerificationToken).mockReturnValue(mockPayload);
      mockUserService.findUserById.mockResolvedValue(null);

      await expect(authService.verifyEmail(input)).rejects.toThrow(AuthError);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = mockUser.id;
      const input = {
        currentPassword: 'oldPassword123!',
        newPassword: 'newPassword123!',
      };

      mockUserService.findUserByIdWithPassword.mockResolvedValue(mockUserWithPassword);
      mockUserService.verifyPassword.mockResolvedValue(true);
      mockUserService.updateUserPassword.mockResolvedValue(undefined);
      mockSessionService.deleteAllUserRefreshTokens.mockResolvedValue(undefined);

      await authService.changePassword(userId, input);

      expect(mockUserService.verifyPassword).toHaveBeenCalledWith(mockUserWithPassword, input.currentPassword);
      expect(mockUserService.updateUserPassword).toHaveBeenCalledWith(userId, input.newPassword);
      expect(mockSessionService.deleteAllUserRefreshTokens).toHaveBeenCalledWith(userId);
    });

    it('should throw error for incorrect current password', async () => {
      const userId = mockUser.id;
      const input = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123!',
      };

      mockUserService.findUserByIdWithPassword.mockResolvedValue(mockUserWithPassword);
      mockUserService.verifyPassword.mockResolvedValue(false);

      await expect(authService.changePassword(userId, input)).rejects.toThrow(AuthError);
      expect(mockUserService.updateUserPassword).not.toHaveBeenCalled();
    });
  });

  describe('validateToken', () => {
    it('should validate token successfully', async () => {
      const token = 'valid_token';
      const mockPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        iat: Date.now(),
        exp: Date.now() + 900000,
      };

      vi.mocked(JWTService.verifyAccessToken).mockReturnValue(mockPayload);
      vi.mocked(TokenBlacklistService.isBlacklisted).mockReturnValue(false);
      mockUserService.findUserById.mockResolvedValue(mockUser);

      const result = await authService.validateToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toEqual(mockPayload);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for blacklisted token', async () => {
      const token = 'blacklisted_token';
      const mockPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        iat: Date.now(),
        exp: Date.now() + 900000,
      };

      vi.mocked(JWTService.verifyAccessToken).mockReturnValue(mockPayload);
      vi.mocked(TokenBlacklistService.isBlacklisted).mockReturnValue(true);

      const result = await authService.validateToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token has been revoked');
    });

    it('should return invalid for non-existent user', async () => {
      const token = 'valid_token';
      const mockPayload = {
        userId: 'non_existent_user',
        email: 'test@example.com',
        role: UserRole.USER,
        iat: Date.now(),
        exp: Date.now() + 900000,
      };

      vi.mocked(JWTService.verifyAccessToken).mockReturnValue(mockPayload);
      vi.mocked(TokenBlacklistService.isBlacklisted).mockReturnValue(false);
      mockUserService.findUserById.mockResolvedValue(null);

      const result = await authService.validateToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return invalid for invalid token', async () => {
      const token = 'invalid_token';

      vi.mocked(JWTService.verifyAccessToken).mockImplementation(() => {
        throw new AuthError('Invalid token', 'INVALID_TOKEN');
      });

      const result = await authService.validateToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens successfully', async () => {
      const mockCleanupResult = {
        sessionsDeleted: 5,
        refreshTokensDeleted: 3,
      };

      mockSessionService.cleanupExpiredTokens.mockResolvedValue(mockCleanupResult);

      const result = await authService.cleanupExpiredTokens();

      expect(result).toEqual(mockCleanupResult);
      expect(mockSessionService.cleanupExpiredTokens).toHaveBeenCalled();
    });
  });
});