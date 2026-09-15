import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth.service';
import { AuthError, TokenBlacklistService } from '../../auth';
import { PrismaClient, User } from '@prisma/client';

// Mock dependencies
vi.mock('../../auth', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    TokenBlacklistService: {
      addToBlacklist: vi.fn().mockResolvedValue(undefined),
      isBlacklisted: vi.fn().mockResolvedValue(false),
      clear: vi.fn().mockResolvedValue(undefined),
      size: vi.fn().mockResolvedValue(0),
    },
  };
});

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  session: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  refreshToken: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  $queryRaw: vi.fn(),
} as unknown as PrismaClient;

describe('AuthService', () => {
  let authService: AuthService;

  const mockUser: Omit<User, 'passwordHash'> = {
    id: 'user-123',
    email: 'test@feexsystems.codes',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER',
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    profileImageUrl: null,
  };

  const mockUserWithPassword: User = {
    ...mockUser,
    passwordHash: '$2a$10$hashedpassword',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService(mockPrisma);
  });

  describe('register', () => {
    it('should throw AuthError if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPassword);

      await expect(
        authService.register({
          email: 'test@feexsystems.codes',
          password: 'SecureP@ss1',
          firstName: 'Test',
          lastName: 'User',
        })
      ).rejects.toThrow(AuthError);
    });

    it('should throw AuthError with EMAIL_ALREADY_EXISTS code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPassword);

      try {
        await authService.register({
          email: 'test@feexsystems.codes',
          password: 'SecureP@ss1',
          firstName: 'Test',
          lastName: 'User',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('EMAIL_ALREADY_EXISTS');
      }
    });
  });

  describe('login', () => {
    it('should throw AuthError for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@test.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw AuthError for invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPassword);

      await expect(
        authService.login({
          email: 'test@feexsystems.codes',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('logout', () => {
    it('should add access token to blacklist', async () => {
      await authService.logout('access-token-123', 'refresh-token-456');

      expect(TokenBlacklistService.addToBlacklist).toHaveBeenCalledWith('access-token-123');
    });

    it('should delete refresh token from database', async () => {
      mockPrisma.refreshToken.delete.mockResolvedValue({} as any);

      await authService.logout('access-token-123', 'refresh-token-456');

      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { token: 'refresh-token-456' },
      });
    });

    it('should not fail if refresh token deletion fails', async () => {
      mockPrisma.refreshToken.delete.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(
        authService.logout('access-token-123', 'refresh-token-456')
      ).resolves.toBeUndefined();
    });
  });

  describe('logoutAll', () => {
    it('should add current access token to blacklist', async () => {
      await authService.logoutAll('user-123', 'current-access-token');

      expect(TokenBlacklistService.addToBlacklist).toHaveBeenCalledWith('current-access-token');
    });

    it('should delete all refresh tokens for user', async () => {
      await authService.logoutAll('user-123', 'current-access-token');

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should delete all sessions for user', async () => {
      await authService.logoutAll('user-123', 'current-access-token');

      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });

  describe('validateToken', () => {
    it('should return invalid for blacklisted token', async () => {
      vi.mocked(TokenBlacklistService.isBlacklisted).mockResolvedValue(true);

      const result = await authService.validateToken('blacklisted-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid access token');
    });

    it('should return invalid for non-existent user', async () => {
      vi.mocked(TokenBlacklistService.isBlacklisted).mockResolvedValue(false);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.validateToken('valid-token-nonexistent-user');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid access token');
    });
  });

  describe('getProfile', () => {
    it('should throw AuthError for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile('nonexistent-id')).rejects.toThrow(AuthError);
    });

    it('should return user profile without passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const profile = await authService.getProfile('user-123');

      expect(profile).not.toHaveProperty('passwordHash');
      expect(profile.id).toBe(mockUser.id);
      expect(profile.email).toBe(mockUser.email);
    });
  });

  describe('requestPasswordReset', () => {
    it('should not throw for non-existent email (prevents enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Should not throw - silently returns
      await expect(
        authService.requestPasswordReset({ email: 'nonexistent@test.com' })
      ).resolves.toBeUndefined();
    });
  });
});