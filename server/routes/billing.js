 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import express, { } from 'express';
import { billingService } from '../lib/services/billing.service.js';
import { authorize, requireAuth } from '../lib/middleware/auth.middleware.js';
import { trackBandwidthUsage } from '../lib/middleware/rate-limit.middleware.js';
import { UserRole } from '@prisma/client';

const router = express.Router();

/** Admin-only gate reused by bulk billing and revenue analytics routes. */
const requireAdmin = authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN);

/** Period values accepted by the billing service. */
const VALID_PERIODS = new Set(['current', 'previous']);

/**
 * Runtime-validated period parser. Accepts 'current'/'previous' or an ISO
 * month (YYYY-MM); returns undefined when absent and null when invalid so
 * callers can emit a 400.
 */
function parseBillingPeriod(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const period = String(raw).trim();
  if (VALID_PERIODS.has(period)) return period;
  if (/^\d{4}-\d{2}$/.test(period)) return period;
  return null;
}

/** Runtime-validated month-range parser, clamped to 1-24. */
function parseMonths(raw, fallback) {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const months = Number(raw);
  if (!Number.isInteger(months) || months < 1 || months > 24) return null;
  return months;
}

/**
 * Typed handler for authenticated billing routes: req.user is guaranteed.
 * Rejections are caught and mapped to the billing error envelope
 * { error: { type, message, code } } so no request hangs on a thrown service.
 */
function authed(
  handler,
  error
) {
  return (req, res) => {
    if (!req.user) {
      res.status(401).json({
        error: { type: 'AUTHENTICATION_ERROR', message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' },
      });
      return;
    }
    Promise.resolve(handler(req, res)).catch((err) => {
      console.error(`${error.log}:`, err);
      res.status(500).json({
        error: { type: 'INTERNAL_SERVER_ERROR', message: error.message, code: error.code },
      });
    });
  };
}

// Apply authentication and bandwidth tracking to all routes
router.use(requireAuth);
router.use(trackBandwidthUsage());

/**
 * GET /api/billing/calculate
 * Calculate billing for the authenticated user's current period
 */
router.get('/calculate', authed(async (req, res) => {
  const userId = req.user.id;
  const period = parseBillingPeriod(req.query.period);
  if (period === null) {
    return res.status(400).json({
      error: {
        type: 'VALIDATION_ERROR',
        message: "Period must be 'current', 'previous', or an ISO month (YYYY-MM)",
        code: 'INVALID_PERIOD_PARAMETER',
      },
    });
  }

  const billing = await billingService.calculateBilling(userId, period);

  res.json({
    success: true,
    data: {
      billing,
    },
  });
}, { message: 'Failed to calculate billing', code: 'BILLING_CALCULATION_FAILED', log: 'Calculate billing error' }));

/**
 * GET /api/billing/history
 * Get billing history for the authenticated user
 */
router.get('/history', authed(async (req, res) => {
  const userId = req.user.id;
  const months = parseMonths(req.query.months, 6);
  if (months === null) {
    return res.status(400).json({
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Months parameter must be an integer between 1 and 24',
        code: 'INVALID_MONTHS_PARAMETER',
      },
    });
  }

  const history = await billingService.getBillingHistory(userId, months);

  res.json({
    success: true,
    data: {
      history,
      months,
    },
  });
}, { message: 'Failed to retrieve billing history', code: 'BILLING_HISTORY_FAILED', log: 'Get billing history error' }));

/**
 * GET /api/billing/estimate
 * Get estimated next bill based on current usage trends
 */
router.get('/estimate', authed(async (req, res) => {
  const userId = req.user.id;

  const estimate = await billingService.estimateNextBill(userId);

  res.json({
    success: true,
    data: {
      estimate,
    },
  });
}, { message: 'Failed to estimate billing', code: 'BILLING_ESTIMATION_FAILED', log: 'Estimate billing error' }));

/**
 * POST /api/billing/process-all
 * Process billing for all active subscriptions (Admin only)
 * This endpoint would typically be called by a cron job
 */
router.post('/process-all', requireAdmin, authed(async (req, res) => {
  const period = parseBillingPeriod(_optionalChain([req, 'access', _ => _.body, 'optionalAccess', _2 => _2.period]));
  if (period === null) {
    return res.status(400).json({
      error: {
        type: 'VALIDATION_ERROR',
        message: "Period must be 'current', 'previous', or an ISO month (YYYY-MM)",
        code: 'INVALID_PERIOD_PARAMETER',
      },
    });
  }

  const result = await billingService.processBillingForAllUsers(period);

  res.json({
    success: true,
    data: result,
  });
}, { message: 'Failed to process billing for all users', code: 'BULK_BILLING_FAILED', log: 'Process billing for all users error' }));

/**
 * GET /api/billing/admin/revenue
 * Get revenue analytics for admin dashboard (Admin only)
 */
router.get('/admin/revenue', requireAdmin, authed(async (req, res) => {
  const months = parseMonths(req.query.months, 12);
  if (months === null) {
    return res.status(400).json({
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Months parameter must be an integer between 1 and 24',
        code: 'INVALID_MONTHS_PARAMETER',
      },
    });
  }
  const period = parseBillingPeriod(req.query.period);
  if (period === null) {
    return res.status(400).json({
      error: {
        type: 'VALIDATION_ERROR',
        message: "Period must be 'current', 'previous', or an ISO month (YYYY-MM)",
        code: 'INVALID_PERIOD_PARAMETER',
      },
    });
  }

  // Get revenue data for the specified period or last N months
  const revenueData = await billingService.getRevenueAnalytics(period, months);

  res.json({
    success: true,
    data: {
      revenue: revenueData,
      period: period || 'last_months',
      months: period ? undefined : months,
    },
  });
}, { message: 'Failed to retrieve revenue analytics', code: 'REVENUE_ANALYTICS_FAILED', log: 'Get revenue analytics error' }));

export default router;
