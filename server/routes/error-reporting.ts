/**
 * POST /api/errors
 * Receives client-side error reports from the GlobalErrorHandler.
 * Logs them via the structured logger. No auth required (errors can occur
 * before/during login flows). Rate-limited to prevent abuse.
 *
 * Mount in server/index.ts: app.use('/api/errors', errorReportingRoutes);
 */

import express from 'express';
import { z } from 'zod';
import { logger } from '../lib/logging';

const router = express.Router();

const errorReportSchema = z.object({
  message: z.string().max(2000),
  stack: z.string().max(10000).optional(),
  type: z.enum(['javascript', 'promise', 'network', 'auth', 'validation']),
  errorId: z.string().max(100),
  timestamp: z.string().datetime().optional(),
  userAgent: z.string().max(500).optional(),
  url: z.string().max(2000).optional(),
  userId: z.string().optional(),
  additionalContext: z.record(z.unknown()).optional(),
});

// Simple in-memory rate limit: max 10 errors per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

router.post('/', (req, res) => {
  const ip = req.ip ?? 'unknown';

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ success: false, message: 'Rate limit exceeded' });
  }

  const parsed = errorReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid error report' });
  }

  const report = parsed.data;

  // Log as a warning — these are client-side, not server crashes
  logger.warn('[ClientError]', {
    error_id: report.errorId,
    type: report.type,
    message: report.message,
    url: report.url,
    user_id: report.userId,
    // Omit stack + userAgent from structured logs to keep them compact;
    // they're available in additionalContext if needed for debugging
  });

  return res.status(202).json({ success: true, errorId: report.errorId });
});

export default router;
