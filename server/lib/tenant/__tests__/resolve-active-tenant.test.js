 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveActiveTenant, TenantResolutionError } from '../resolve-active-tenant';
import { prisma } from '../../database';

/**
 * Tests for the Option A, step 2 tenant resolver.
 * See docs/TENANT-KEY-RECONCILIATION.md §4.
 *
 * These pin the resolution order and — critically — that an unmigrated user
 * falls back to the legacy uid key *visibly*, never silently.
 */

const USER = 'uid_owner_123';

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function seedTeam(opts





) {
  return prisma.team.create({
    data: {
      id: opts.id,
      name: `Team ${opts.id}`,
      ownerId: opts.ownerId,
      isActive: _nullishCoalesce(opts.isActive, () => ( true)),
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
      members: opts.members
        ? {
            create: opts.members.map((m) => ({
              userId: m.userId,
              teamId: opts.id,
              role: m.role,
              status: _nullishCoalesce(m.status, () => ( 'ACTIVE')),
            })),
          }
        : undefined,
    },
  });
}

describe('resolveActiveTenant', () => {
  it('rejects a missing user id', async () => {
    await expect(resolveActiveTenant(undefined)).rejects.toThrow(/authenticated user id/);
    await expect(resolveActiveTenant(null)).rejects.toThrow(/authenticated user id/);
  });

  it('resolves the personal team via Team.ownerId and reports source=team', async () => {
    await seedTeam({
      id: 'team_personal',
      ownerId: USER,
      members: [{ userId: USER, role: 'OWNER' }],
    });

    const result = await resolveActiveTenant(USER);

    expect(result.tenantId).toBe('team_personal');
    expect(result.source).toBe('team');
    expect(result.userId).toBe(USER);
    expect(result.role).toBe('OWNER');
  });

  it('prefers the oldest active owned team', async () => {
    await seedTeam({ id: 'team_newer', ownerId: USER, createdAt: new Date('2026-02-01') });
    await seedTeam({ id: 'team_older', ownerId: USER, createdAt: new Date('2026-01-01') });

    const result = await resolveActiveTenant(USER);
    expect(result.tenantId).toBe('team_older');
  });

  it('ignores an inactive owned team', async () => {
    await seedTeam({ id: 'team_inactive', ownerId: USER, isActive: false });
    await seedTeam({
      id: 'team_joined',
      ownerId: 'someone-else',
      members: [{ userId: USER, role: 'MEMBER' }],
    });

    const result = await resolveActiveTenant(USER);
    expect(result.tenantId).toBe('team_joined');
    expect(result.role).toBe('MEMBER');
  });

  it('falls back to a joined team when the user owns none', async () => {
    await seedTeam({
      id: 'team_joined',
      ownerId: 'other-owner',
      members: [{ userId: USER, role: 'ADMIN' }],
    });

    const result = await resolveActiveTenant(USER);
    expect(result.tenantId).toBe('team_joined');
    expect(result.source).toBe('team');
    expect(result.role).toBe('ADMIN');
  });

  it('ignores an inactive membership', async () => {
    await seedTeam({
      id: 'team_suspended',
      ownerId: 'other-owner',
      members: [{ userId: USER, role: 'MEMBER', status: 'INACTIVE' }],
    });

    const result = await resolveActiveTenant(USER);
    // No usable team -> legacy fallback, not a silent denial.
    expect(result.source).toBe('legacy-uid');
    expect(result.tenantId).toBe(USER);
  });

  it('falls back to the uid and logs when the user has no team at all', async () => {
    const result = await resolveActiveTenant(USER);

    expect(result.tenantId).toBe(USER);
    expect(result.source).toBe('legacy-uid');
    expect(result.role).toBeNull();

    // The fallback must be observable, never silent.
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('legacy uid tenant key'));
  });

  describe('explicit requestedTeamId', () => {
    it('honours a requested team the user is an active member of', async () => {
      await seedTeam({
        id: 'team_explicit',
        ownerId: 'other-owner',
        members: [{ userId: USER, role: 'VIEWER' }],
      });

      const result = await resolveActiveTenant(USER, 'team_explicit');
      expect(result.tenantId).toBe('team_explicit');
      expect(result.role).toBe('VIEWER');
    });

    it('denies a requested team the user does not belong to (no silent fallback)', async () => {
      await seedTeam({ id: 'team_foreign', ownerId: 'other-owner' });

      await expect(resolveActiveTenant(USER, 'team_foreign')).rejects.toBeInstanceOf(
        TenantResolutionError
      );
    });

    it('denies a requested team where the membership is inactive', async () => {
      await seedTeam({
        id: 'team_suspended',
        ownerId: 'other-owner',
        members: [{ userId: USER, role: 'MEMBER', status: 'INACTIVE' }],
      });

      await expect(resolveActiveTenant(USER, 'team_suspended')).rejects.toMatchObject({
        code: 'TENANT_ACCESS_DENIED',
      });
    });

    it('denies a requested team that does not exist', async () => {
      await expect(resolveActiveTenant(USER, 'team_missing')).rejects.toMatchObject({
        code: 'TENANT_ACCESS_DENIED',
      });
    });
  });
});

