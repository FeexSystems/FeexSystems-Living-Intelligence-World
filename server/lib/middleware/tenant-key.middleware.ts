/**
 * Tenant resolution middleware for product routes (D-3, step 4).
 *
 * ## What this replaces
 *
 * Missions 001/004/005 each did:
 *
 * ```ts
 * const tenantId = req.user?.id;
 * if (!tenantId) return res.status(401).json({ ... });
 * ```
 *
 * That reads the tenant directly off the Firebase uid and bypasses the Team
 * boundary Mission 002 built. It works for a solo user but breaks the moment a
 * team shares data.
 *
 * ## What this does
 *
 * Resolves the tenant key via `resolveActiveTenant()`, which:
 *   1. honours an explicit `X-Team-Id` header (membership verified);
 *   2. falls back to the caller's personal/active Team;
 *   3. falls back to the legacy uid with a visible warning while unmigrated.
 *
 * The resolved key is attached to `req.tenantKey` so route handlers never touch
 * `req.user.id` for tenancy.
 *
 * ## Why not enforce membership strictly yet
 *
 * Existing rows are still keyed by uid. Rejecting a uid-keyed request before the
 * backfill runs would hide a user's own data. So the resolver's `legacy-uid`
 * source is accepted here and logged — see docs/TENANT-KEY-RECONCILIATION.md §8.6.
 * Once the backfill is complete, flip `ALLOW_LEGACY_UID` to `false`.
 */

import { Request, Response, NextFunction } from 'express';
import { resolveActiveTenant } from '../tenant/resolve-active-tenant';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Tenant key resolved for this request (Team id or legacy uid). */
      tenantKey?: string;
      /** How the key was determined — `team` once migrated, `legacy-uid` before. */
      tenantKeySource?: 'team' | 'legacy-uid';
    }
  }
}

/** Set false to refuse legacy uid scoping once the backfill has run. */
export const ALLOW_LEGACY_UID = false;

/**
 * Resolve `req.tenantKey` for an authenticated request.
 *
 * Must run AFTER `authMiddleware`. Returns 401 when unauthenticated and 403 when
 * the caller requests a team they do not belong to.
 */
export async function resolveTenantKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // A client may request a specific team; it is never trusted without a
  // membership lookup inside resolveActiveTenant().
  const header = req.header('x-team-id');
  const requestedTeamId = header && header.trim() ? header.trim() : undefined;

  try {
    const context = await resolveActiveTenant(userId, requestedTeamId);

    if (context.source === 'legacy-uid' && !ALLOW_LEGACY_UID) {
      res.status(409).json({
        success: false,
        error: {
          type: 'TENANT_NOT_MIGRATED',
          message: 'No team is associated with this account yet.',
          code: 'TENANT_NOT_MIGRATED',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    req.tenantKey = context.tenantId;
    req.tenantKeySource = context.source;
    next();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'TENANT_ACCESS_DENIED') {
      res.status(403).json({
        success: false,
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: error.message,
          code: 'TENANT_ACCESS_DENIED',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    console.error('[tenant] key resolution failed', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Tenant resolution failed',
        code: 'TENANT_RESOLUTION_FAILED',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Read the resolved tenant key inside a route handler.
 *
 * Throws rather than silently falling back to `req.user.id`, so a missing
 * `resolveTenantKey` middleware fails loudly during development instead of
 * quietly reverting to uid scoping.
 */
export function tenantKeyOf(req: Request): string {
  const key = req.tenantKey;
  if (!key) {
    throw new Error(
      'req.tenantKey is undefined — resolveTenantKey middleware must run before this handler'
    );
  }
  return key;
}
