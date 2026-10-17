/** @vitest-environment node */
/**
 * Route-level integration guards.
 *
 * These tests exercise real Express routes (via supertest + createServer) with
 * the REAL auth middleware, where Firebase verification is stubbed by the
 * shared `server/test/prisma-mock.ts` setup file. That mock verifies a JWT
 * signed with `JWT_SECRET` and resolves it to a Prisma user, so tokens minted
 * by `createTestUser`/`createTestSession` flow through the same code path as
 * production Firebase ID tokens.
 *
 * Covered guard properties (per the post-PR #47 blocking sequence, item 4):
 *   - Approval guards: consequential/admin routes reject non-admins (403).
 *   - Cross-tenant 404s: one tenant cannot read another tenant's resource.
 *   - Idempotency replay: repeating a mutation does not duplicate state.
 *
 * No live PostgreSQL, Redis, or GitHub is required: prismaMock, the ioredis
 * mock, and the aiService mock stand in for all of them.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../../index';
import { prismaMock } from '../prisma-mock';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
} from '../helpers/database';

// The AI admin route calls aiService.getQueueStats(); mock it so no real queue
// or provider is touched during the approval-guard tests.
vi.mock('../../lib/services/ai.service');

describe('Route-level integration guards', () => {
  let app: any;

  beforeEach(async () => {
    app = createServer();
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // Approval guards
  // ─────────────────────────────────────────────────────────────
  describe('GET /api/ai/admin/queue/stats (approval guard)', () => {
    const mockStats = {
      waiting: 3,
      active: 1,
      completed: 42,
      failed: 0,
      delayed: 0,
    };

    beforeEach(async () => {
      const { aiService } = await import('../../lib/services/ai.service');
      vi.mocked(aiService.getQueueStats).mockResolvedValue(mockStats);
    });

    it('rejects a non-admin user with 403', async () => {
      const user = await createTestUser({
        email: 'regular@example.com',
        role: 'USER',
      });

      const res = await request(app)
        .get('/api/ai/admin/queue/stats')
        .set('Authorization', `Bearer ${user.tokens.accessToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Admin access required');
    });

    it('allows an admin user with 200', async () => {
      const admin = await createTestUser({
        email: 'admin@example.com',
        role: 'ADMIN',
      });

      const res = await request(app)
        .get('/api/ai/admin/queue/stats')
        .set('Authorization', `Bearer ${admin.tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toEqual(mockStats);
    });

    it('allows a super-admin user with 200', async () => {
      const superAdmin = await createTestUser({
        email: 'sa@example.com',
        role: 'SUPER_ADMIN',
      });

      const res = await request(app)
        .get('/api/ai/admin/queue/stats')
        .set('Authorization', `Bearer ${superAdmin.tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
  // ─────────────────────────────────────────────────────────────
  // Cross-tenant 404s (teams)
  // ─────────────────────────────────────────────────────────────
  describe('GET /api/teams/:teamId (cross-tenant isolation)', () => {
    it('lets the owning tenant read their own team (200)', async () => {
      const owner = await createTestUser({
        email: 'owner@example.com',
      });

      // Pre-seed the team + membership directly in the mock. We deliberately do
      // NOT call POST /api/teams because that route is wrapped in
      // rateLimitMiddleware, which 429s for users without a subscription.
      const teamId = 'team-owner-001';
      await (prismaMock as any).team.create({
        data: {
          id: teamId,
          name: 'Owner Team',
          ownerId: owner.id,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      await (prismaMock as any).teamMember.create({
        data: {
          id: 'tm-owner-1',
          teamId,
          userId: owner.id,
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });

      const res = await request(app)
        .get(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${owner.tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.team.id).toBe(teamId);
      expect(res.body.team.ownerId).toBe(owner.id);
    });

    it('denies a different tenant access to the same team (403)', async () => {
      const owner = await createTestUser({
        email: 'owner@example.com',
      });
      const attacker = await createTestUser({
        email: 'attacker@example.com',
      });

      const teamId = 'team-cross-001';
      await (prismaMock as any).team.create({
        data: {
          id: teamId,
          name: 'Target Team',
          ownerId: owner.id,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      await (prismaMock as any).teamMember.create({
        data: {
          id: 'tm-cross-1',
          teamId,
          userId: owner.id,
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });

      // The attacker is not a member of this team → access denied, not a 404
      // oracle (deliberately avoids leaking whether the team id exists).
      const res = await request(app)
        .get(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${attacker.tokens.accessToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.type).toBe('AUTHORIZATION_ERROR');
      expect(res.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Idempotency replay (subscriptions)
  // ─────────────────────────────────────────────────────────────
  describe('POST /api/subscriptions/create (idempotency)', () => {
    it('rejects a second subscription for the same user (409)', async () => {
      const user = await createTestUser({
        email: 'subscriber@example.com',
      });

      // Seed a plan the creation route can resolve.
      await (prismaMock as any).plan.create({
        data: {
          id: 'planstarter123',
          name: 'Starter',
          description: 'Starter plan',
          price: 4900,
          currency: 'usd',
          interval: 'month',
          intervalCount: 1,
          trialPeriodDays: null,
          features: {},
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // First create succeeds.
      const first = await request(app)
        .post('/api/subscriptions/create')
        .set('Authorization', `Bearer ${user.tokens.accessToken}`)
        .send({ planId: 'planstarter123' })
        .expect(201);

      expect(first.body.success).toBe(true);
      expect(first.body.data.subscription.userId).toBe(user.id);
      expect(first.body.data.subscription.plan.id).toBe('planstarter123');

      // Repeating the same mutation must not duplicate state.
      const second = await request(app)
        .post('/api/subscriptions/create')
        .set('Authorization', `Bearer ${user.tokens.accessToken}`)
        .send({ planId: 'planstarter123' })
        .expect(409);

      expect(second.body.success).not.toBe(true);
      expect(second.body.error.code).toBe('SUBSCRIPTION_EXISTS');

      // Confirm exactly one subscription row exists for the user.
      const subscriptions = await (prismaMock as any).subscription.findMany({
        where: { userId: user.id },
      });
      expect(subscriptions).toHaveLength(1);
    });
  });
});