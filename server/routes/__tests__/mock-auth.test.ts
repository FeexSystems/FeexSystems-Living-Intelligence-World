/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mockAuthRouter, { mockUsers, JWT_SECRET } from '../mock-auth';
import { authMiddleware } from '../../lib/middleware/auth.middleware';

describe('Canonical Test Credentials & Mock Auth System', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', mockAuthRouter);

  // Protected test route using the real authMiddleware
  app.get('/api/protected-super-admin', authMiddleware, (req, res) => {
    res.json({
      success: true,
      user: req.user,
    });
  });

  it('should authenticate canonical admin with FeexAdmin2026! and return SUPER_ADMIN + ENTERPRISE', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@feexsystems.com',
        password: 'FeexAdmin2026!',
      });

    console.log('LOGIN TEST RESPONSE:', response.status, response.body);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('admin@feexsystems.com');
    expect(response.body.data.user.role).toBe('SUPER_ADMIN');
    expect(response.body.data.user.subscription.tier).toBe('ENTERPRISE');
    expect(response.body.data.tokens.accessToken).toBeDefined();
  });

  it('should reject login with incorrect password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@feexsystems.com',
        password: 'WrongPassword!',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should allow canonical admin JWT to access protected endpoints via authMiddleware', async () => {
    // 1. Log in
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@feexsystems.com',
        password: 'FeexAdmin2026!',
      });

    const token = loginRes.body.data.tokens.accessToken;
    expect(token).toBeDefined();

    // 2. Access protected route
    const protectedRes = await request(app)
      .get('/api/protected-super-admin')
      .set('Authorization', `Bearer ${token}`);

    expect(protectedRes.status).toBe(200);
    expect(protectedRes.body.success).toBe(true);
    expect(protectedRes.body.user.email).toBe('admin@feexsystems.com');
    expect(protectedRes.body.user.role).toBe('SUPER_ADMIN');
  });

  it('should return user profile on GET /api/auth/me with Bearer token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@feexsystems.com',
        password: 'FeexAdmin2026!',
      });

    const token = loginRes.body.data.tokens.accessToken;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe('admin@feexsystems.com');
    expect(meRes.body.data.user.role).toBe('SUPER_ADMIN');
  });
});
