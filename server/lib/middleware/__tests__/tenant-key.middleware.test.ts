import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveTenantKey, tenantKeyOf } from '../tenant-key.middleware';
import { prisma } from '../../database';

/**
 * Tests for the tenant-key middleware (D-3 step 4).
 *
 * Asserts the behaviour the product routes now depend on:
 *   - 401 with no authenticated user;
 *   - a Team-scoped key when the user owns a team;
 *   - a legacy uid key (from the resolver) when not yet migrated;
 *   - 403 when an explicit X-Team-Id team is not theirs;
 *   - `tenantKeyOf` throws rather than silently falling back to req.user.id.
 */

const USER = 'uid_middleware_user';

function fakeReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: USER, email: 'u@example.com' },
    header: (_name: string) => undefined,
    ...overrides,
  } as any;
}

function fakeRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
  };
  return res;
}

async function run(req: any) {
  const res = fakeRes();
  const next = vi.fn();
  await resolveTenantKey(req, res, next);
  return { res, next };
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('resolveTenantKey — authentication', () => {
  it('returns 401 when there is no authenticated user', async () => {
    const { res, next } = await run(fakeReq({ user: undefined }));

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });
});

describe('resolveTenantKey — team-scoped tenant', () => {
  it('attaches the Team id when the user owns a team', async () => {
    const team = await prisma.team.create({
      data: { id: 'team_owned', name: 'Owned', ownerId: USER, isActive: true },
    });

    const req = fakeReq();
    const { res, next } = await run(req);

    expect(next).toHaveBeenCalled();
    expect(req.tenantKey).toBe(team.id);
    expect(req.tenantKeySource).toBe('team');
    expect(res.statusCode).toBe(200);
  });

  it('does NOT scope by the Firebase uid when a team exists', async () => {
    await prisma.team.create({
      data: { id: 'team_owned', name: 'Owned', ownerId: USER, isActive: true },
    });

    const req = fakeReq();
    await run(req);

    expect(req.tenantKey).not.toBe(USER);
  });
});

describe('resolveTenantKey — legacy fallback', () => {
  it('falls back to the uid when the user has no team, and says so', async () => {
    const req = fakeReq();
    const { next } = await run(req);

    expect(next).toHaveBeenCalled();
    expect(req.tenantKey).toBe(USER);
    expect(req.tenantKeySource).toBe('legacy-uid');
  });
});

describe('resolveTenantKey — explicit X-Team-Id header', () => {
  it('honours a team the user is an active member of', async () => {
    await prisma.team.create({
      data: {
        id: 'team_shared',
        name: 'Shared',
        ownerId: 'other-owner',
        isActive: true,
        members: { create: [{ userId: USER, teamId: 'team_shared', role: 'MEMBER' }] },
      },
    });

    const req = fakeReq({ header: (n: string) => (n.toLowerCase() === 'x-team-id' ? 'team_shared' : undefined) });
    const { next } = await run(req);

    expect(next).toHaveBeenCalled();
    expect(req.tenantKey).toBe('team_shared');
    expect(req.tenantKeySource).toBe('team');
  });

  it('returns 403 for a team the user does not belong to', async () => {
    await prisma.team.create({
      data: { id: 'team_foreign', name: 'Foreign', ownerId: 'other-owner', isActive: true },
    });

    const req = fakeReq({ header: (n: string) => (n.toLowerCase() === 'x-team-id' ? 'team_foreign' : undefined) });
    const { res, next } = await run(req);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
    expect(res.body.error.code).toBe('TENANT_ACCESS_DENIED');
    // A denied request must never carry a tenant key.
    expect(req.tenantKey).toBeUndefined();
  });
});

describe('tenantKeyOf', () => {
  it('returns the resolved key', () => {
    expect(tenantKeyOf({ tenantKey: 'team_x' } as any)).toBe('team_x');
  });

  it('throws when the middleware did not run — never silently uses req.user.id', () => {
    const req = { user: { id: USER } } as any;
    expect(() => tenantKeyOf(req)).toThrow(/resolveTenantKey middleware must run/);
  });
});
