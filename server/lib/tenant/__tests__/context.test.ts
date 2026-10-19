import { describe, it, expect, beforeEach } from 'vitest';
import { prismaMock } from '../../../test/prisma-mock';
import {
  hasRequiredRole,
  resolveTenantContext,
  TenantAccessError,
} from '../context';

async function seedUserAndTeam() {
  await prismaMock.user.create({
    data: {
      id: 'user-owner',
      email: 'owner@example.com',
      passwordHash: 'x',
      firstName: 'Owner',
      lastName: 'User',
    },
  });
  await prismaMock.team.create({
    data: { id: 'team-1', name: 'Tenant One', ownerId: 'user-owner' },
  });
}

describe('hasRequiredRole', () => {
  it('enforces the VIEWER < MEMBER < ADMIN < OWNER hierarchy', () => {
    expect(hasRequiredRole('OWNER', 'ADMIN')).toBe(true);
    expect(hasRequiredRole('ADMIN', 'MEMBER')).toBe(true);
    expect(hasRequiredRole('MEMBER', 'VIEWER')).toBe(true);
    expect(hasRequiredRole('VIEWER', 'MEMBER')).toBe(false);
    expect(hasRequiredRole('MEMBER', 'ADMIN')).toBe(false);
    expect(hasRequiredRole('ADMIN', 'OWNER')).toBe(false);
  });
});

describe('resolveTenantContext', () => {
  beforeEach(async () => {
    await seedUserAndTeam();
  });

  it('allows an active member with a sufficient role', async () => {
    await prismaMock.teamMember.create({
      data: { teamId: 'team-1', userId: 'user-owner', role: 'ADMIN', status: 'ACTIVE' },
    });

    const context = await resolveTenantContext('team-1', 'user-owner', 'MEMBER');

    expect(context).toEqual({ teamId: 'team-1', userId: 'user-owner', role: 'ADMIN' });
  });

  it('denies a user who is not a member of the tenant', async () => {
    await expect(resolveTenantContext('team-1', 'stranger', 'VIEWER')).rejects.toMatchObject({
      code: 'TENANT_ACCESS_DENIED',
      statusCode: 403,
    });
  });

  it('denies an inactive member', async () => {
    await prismaMock.teamMember.create({
      data: { teamId: 'team-1', userId: 'user-owner', role: 'MEMBER', status: 'INACTIVE' },
    });

    await expect(resolveTenantContext('team-1', 'user-owner', 'VIEWER')).rejects.toBeInstanceOf(
      TenantAccessError
    );
  });

  it('denies a member whose role is below the required role', async () => {
    await prismaMock.teamMember.create({
      data: { teamId: 'team-1', userId: 'user-owner', role: 'VIEWER', status: 'ACTIVE' },
    });

    await expect(resolveTenantContext('team-1', 'user-owner', 'ADMIN')).rejects.toMatchObject({
      code: 'TENANT_ACCESS_DENIED',
    });
  });

  it('requires both a tenant and a user', async () => {
    await expect(resolveTenantContext(undefined, 'user-owner')).rejects.toMatchObject({
      code: 'TENANT_CONTEXT_REQUIRED',
      statusCode: 400,
    });
    await expect(resolveTenantContext('team-1', undefined)).rejects.toMatchObject({
      code: 'TENANT_CONTEXT_REQUIRED',
    });
  });
});
