 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }






















import { prisma } from '../database';

/** How the tenant id was determined. */
 












/**
 * Resolve the tenant key for an authenticated user.
 *
 * Order of resolution:
 *   1. an explicit `requestedTeamId` — verified via `TeamMember` membership;
 *   2. the caller's personal team (`Team.ownerId === userId`), if active;
 *   3. the caller's first active membership;
 *   4. otherwise fall back to the uid (`legacy-uid`), logged as a warning.
 */
export async function resolveActiveTenant(
  userId,
  requestedTeamId
) {
  if (!userId) {
    throw new Error('resolveActiveTenant requires an authenticated user id');
  }

  // 1. Caller explicitly asked for a team — membership is always verified.
  if (requestedTeamId) {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: requestedTeamId, userId } },
      select: { role: true, status: true },
    });

    if (membership && membership.status === 'ACTIVE') {
      return { tenantId: requestedTeamId, userId, source: 'team', role: membership.role };
    }
    // An explicit but unauthorized team id is a denial, not a silent fallback.
    throw new TenantResolutionError(
      'You do not have access to the requested team',
      'TENANT_ACCESS_DENIED'
    );
  }

  // 2. Personal team owned by this user.
  const owned = await prisma.team.findFirst({
    where: { ownerId: userId, isActive: true },
    select: { id: true, members: { where: { userId }, select: { role: true, status: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (owned) {
    const ownMembership = owned.members[0];
    return {
      tenantId: owned.id,
      userId,
      source: 'team',
      role: _optionalChain([ownMembership, 'optionalAccess', _ => _.status]) === 'ACTIVE' ? ownMembership.role : 'OWNER',
    };
  }

  // 3. Any active membership.
  const membership = await prisma.teamMember.findFirst({
    where: { userId, status: 'ACTIVE' },
    select: { teamId: true, role: true },
    orderBy: { joinedAt: 'asc' },
  });

  if (membership) {
    return {
      tenantId: membership.teamId,
      userId,
      source: 'team',
      role: membership.role,
    };
  }

  // 4. Unmigrated fallback: keep the legacy uid key so existing rows stay
  //    readable. This is deliberate and logged — never silent.
  console.warn(
    `[tenant] user ${userId} has no team; falling back to legacy uid tenant key. ` +
      'Run the tenant backfill migration (docs/TENANT-KEY-RECONCILIATION.md).'
  );
  return { tenantId: userId, userId, source: 'legacy-uid', role: null };
}

export class TenantResolutionError extends Error {
  constructor(
    message,
     code
  ) {
    super(message);this.code = code;;
    this.name = 'TenantResolutionError';
  }
}
