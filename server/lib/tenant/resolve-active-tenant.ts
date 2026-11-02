/**
 * Active-tenant resolution (Option A, step 2).
 *
 * See `docs/TENANT-KEY-RECONCILIATION.md`.
 *
 * ## Problem this solves
 *
 * Missions 001/004 store the Firebase uid in `tenantId`/`teamId`, while Mission
 * 002's `resolveTenantContext()` expects a `Team.id` (cuid). The two value
 * spaces are disjoint, so passing a uid to a membership lookup can never match.
 *
 * ## Interim behaviour (until the backfill migration runs)
 *
 * `resolveActiveTenant()` returns the caller's personal Team id when one can be
 * found (via `Team.ownerId`, which already stores the owner's uid), and falls
 * back to the uid otherwise — logging explicitly so an unmigrated tenant is
 * never mistaken for a migrated one.
 *
 * This function never trusts client input. `userId` must come from a verified
 * Firebase token (`req.user.id`).
 */

import { TeamRole } from '@prisma/client';
import { prisma } from '../database';

/** How the tenant id was determined. */
export type TenantKeySource = 'team' | 'legacy-uid';

export interface ActiveTenant {
  /** The id to use as the tenant key for reads and writes. */
  tenantId: string;
  /** The authenticated Firebase uid. */
  userId: string;
  /** Where `tenantId` came from. `legacy-uid` means not yet migrated. */
  source: TenantKeySource;
  /** Role within the resolved team, when resolved from a team. */
  role: TeamRole | null;
}

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
  userId: string | undefined | null,
  requestedTeamId?: string | null
): Promise<ActiveTenant> {
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
      role: ownMembership?.status === 'ACTIVE' ? ownMembership.role : 'OWNER',
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
    message: string,
    public code: 'TENANT_ACCESS_DENIED'
  ) {
    super(message);
    this.name = 'TenantResolutionError';
  }
}
