 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }















import { prisma } from '../database';

/** Higher number == more authority. */
export const TEAM_ROLE_RANK = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function hasRequiredRole(actual, required) {
  return TEAM_ROLE_RANK[actual] >= TEAM_ROLE_RANK[required];
}

export class TenantAccessError extends Error {
  constructor(
    message,
     code,
     statusCode
  ) {
    super(message);this.code = code;this.statusCode = statusCode;;
    this.name = 'TenantAccessError';
  }
}







/**
 * Resolve and authorize a tenant context for a user.
 *
 * Performs a single membership lookup. Throws `TenantAccessError` when the user
 * is not an active member or lacks the required role. Callers must not use a
 * client-provided tenant id without going through this function.
 */
export async function resolveTenantContext(
  teamId,
  userId,
  requiredRole = 'VIEWER'
) {
  if (!teamId || !userId) {
    throw new TenantAccessError(
      'A tenant and authenticated user are required',
      'TENANT_CONTEXT_REQUIRED',
      400
    );
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { role: true, status: true },
  });

  if (!membership || membership.status !== 'ACTIVE') {
    throw new TenantAccessError(
      'You do not have access to this tenant',
      'TENANT_ACCESS_DENIED',
      403
    );
  }

  if (!hasRequiredRole(membership.role, requiredRole)) {
    throw new TenantAccessError(
      `This operation requires the ${requiredRole} role`,
      'TENANT_ACCESS_DENIED',
      403
    );
  }

  return { teamId, userId, role: membership.role };
}

/** Express `Request` augmentation for resolved tenant contexts. */









/**
 * Express middleware that resolves `req.params[param]` as the tenant id and
 * attaches `req.tenant` on success.
 */
export function requireTenant(param = 'teamId', requiredRole = 'VIEWER') {
  return async (req, res, next) => {
    try {
      const context = await resolveTenantContext(req.params[param], _optionalChain([req, 'access', _ => _.user, 'optionalAccess', _2 => _2.id]), requiredRole);
      req.tenant = context;
      next();
    } catch (error) {
      if (error instanceof TenantAccessError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: error.message,
            code: error.code,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
      console.error('[tenant] context resolution failed', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Tenant context resolution failed',
          code: 'TENANT_CONTEXT_FAILED',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
}
