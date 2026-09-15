import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { 
  authenticate, 
  authorize, 
  requireEmailVerification,
  optionalAuthenticate,
  validateRequest,
  rateLimit
} from '../auth.middleware';
import { JWTService, TokenBlacklistService } from '../../auth';
import { UserService } from '../../services/user.service';
import { RateLimitService } from '../../redis';

// Mock dependencies
vi.mock('../../auth');
vi.mock('../../services/user.service');
vi.mock('../../redis');
vi.mock('../../database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

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

// Mock request and response
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  headers: {},
  user: undefined,
  ...overrides,
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return res;
};

const createMockNext = (): NextFunction => vi.fn();

describe.skip('Authentication Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TokenBlacklistService.clear();
  });

  afterEach(() => {
    TokenBlacklistService.clear();
  });

  describe('authenticate', () => {
    it('should authenticate valid token and attach user to request', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Mock JWT service
      vi.mocked(JWTService.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(TokenBlacklistService.isBlacklisted).mockReturnValue(false);
      vi.mocked(JWTService.verifyAccessToken).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        iat: Date.now(),
        exp: Date.now() + 900000,
      });

      // Mock user service
      const mockUserService = {
        findUserById: vi.fn().mockResolvedValue(mockUser),
      };
      vi.mocked(UserService).mockImplementation(() => mockUserService as any);

      await authenticate(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no token provided', async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      vi.mocked(JWTService.extractTokenFromHeader).mockReturnValue(null);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: 'AUTHENTICATION_ERROR',
          code: 'MISSING_TOKEN',
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is blacklisted', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer blacklisted-token' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      vi.mocked(JWTService.extractTokenFromHeader).mockReturnValue('blacklisted-token');
      vi.mocked(TokenBlacklistService.isBlacklisted).mockReturnValue(true);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: 'AUTHENTICATION_ERROR',
          code: 'TOKEN_REVOKED',
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user not found', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      vi.mocked(JWTService.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(TokenBlacklistService.isBlacklisted).mockReturnValue(false);
      vi.mocked(JWTService.verifyAccessToken).mockReturnValue({
        userId: 'non-existent-user',
        email: 'test@example.com',
        role: UserRole.USER,
        iat: Date.now(),
        exp: Date.now() + 900000,
      });

      const mockUserService = {
        findUserById: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(UserService).mockImplementation(() => mockUserService as any);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: 'AUTHENTICATION_ERROR',
          code: 'USER_NOT_FOUND',
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthenticate', () => {
    it('should attach user when valid token provided', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      vi.mocked(JWTService.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(TokenBlacklistService.isBlacklisted).mockReturnValue(false);
      vi.mocked(JWTService.verifyAccessToken).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        iat: Date.now(),
        exp: Date.now() + 900000,
      });

      const mockUserService = {
        findUserById: vi.fn().mockResolvedValue(mockUser),
      };
      vi.mocked(UserService).mockImplementation(() => mockUserService as any);

      await optionalAuthenticate(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user when no token provided', async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      vi.mocked(JWTService.extractTokenFromHeader).mockReturnValue(null);

      await optionalAuthenticate(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user when token is invalid', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid-token' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      vi.mocked(JWTService.extractTokenFromHeader).mockReturnValue('invalid-token');
      vi.mocked(TokenBlacklistService.isBlacklisted).mockReturnValue(false);
      vi.mocked(JWTService.verifyAccessToken).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuthenticate(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should allow access for authorized role', () => {
      const req = createMockRequest({ user: mockUser }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = authorize(UserRole.USER, UserRole.ADMIN);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      const req = createMockRequest({ user: mockUser }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = authorize(UserRole.ADMIN);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: 'AUTHORIZATION_ERROR',
          code: 'INSUFFICIENT_PERMISSIONS',
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should require authentication when no user', () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = authorize(UserRole.USER);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: 'AUTHENTICATION_ERROR',
          code: 'AUTHENTICATION_REQUIRED',
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireEmailVerification', () => {
    it('should allow access for verified user', () => {
      const req = createMockRequest({ user: mockUser }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      requireEmailVerification(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for unverified user', () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      const req = createMockRequest({ user: unverifiedUser }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      requireEmailVerification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: 'AUTHORIZATION_ERROR',
          code: 'EMAIL_VERIFICATION_REQUIRED',
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should require authentication when no user', () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      requireEmailVerification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: 'AUTHENTICATION_ERROR',
          code: 'AUTHENTICATION_REQUIRED',
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateRequest', () => {
    const mockSchema = {
      parse: vi.fn(),
    };

    it('should validate and transform request body', () => {
      const req = createMockRequest({ body: { name: 'test' } }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const validatedData = { name: 'test', validated: true };
      mockSchema.parse.mockReturnValue(validatedData);

      const middleware = validateRequest(mockSchema);
      middleware(req, res, next);

      expect(mockSchema.parse).toHaveBeenCalledWith({ name: 'test' });
      expect(req.body).toEqual(validatedData);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 for validation errors', () => {
      const req = createMockRequest({ body: { invalid: 'data' } }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const validationError = {
        errors: [{ message: 'Invalid field' }],
      };
      mockSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      const middleware = validateRequest(mockSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: 'VALIDATION_ERROR',
          code: 'VALIDATION_FAILED',
          details: validationError.errors,
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('rateLimit', () => {
    it('should allow request within rate limit', async () => {
      const req = createMockRequest({ user: mockUser, ip: '127.0.0.1' }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const mockRateLimitService = {
        checkRateLimit: vi.fn().mockResolvedValue({
          allowed: true,
          remaining: 9,
          resetTime: Date.now() + 900000,
        }),
      };
      vi.mocked(RateLimitService).mockImplementation(() => mockRateLimitService as any);

      const middleware = rateLimit({
        windowMs: 15 * 60 * 1000,
        maxRequests: 10,
      });

      await middleware(req, res, next);

      expect(res.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '9',
        'X-RateLimit-Reset': expect.any(String),
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block request when rate limit exceeded', async () => {
      const req = createMockRequest({ user: mockUser, ip: '127.0.0.1' }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const mockRateLimitService = {
        checkRateLimit: vi.fn().mockResolvedValue({
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 900000,
        }),
      };
      vi.mocked(RateLimitService).mockImplementation(() => mockRateLimitService as any);

      const middleware = rateLimit({
        windowMs: 15 * 60 * 1000,
        maxRequests: 10,
        message: 'Rate limit exceeded',
      });

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: 'RATE_LIMIT_ERROR',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should use custom key generator', async () => {
      const req = createMockRequest({ user: mockUser, ip: '127.0.0.1' }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const mockRateLimitService = {
        checkRateLimit: vi.fn().mockResolvedValue({
          allowed: true,
          remaining: 9,
          resetTime: Date.now() + 900000,
        }),
      };
      vi.mocked(RateLimitService).mockImplementation(() => mockRateLimitService as any);

      const customKeyGenerator = vi.fn().mockReturnValue('custom-key');
      const middleware = rateLimit({
        windowMs: 15 * 60 * 1000,
        maxRequests: 10,
        keyGenerator: customKeyGenerator,
      });

      await middleware(req, res, next);

      expect(customKeyGenerator).toHaveBeenCalledWith(req);
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'custom-key',
        15 * 60 * 1000,
        10
      );
    });

    it('should continue on rate limit service error', async () => {
      const req = createMockRequest({ user: mockUser, ip: '127.0.0.1' }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const mockRateLimitService = {
        checkRateLimit: vi.fn().mockRejectedValue(new Error('Redis error')),
      };
      vi.mocked(RateLimitService).mockImplementation(() => mockRateLimitService as any);

      const middleware = rateLimit({
        windowMs: 15 * 60 * 1000,
        maxRequests: 10,
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});