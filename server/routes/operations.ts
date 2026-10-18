/**
 * Feex AI Operations routes (Mission 001).
 *
 * All routes require a verified Firebase ID token. The tenant is always the
 * authenticated user id taken from `req.user` — never from the request body.
 */

import express, { Request, Response } from 'express';
import { authMiddleware, rateLimit } from '../lib/middleware/auth.middleware';
import { operationsService, OperationsError } from '../lib/services/operations.service';
import {
  createOperationsEnquirySchema,
  listOperationsEnquiriesQuerySchema,
  reviewOperationsEnquirySchema,
} from '../lib/validations/operations';

const router = express.Router();

// Authenticate every operations route.
router.use(authMiddleware);

// Intake is the only write path that creates records; bound it.
const intakeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 60,
  scope: 'operations-intake',
  message: 'Too many enquiry submissions. Please try again later.',
});

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
      message: 'The operations workflow could not be completed.',
      code: fallbackCode,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * GET /api/operations/health
 * Reports whether a model credential is configured. Never exposes the key.
 */
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
 * Accept an enquiry, classify it, and queue it for human approval.
 */
router.post('/enquiries', intakeLimiter, async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) {
    return res.status(401).json({
      success: false,
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
        timestamp: new Date().toISOString(),
      },
    });
  }

  const parsed = createOperationsEnquirySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Enquiry validation failed',
        code: 'VALIDATION_FAILED',
        details: parsed.error.issues,
        timestamp: new Date().toISOString(),
      },
    });
  }

  try {
    const { enquiry, created } = await operationsService.createEnquiry(tenantId, parsed.data);
    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Enquiry received and classified' : 'Enquiry already processed (idempotent replay)',
      data: { enquiry, idempotentReplay: !created },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return sendError(res, error, 'ENQUIRY_CREATE_FAILED');
  }
});

/**
 * GET /api/operations/enquiries
 */
router.get('/enquiries', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) {
    return res.status(401).json({
      success: false,
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
        timestamp: new Date().toISOString(),
      },
    });
  }

  const parsed = listOperationsEnquiriesQuerySchema.safeParse(req.query ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        code: 'VALIDATION_FAILED',
        details: parsed.error.issues,
        timestamp: new Date().toISOString(),
      },
    });
  }

  try {
    const result = await operationsService.listEnquiries(tenantId, parsed.data);
    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return sendError(res, error, 'ENQUIRY_LIST_FAILED');
  }
});

/**
 * GET /api/operations/enquiries/:id
 */
router.get('/enquiries/:id', async (req: Request, res: Response) => {
  const tenantId = req.user?.id;
  if (!tenantId) {
    return res.status(401).json({
      success: false,
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
        timestamp: new Date().toISOString(),
      },
    });
  }

  try {
    const enquiry = await operationsService.getEnquiry(tenantId, req.params.id);
    return res.json({
      success: true,
      data: { enquiry },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return sendError(res, error, 'ENQUIRY_FETCH_FAILED');
  }
});

/**
 * POST /api/operations/enquiries/:id/approve
 *
 * Human approval gate. Records the decision only — no external action.
 */
router.post('/enquiries/:id/approve', async (req: Request, res: Response) => {
  return reviewHandler(req, res, 'APPROVED');
});

/**
 * POST /api/operations/enquiries/:id/reject
 */
router.post('/enquiries/:id/reject', async (req: Request, res: Response) => {
  return reviewHandler(req, res, 'REJECTED');
});

async function reviewHandler(
  req: Request,
  res: Response,
  decision: 'APPROVED' | 'REJECTED'
): Promise<Response> {
  const tenantId = req.user?.id;
  if (!tenantId) {
    return res.status(401).json({
      success: false,
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
        timestamp: new Date().toISOString(),
      },
    });
  }

  const parsed = reviewOperationsEnquirySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Invalid review payload',
        code: 'VALIDATION_FAILED',
        details: parsed.error.issues,
        timestamp: new Date().toISOString(),
      },
    });
  }

  try {
    const enquiry =
      decision === 'APPROVED'
        ? await operationsService.approveEnquiry(tenantId, req.params.id, tenantId, parsed.data.note)
        : await operationsService.rejectEnquiry(tenantId, req.params.id, tenantId, parsed.data.note);

    return res.json({
      success: true,
      message:
        decision === 'APPROVED'
          ? 'Enquiry approved. No external action was performed.'
          : 'Enquiry rejected. No external action was performed.',
      data: { enquiry },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return sendError(res, error, 'ENQUIRY_REVIEW_FAILED');
  }
}

export default router;
