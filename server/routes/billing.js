import express from 'express';
import { billingService } from '../lib/services/billing.service.js';
import { requireAuth } from '../lib/middleware/auth.middleware.js';
import { trackBandwidthUsage } from '../lib/middleware/rate-limit.middleware.js';

const router = express.Router();

// Apply authentication and bandwidth tracking to all routes
router.use(requireAuth);
router.use(trackBandwidthUsage());

/**
 * GET /api/billing/calculate
 * Calculate billing for the authenticated user's current period
 */
router.get('/calculate', async (req, res) => {
  try {
    const userId = req.user.id;
    const period = req.query.period ;
    
    const billing = await billingService.calculateBilling(userId, period);
    
    res.json({
      success: true,
      data: {
        billing,
      },
    });
  } catch (error) {
    console.error('Calculate billing error:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to calculate billing',
        code: 'BILLING_CALCULATION_FAILED',
      },
    });
  }
});

/**
 * GET /api/billing/history
 * Get billing history for the authenticated user
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const months = parseInt(req.query.months ) || 6;
    
    if (months < 1 || months > 24) {
      return res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Months parameter must be between 1 and 24',
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
  } catch (error) {
    console.error('Get billing history error:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve billing history',
        code: 'BILLING_HISTORY_FAILED',
      },
    });
  }
});

/**
 * GET /api/billing/estimate
 * Get estimated next bill based on current usage trends
 */
router.get('/estimate', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const estimate = await billingService.estimateNextBill(userId);
    
    res.json({
      success: true,
      data: {
        estimate,
      },
    });
  } catch (error) {
    console.error('Estimate billing error:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to estimate billing',
        code: 'BILLING_ESTIMATION_FAILED',
      },
    });
  }
});

/**
 * POST /api/billing/process-all
 * Process billing for all active subscriptions (Admin only)
 * This endpoint would typically be called by a cron job
 */
router.post('/process-all', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'Admin access required',
          code: 'ADMIN_ACCESS_REQUIRED',
        },
      });
    }

    const period = req.body.period ;
    const result = await billingService.processBillingForAllUsers(period);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Process billing for all users error:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process billing for all users',
        code: 'BULK_BILLING_FAILED',
      },
    });
  }
});

/**
 * GET /api/billing/admin/revenue
 * Get revenue analytics for admin dashboard (Admin only)
 */
router.get('/admin/revenue', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'Admin access required',
          code: 'ADMIN_ACCESS_REQUIRED',
        },
      });
    }

    const months = parseInt(req.query.months ) || 12;
    const period = req.query.period ;
    
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
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve revenue analytics',
        code: 'REVENUE_ANALYTICS_FAILED',
      },
    });
  }
});

export default router;