describe('createdByUserId dual-write (migration anchor)', () => {
  it('records the creator uid on OperationsEnquiry while keeping uid tenancy', async () => {
    const { operationsService } = await import('../../services/operations.service');

    const { enquiry } = await operationsService.createEnquiry(
      'uid_tenant_legacy',
      {
        contactName: 'Ada',
        contactEmail: 'ada@example.com',
        subject: 'Hi',
        message: 'Question about pricing',
        idempotencyKey: 'anchor-1',
      },
      'uid_creator_abc'
    );

    const row = await prisma.operationsEnquiry.findUnique({ where: { id: enquiry.id } });
    expect(_optionalChain([row, 'optionalAccess', _ => _.tenantId])).toBe('uid_tenant_legacy');
    expect(_optionalChain([row, 'optionalAccess', _2 => _2.createdByUserId])).toBe('uid_creator_abc');
  });

  it('records the creator uid on Property without overwriting ownerId', async () => {
    const { rentalService } = await import('../../services/rental.service');

    const property = await rentalService.createProperty(
      'uid_tenant_legacy',
      {
        name: 'Maple House',
        address: '1 Main St',
        ownerId: 'property-owner-ref',
      },
      'uid_creator_abc'
    );

    const row = await prisma.property.findUnique({ where: { id: property.id } });
    expect(_optionalChain([row, 'optionalAccess', _3 => _3.teamId])).toBe('uid_tenant_legacy');
    expect(_optionalChain([row, 'optionalAccess', _4 => _4.createdByUserId])).toBe('uid_creator_abc');
    // `ownerId` is the property owner, NOT the creator — must be untouched.
    expect(_optionalChain([row, 'optionalAccess', _5 => _5.ownerId])).toBe('property-owner-ref');
  });

  it('records the creator uid on Farm', async () => {
    const { farmPlugService } = await import('../../services/farm-plug.service');

    const farm = await farmPlugService.createFarm(
      'uid_tenant_legacy',
      { name: 'Sunny Acres' },
      'uid_creator_abc'
    );

    const row = await prisma.farm.findUnique({ where: { id: farm.id } });
    expect(_optionalChain([row, 'optionalAccess', _6 => _6.teamId])).toBe('uid_tenant_legacy');
    expect(_optionalChain([row, 'optionalAccess', _7 => _7.createdByUserId])).toBe('uid_creator_abc');
  });

  it('leaves createdByUserId null when no actor is supplied (backwards compatible)', async () => {
    const { operationsService } = await import('../../services/operations.service');

    const { enquiry } = await operationsService.createEnquiry('uid_tenant_legacy', {
      contactName: 'Ada',
      contactEmail: 'ada@example.com',
      subject: 'Hi',
      message: 'No actor supplied',
      idempotencyKey: 'anchor-2',
    });

    const row = await prisma.operationsEnquiry.findUnique({ where: { id: enquiry.id } });
    expect(_optionalChain([row, 'optionalAccess', _8 => _8.createdByUserId])).toBeNull();
  });
});
