import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { NextFunction, Request, Response } from 'express';
import roboticsRoutes from '../../routes/robotics.js';

// The robotics router reads its Prisma client off globalThis (legacy
// pattern shared with the world-model facade). Stub it per-test.
const prismaMock = {
  worldModelProject: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../../lib/middleware/production-security.js', () => ({
  hardQueryRateLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../lib/middleware/auth.middleware.js', () => ({
  authMiddleware: vi.fn((_req: any, _res: any, next: any) => next()),
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/robotics', roboticsRoutes);

describe('Robotics Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).prisma = prismaMock;
    prismaMock.worldModelProject.findMany.mockResolvedValue([]);
    prismaMock.worldModelProject.count.mockResolvedValue(0);
  });

  afterEach(() => {
    delete (globalThis as any).prisma;
  });

  it('applies column-backed facet filters to the query', async () => {
    await request(app).get(
      '/api/robotics?robotClass=quadruped&lifecycle=production',
    );
    const where = prismaMock.worldModelProject.findMany.mock.calls[0][0].where;
    expect(where.worldCategory).toBe('ROBOTICS');
    expect(where.worldModality).toBe('quadruped');
    expect(where.worldLifecycle).toBe('production');
  });

  it('applies metadata-backed facet filters via JSON path', async () => {
    await request(app).get(
      '/api/robotics?domain=agriculture&protocol=ros2&holokaiIntegrated=true',
    );
    const where = prismaMock.worldModelProject.findMany.mock.calls[0][0].where;
    const and = where.AND as Record<string, unknown>[];
    expect(and).toHaveLength(3);
    expect(and[0]).toEqual({
      metadata: { path: ['domain'], equals: 'agriculture' },
    });
    expect(and[1]).toEqual({
      metadata: { path: ['protocol'], equals: 'ros2' },
    });
    expect(and[2]).toEqual({
      metadata: { path: ['holokaiIntegrated'], equals: true },
    });
  });

  it('keeps the free-text search filter', async () => {
    await request(app).get('/api/robotics?q=ferox');
    const where = prismaMock.worldModelProject.findMany.mock.calls[0][0].where;
    expect(where.name).toEqual({ contains: 'ferox', mode: 'insensitive' });
  });

  it('surfaces metadata.holokaiIntegrated as a top-level flag', async () => {
    prismaMock.worldModelProject.findMany.mockResolvedValue([
      {
        id: 'r1',
        name: 'R1',
        metadata: { holokaiIntegrated: true },
      },
      { id: 'r2', name: 'R2', metadata: {} },
    ]);
    const res = await request(app).get('/api/robotics');
    expect(res.status).toBe(200);
    expect(res.body.data[0].holokaiIntegrated).toBe(true);
    expect(res.body.data[1].holokaiIntegrated).toBe(false);
  });
});
