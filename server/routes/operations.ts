/**
 * Feex AI Operations routes (Mission 001).
 *
 * All routes require a verified Firebase ID token. The tenant is always the
 * authenticated user id taken from `req.user` â€” never from the request body.
 */

import express, { Request, Response } from 'express';
import { authMiddleware, rateLimit } from '../lib/middleware/auth.middleware';
import { resolveTenantKey, tenantKeyOf } from '../lib/middleware/tenant-key.middleware';
import { tenantIsolationMiddleware } from '../lib/middleware/tenant-isolation.middleware';
import { validateConfidenceScores } from '../lib/middleware/confidence-validation.middleware';
import { validateIdempotencyKey, recordIdempotencyKey } from '../lib/services/idempotency.service';
import { operationsService, OperationsError } from '../lib/services/operations.service';
import {
  createOperationsEnquirySchema,
  listOperationsEnquiriesQuerySchema,
  reviewOperationsEnquirySchema,
} from '../lib/validations/operations';

const router = express.Router();

// Authenticate every operations route.
router.use(authMiddleware);
// Resolve the tenant key (Team-scoped once migrated; legacy uid until then).
router.use(resolveTenantKey);
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
router.use(tenantIsolationMiddleware);
});
router.use(tenantIsolationMiddleware);
