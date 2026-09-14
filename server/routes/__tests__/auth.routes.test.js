import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock auth middleware
vi.mock('../../lib/middleware/auth.middleware', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = { id: 'user-123', email: 'test@test.com', role: 'USER', emailVerified: true };
    next();
  },
  rateLimit: () => (_req, _res, next) => next(),
  rateLimitConfigs: {
    auth: {},
    general: {},
    passwordReset: {},
  },
  validateRequest: () => (_req, _res, next) => next(),
}));

// Mock auth service
vi.mock('../../lib/services/auth.service', () => ({
  AuthService: vi.fn().mockImplementation(() => ({
    register: vi.fn().mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com' },
      tokens: { accessToken: 'access-123', refreshToken: 'refresh-456', expiresIn: 900, tokenType: 'Bearer' },
    }),
    login: vi.fn().mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com' },
      tokens: { accessToken: 'access-123', refreshToken: 'refresh-456', expiresIn: 900, tokenType: 'Bearer' },
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    logoutAll: vi.fn().mockResolvedValue(undefined),
    refreshToken: vi.fn().mockResolvedValue({
      accessToken: 'new-access-123',
      refreshToken: 'new-refresh-456',
      expiresIn: 900,
      tokenType: 'Bearer',
    }),
    verifyEmail: vi.fn().mockResolvedValue(undefined),
    sendEmailVerification: vi.fn().mockResolvedValue(undefined),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    changePassword: vi.fn().mockResolvedValue(undefined),
    getProfile: vi.fn().mockResolvedValue({ id: 'user-123', email: 'test@test.com' }),
    getUserSessions: vi.fn().mockResolvedValue({ sessions: [], pagination: {} }),
    getAuthStats: vi.fn().mockResolvedValue({ sessions: 1, lastLogin: null }),
  })),
}));

// Mock database
vi.mock('../../lib/database', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  },
}));

import authRouter from '../auth';

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
  });

  describe('POST /api/auth/register', () => {
    it('should return 201 with user and tokens on successful registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'SecureP@ss1',
          firstName: 'New',
          lastName: 'User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 200 with user and tokens on successful login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 on successful logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should return new tokens on successful refresh', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'old-refresh-token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should always return success to prevent email enumeration', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account with that email exists');
    });
  });

  describe('GET /api/auth/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/auth/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.database).toBe(true);
    });
  });
});