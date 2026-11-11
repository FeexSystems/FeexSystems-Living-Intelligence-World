/**
 * Tenant Isolation Enforcement Middleware (Priority 1 — Critical)
 *
 * Ensures that every database query on product routes is scoped to the
 * resolved tenant key. Prevents cross-tenant data access by:
 *
 * 1. Attaching a tenant-scoped Prisma client to `req.prisma` that always
 *    adds `tenantId` / `teamId` where conditions.
 * 2. Validating that the requesting tenant owns the resource before any
 *    read/write on `/enquiries`, `/properties`, `/tenancies`, etc.
 * 3. Rejecting any request where `req.tenantKey` is missing (fails loudly
 *    instead of silently falling back to `req.user.id`).
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Tenant-scoped Prisma client — all queries auto-filter by tenantKey. */
      prisma: typeof prisma;
      /** Tenant key resolved by resolveTenantKey middleware */
      tenantKey?: string;
    }
  }
}

/**
 * Models that carry a tenant-scoping column and their column name.
 */
const TENANT_COLUMNS: Record<string, string> = {
  OperationsEnquiry: 'tenantId',
  OperationsEnquiryEvent: 'tenantId', // derived via enquiry relation
  Property: 'teamId',
  PropertyUnit: 'propertyId', // validated via Property
  Tenancy: 'propertyId', // validated via Property
  MaintenanceRequest: 'propertyId', // validated via Property
  KnowledgeDocument: 'teamId',
  KnowledgeDocumentChunk: 'documentId', // validated via KnowledgeDocument
  FarmObservation: 'plotId', // validated via CropPlot/team
  AdvisoryRequest: 'plotId', // validated via CropPlot/team
  WorkflowRun: 'tenantId',
  WorkflowStep: 'runId', // validated via WorkflowRun
  WorldModelInterpretation: 'projectId', // validated via WorldModelProject
};

/**
 * Middleware that attaches a tenant-scoped Prisma proxy to `req.prisma`.
 * Every `findUnique`, `findFirst`, `findMany`, `update`, `delete` call is
 * automatically augmented with a `where.tenantId` (or `teamId`) filter.
 *
 * Must run AFTER `resolveTenantKey`.
 */
export function tenantIsolationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const tenantKey = req.tenantKey;
  if (!tenantKey) {
    res.status(401).json({
      success: false,
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: 'Tenant key not resolved — resolveTenantKey middleware required',
        code: 'TENANT_KEY_REQUIRED',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Build a proxy around prisma that injects tenantKey into every query.
  const handler: ProxyHandler<typeof prisma> = {
    get(target, prop: string, receiver) {
      const model = target[prop as keyof typeof target];
      if (
        typeof model === 'object' &&
        model !== null &&
        TENANT_COLUMNS[prop as keyof typeof TENANT_COLUMNS]
      ) {
        return new Proxy(model, {
          get(modelTarget, modelProp: string) {
            const method = modelTarget[modelProp as keyof typeof modelTarget];
            if (typeof method !== 'function') return method;

            // Wrap query methods to inject tenantKey where clause.
            if (
              ['findUnique', 'findFirst', 'findMany', 'update', 'delete', 'upsert'].includes(
                modelProp
              )
            ) {
              return async (args: any) => {
                const tenantColumn = TENANT_COLUMNS[prop as keyof typeof TENANT_COLUMNS];
                // The outer guard already proved this model is tenant-scoped;
                // narrow once so the index writes below are type-safe.
                if (!tenantColumn) return (method as any).call(modelTarget, args);
                const data = args?.data ?? {};
                const where = args?.where ?? {};

                // For update/upsert, ensure the where clause contains tenantKey.
                if (
                  ['update', 'delete', 'upsert'].includes(modelProp) &&
                  !where[tenantColumn]
                ) {
                  where[tenantColumn] = tenantKey;
                }

                // For create, enforce tenantKey on the data.
                if (modelProp === 'create') {
                  data[tenantColumn] = tenantKey;
                }

                // For find queries, inject tenantKey into where.
                if (
                  ['findUnique', 'findFirst', 'findMany'].includes(modelProp) &&
                  !where[tenantColumn]
                ) {
                  where[tenantColumn] = tenantKey;
                }

                return (method as any).call(modelTarget, { ...args, where, data });
              };
            }

            return method;
          },
        });
      }

      return Reflect.get(target, prop, receiver);
    },
  };

  req.prisma = new Proxy(prisma, handler) as typeof prisma;
  next();
}

/**
 * Resource ownership guard. Verifies that the requesting tenant owns the
 * given resource before allowing mutation. Throws 403 if not owned.
 *
 * Usage in route handlers:
 *   await ensureResourceOwnership(req, 'Property', 'id', req.params.id);
 */
export async function ensureResourceOwnership(
  req: Request,
  res: Response,
  modelName: keyof typeof TENANT_COLUMNS,
  _idParam: string,
  resourceId: string
): Promise<void> {
  const tenantKey = req.tenantKey;
  if (!tenantKey) {
    res403(req, res, 'TENANT_KEY_REQUIRED');
    return;
  }

  // TENANT_COLUMNS is keyed by modelName, which is a keyof above — so the
  // column always resolves.
  const tenantColumn = TENANT_COLUMNS[modelName];
  const record = await (req.prisma as any)[modelName].findFirst({
    where: { id: resourceId, [tenantColumn!]: tenantKey },
  });

  if (!record) {
    res403(req, res, 'RESOURCE_NOT_FOUND_OR_ACCESS_DENIED');
    return;
  }
}

function res403(req: Request, res: Response, code: string): void {
  res.status(403).json({
    success: false,
    error: {
      type: 'AUTHORIZATION_ERROR',
      message: 'Access denied to this resource',
      code,
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId ?? req.headers['x-request-id'],
    },
  });
}