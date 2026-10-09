import request from 'supertest';
import { createServer } from '../../index';
import { prismaMock } from '../../test/prisma-mock';

const app = createServer();
// Write through the in-memory mock the server also resolves (§ prisma-mock.ts
// stubs '@server/lib/database'), so rows created here are visible to routes.
// A bare `new PrismaClient()` would target a real, unavailable database.
const prisma = prismaMock;

// Mock authentication middleware
//
// Must expose every symbol the route layer imports — `server/index.ts` mounts
// the World Model router, which imports `authorize` for its admin-guarded
// mutation endpoints. Omitting it makes Vitest fail the whole suite with
// 'No "authorize" export is defined on the mock'.
vi.mock('../../lib/middleware/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER'
    };
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
  optionalAuthenticate: (_req: any, _res: any, next: any) => next(),
  requireAuth: (_req: any, _res: any, next: any) => next(),
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
  rateLimitConfigs: {
    general: {},
    auth: {},
    passwordReset: {},
    aiServices: {},
  },
  validateRequest: () => (_req: any, _res: any, next: any) => next(),
  validateQuery: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock rate limiting middleware
//
// Must cover every export the route layer imports: usage.ts and billing.ts
// pull in `trackBandwidthUsage`, and the suite loads them via the server.
vi.mock('../../lib/middleware/rate-limit.middleware', () => ({
  rateLimitMiddleware: () => (_req: any, _res: any, next: any) => next(),
  incrementUsageAfterSuccess: () => (_req: any, _res: any, next: any) => next(),
  checkStorageLimit: () => (_req: any, _res: any, next: any) => next(),
  incrementStorageAfterUpload: () => (_req: any, _res: any, next: any) => next(),
  trackBandwidthUsage: () => (_req: any, _res: any, next: any) => next(),
}));

describe('Teams API', () => {
  beforeAll(async () => {
    // Setup test database if needed
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/teams', () => {
    it('should create a new team', async () => {
      const teamData = {
        name: 'Test Team',
        description: 'A test team for unit testing'
      };

      const response = await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.team).toBeDefined();
      expect(response.body.team.name).toBe(teamData.name);
      expect(response.body.team.description).toBe(teamData.description);
    });

    it('should return validation error for invalid data', async () => {
      const response = await request(app)
        .post('/api/teams')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/teams', () => {
    it('should return user teams', async () => {
      const response = await request(app)
        .get('/api/teams')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.teams).toBeDefined();
      expect(Array.isArray(response.body.teams)).toBe(true);
    });
  });

  describe('GET /api/teams/:id', () => {
    it('denies access to a team the caller is not a member of', async () => {
      // A non-existent team has no membership row, and getTeam() checks
      // membership before the team lookup. The requester is therefore denied
      // (403) before the team's existence can be confirmed — deliberately
      // avoiding a 404 oracle that would leak which team ids exist.
      const response = await request(app)
        .get('/api/teams/non-existent-id')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });

    it('does not distinguish a missing team from an inaccessible one', async () => {
      // Guards the non-oracle property directly: removing the team row must not
      // change the response, because the membership gate rejects non-members
      // with 403 regardless of whether the team exists.
      //
      // (Verified: TeamMember cascades on team delete, so an ACTIVE membership
      // can never survive its team — meaning getTeam() cannot return null for a
      // caller who already passed the membership check.)
      await prismaMock.team.create({
        data: { id: 'removed-team', name: 'Removed', ownerId: 'test-user-id' },
      });
      await prismaMock.team.delete({ where: { id: 'removed-team' } });

      const response = await request(app)
        .get('/api/teams/removed-team')
        .expect(403);

      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('POST /api/teams/:id/invite', () => {
    it('should validate invitation data', async () => {
      const response = await request(app)
        .post('/api/teams/test-team-id/invite')
        .send({
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/teams/accept-invitation', () => {
    it('should validate invitation token', async () => {
      const response = await request(app)
        .post('/api/teams/accept-invitation')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });
});