 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }














import { prisma } from '../database';













/**
 * Models that carry a tenant-scoping column and their column name.
 */
const TENANT_COLUMNS = {
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
  req,
  res,
  next
) {
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
  const handler = {
    get(target, prop, receiver) {
      const model = target[prop ];
      if (
        typeof model === 'object' &&
        model !== null &&
        TENANT_COLUMNS[prop ]
      ) {
        return new Proxy(model, {
          get(modelTarget, modelProp) {
            const method = modelTarget[modelProp ];
            if (typeof method !== 'function') return method;

            // Wrap query methods to inject tenantKey where clause.
            if (
              ['findUnique', 'findFirst', 'findMany', 'update', 'delete', 'upsert'].includes(
                modelProp
              )
            ) {
              return async (args) => {
                const tenantColumn = TENANT_COLUMNS[prop ];
                // The outer guard already proved this model is tenant-scoped;
                // narrow once so the index writes below are type-safe.
                if (!tenantColumn) return (method ).call(modelTarget, args);
                const data = _nullishCoalesce(_optionalChain([args, 'optionalAccess', _ => _.data]), () => ( {}));
                const where = _nullishCoalesce(_optionalChain([args, 'optionalAccess', _2 => _2.where]), () => ( {}));

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

                return (method ).call(modelTarget, { ...args, where, data });
              };
            }

            return method;
          },
        });
      }

      return Reflect.get(target, prop, receiver);
    },
  };

  req.prisma = new Proxy(prisma, handler) ;
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
  req,
  res,
  modelName,
  _idParam,
  resourceId
) {
  const tenantKey = req.tenantKey;
  if (!tenantKey) {
    res403(req, res, 'TENANT_KEY_REQUIRED');
    return;
  }

  // TENANT_COLUMNS is keyed by modelName, which is a keyof above — so the
  // column always resolves.
  const tenantColumn = TENANT_COLUMNS[modelName];
  const record = await (req.prisma )[modelName].findFirst({
    where: { id: resourceId, [tenantColumn]: tenantKey },
  });

  if (!record) {
    res403(req, res, 'RESOURCE_NOT_FOUND_OR_ACCESS_DENIED');
    return;
  }
}

function res403(req, res, code) {
  res.status(403).json({
    success: false,
    error: {
      type: 'AUTHORIZATION_ERROR',
      message: 'Access denied to this resource',
      code,
      timestamp: new Date().toISOString(),
      requestId: _nullishCoalesce(res.locals.requestId, () => ( req.headers['x-request-id'])),
    },
  });
}