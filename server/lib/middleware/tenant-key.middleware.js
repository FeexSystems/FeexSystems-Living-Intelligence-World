 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }


































import { resolveActiveTenant } from '../tenant/resolve-active-tenant';













/** Set false to refuse legacy uid scoping once the backfill has run. */
export const ALLOW_LEGACY_UID = false;

/**
 * Resolve `req.tenantKey` for an authenticated request.
 *
 * Must run AFTER `authMiddleware`. Returns 401 when unauthenticated and 403 when
 * the caller requests a team they do not belong to.
 */
export async function resolveTenantKey(
  req,
  res,
  next
) {
  const userId = _optionalChain([req, 'access', _ => _.user, 'optionalAccess', _2 => _2.id]);
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
export function tenantKeyOf(req) {
  const key = req.tenantKey;
  if (!key) {
    throw new Error(
      'req.tenantKey is undefined — resolveTenantKey middleware must run before this handler'
    );
  }
  return key;
}
