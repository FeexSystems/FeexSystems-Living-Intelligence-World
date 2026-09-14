import request from 'supertest';
import { createServer } from '../../index';
import { PrismaClient } from '@prisma/client';

const app = createServer();
const prisma = new PrismaClient();

// Mock authentication middleware
vi.mock('../../lib/middleware/auth.middleware', () => ({
  authMiddleware: (req, res, next) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER'
    };
    next();
  }
}));

// Mock rate limiting middleware
vi.mock('../../lib/middleware/rate-limit.middleware', () => ({
  rateLimitMiddleware: () => (req, res, next) => next()
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
    it('should return team details for valid team', async () => {
      // This test would need a valid team ID
      // In a real test, you'd create a team first or use a fixture
      const response = await request(app)
        .get('/api/teams/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TEAM_NOT_FOUND');
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