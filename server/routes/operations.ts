/**
 * Feex AI Operations routes (Mission 001).
 *
 * All routes require a verified Firebase ID token. The tenant is always the
 * resolved tenant key from `req.tenantKey` — never from the request body, and
 * never `req.user.id` directly (that bypasses the Team boundary).
 *
 * Tenant scoping lives in `OperationsService`, which takes `tenantId` on every
 * method and filters all reads/writes by it. A cross-tenant id therefore
 * resolves to "not found" (404) rather than "forbidden" (403), so the API never
 * confirms the existence of another tenant's records.
 */

import express, { Request, Response } from 'express';
import { authMiddleware } from '../lib/middleware/auth.middleware';
import { resolveTenantKey, tenantKeyOf } from '../lib/middleware/tenant-key.middleware';
import { operationsService, OperationsError } from '../lib/services/operations.service';
import {
  createOperationsEnquirySchema,
  listOperationsEnquiriesQuerySchema,
  reviewOperationsEnquirySchema,
} from '../lib/validations/operations';

import { param } from '../lib/utils/route-params';

const router = express.Router();

// Authenticate every operations route.
router.use(authMiddleware);
// Resolve the tenant key (Team-scoped once migrated; legacy uid until then).
router.use(resolveTenantKey);

function sendError(res: Response, error: unknown, fallbackCode: string): Response {
  if (error instanceof OperationsError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        type: 'OPERATIONS_ERROR',
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      },
    });
  }
  console.error(`[operations] ${fallbackCode}`, error);
  return res.status(500).json({
    success: false,
    error: {
      type: 'INTERNAL_SERVER_ERROR',
      message: 'Operations request failed',
      code: fallbackCode,
      timestamp: new Date().toISOString(),
    },
  });
}

router.get('/health', (_req: Request, res: Response) => {
  const aiConfigured = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
  res.json({
    success: true,
    data: {
      authMode: 'firebase',
      ai: aiConfigured ? 'configured' : 'deterministic-fallback',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/operations/enquiries
 * Create (or replay, via `idempotencyKey`) an enquiry for the caller's tenant.
 */
router.post('/enquiries', async (req: Request, res: Response) => {
  const parsed = createOperationsEnquirySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Invalid enquiry payload',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
        timestamp: new Date().toISOString(),
      },
    });
  }

  try {
    const result = await operationsService.createEnquiry(
      tenantKeyOf(req),
      parsed.data,
      req.user?.id
    );
    return res.status(result.created ? 201 : 200).json({
      success: true,
      data: result.enquiry,
      meta: { created: result.created },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return sendError(res, error, 'ENQUIRY_CREATE_FAILED');
  }
});

/**
 * GET /api/operations/enquiries
 * Tenant-scoped list, newest first.
 */
router.get('/enquiries', async (req: Request, res: Response) => {
  const parsed = listOperationsEnquiriesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
        timestamp: new Date().toISOString(),
      },
    });
  }

  try {
    const { enquiries, total } = await operationsService.listEnquiries(
      tenantKeyOf(req),
      parsed.data
    );
    return res.json({
      success: true,
      data: { enquiries, total },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return sendError(res, error, 'ENQUIRY_LIST_FAILED');
  }
});

/**
 * GET /api/operations/enquiries/:id
 * Tenant-scoped fetch. Another tenant's enquiry is indistinguishable from a
 * missing one (404).
 */
router.get('/enquiries/:id', async (req: Request, res: Response) => {
  try {
    const enquiry = await operationsService.getEnquiry(tenantKeyOf(req), param(req, 'id'));
    return res.json({ success: true, data: enquiry, timestamp: new Date().toISOString() });
  } catch (error) {
    return sendError(res, error, 'ENQUIRY_GET_FAILED');
  }
});

/**
 * POST /api/operations/enquiries/:id/approve
 * Human approval gate. Records the decision only — performs no external action.
 */
router.post('/enquiries/:id/approve', async (req: Request, res: Response) => {
  const parsed = reviewOperationsEnquirySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Invalid review payload',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
        timestamp: new Date().toISOString(),
      },
    });
  }

  try {
    const actorId = req.user?.id ?? tenantKeyOf(req);
    const enquiry = await operationsService.approveEnquiry(
      tenantKeyOf(req),
      param(req, 'id'),
      actorId,
      parsed.data.note
    );
    return res.json({ success: true, data: enquiry, timestamp: new Date().toISOString() });
  } catch (error) {
    return sendError(res, error, 'ENQUIRY_APPROVE_FAILED');
  }
});

/**
 * POST /api/operations/enquiries/:id/reject
 * Counterpart to approve; same guard and audit trail.
 */
router.post('/enquiries/:id/reject', async (req: Request, res: Response) => {
  const parsed = reviewOperationsEnquirySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Invalid review payload',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
        timestamp: new Date().toISOString(),
      },
    });
  }

  try {
    const actorId = req.user?.id ?? tenantKeyOf(req);
    const enquiry = await operationsService.rejectEnquiry(
      tenantKeyOf(req),
      param(req, 'id'),
      actorId,
      parsed.data.note
    );
    return res.json({ success: true, data: enquiry, timestamp: new Date().toISOString() });
  } catch (error) {
    return sendError(res, error, 'ENQUIRY_REJECT_FAILED');
  }
});

export default router;
