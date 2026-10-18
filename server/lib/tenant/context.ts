/**
 * Tenant context & authorization (Mission 002).
 *
 * The repository's tenant boundary is `Team` + `TeamMember` (roles OWNER /
 * ADMIN / MEMBER / VIEWER). This module is deliberately a THIN layer over that
 * existing data — it does not introduce a second tenant model.
 *
 * Rules enforced here:
 *   - a tenant id supplied by a client is never trusted on its own;
 *   - membership is always resolved from the database;
 *   - inactive/suspended members are denied;
 *   - a minimum role is required per operation.
 */

import { TeamRole } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database';

/** Higher number == more authority. */
export const TEAM_ROLE_RANK: Record<TeamRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function hasRequiredRole(actual: TeamRole, required: TeamRole): boolean {
  return TEAM_ROLE_RANK[actual] >= TEAM_ROLE_RANK[required];
}

export class TenantAccessError extends Error {
  constructor(
    message: string,
    public code: 'TENANT_ACCESS_DENIED' | 'TENANT_CONTEXT_REQUIRED',
    public statusCode: number
  ) {
    super(message);
    this.name = 'TenantAccessError';
  }
}

export interface TenantContext {
  teamId: string;
  userId: string;
  role: TeamRole;
}

/**
 * Resolve and authorize a tenant context for a user.
 *
 * Performs a single membership lookup. Throws `TenantAccessError` when the user
 * is not an active member or lacks the required role. Callers must not use a
 * client-provided tenant id without going through this function.
 */
export async function resolveTenantContext(
  teamId: string | undefined | null,
  userId: string | undefined | null,
  requiredRole: TeamRole = 'VIEWER'
): Promise<TenantContext> {
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
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

/**
 * Express middleware that resolves `req.params[param]` as the tenant id and
 * attaches `req.tenant` on success.
 */
export function requireTenant(param = 'teamId', requiredRole: TeamRole = 'VIEWER') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const context = await resolveTenantContext(req.params[param], req.user?.id, requiredRole);
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
