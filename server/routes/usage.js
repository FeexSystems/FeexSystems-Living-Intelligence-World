import express from 'express';
import { usageService } from '../lib/services/usage.service.js';
import { requireAuth } from '../lib/middleware/auth.middleware.js';
import { trackBandwidthUsage } from '../lib/middleware/rate-limit.middleware.js';

const router = express.Router();

// Apply authentication and bandwidth tracking to all routes
router.use(requireAuth);
router.use(trackBandwidthUsage());

/**
 * GET /api/usage/current
 * Get current usage metrics for the authenticated user
 */
router.get('/current', async (req, res) => {
  try {
    const userId = req.user.id;
    const period = req.query.period ;
    
    const usage = await usageService.getUserUsage(userId, period);
    
    res.json({
      success: true,
      data: {
        usage,
      },
    });
  } catch (error) {
    console.error('Get current usage error:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve usage data',
        code: 'USAGE_RETRIEVAL_FAILED',
      },
    });
  }
});

/**
 * GET /api/usage/report
 * Get detailed usage report with limits and percentages
 */
router.get('/report', async (req, res) => {
  try {
    const userId = req.user.id;
    const period = req.query.period ;
    
    const report = await usageService.getUserUsageReport(userId, period);
    
    res.json({
      success: true,
      data: {
        report,
      },
    });
  } catch (error) {
    console.error('Get usage report error:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate usage report',
        code: 'USAGE_REPORT_FAILED',
      },
    });
  }
});

/**
 * GET /api/usage/history
 * Get usage history for multiple periods
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
    
    const history = await usageService.getUserUsageHistory(userId, months);
    
    res.json({
      success: true,
      data: {
        history,
        months,
      },
    });
  } catch (error) {
    console.error('Get usage history error:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve usage history',
        code: 'USAGE_HISTORY_FAILED',
      },
    });
  }
});

/**
 * GET /api/usage/check/:action
 * Check if user can perform a specific action
 */
router.get('/check/:action', async (req, res) => {
  try {
    const userId = req.user.id;
    const action = req.params.action ;
    const period = req.query.period ;
    
    if (!['ai_request', 'deployment', 'security_scan'].includes(action)) {
      return res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid action type',
          code: 'INVALID_ACTION_TYPE',
        },
      });
    }
    
    const result = await usageService.canPerformAction(userId, action, period);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Check action error:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check action availability',
        code: 'ACTION_CHECK_FAILED',
      },
    });
  }
});

/**
 * POST /api/usage/increment
 * Manually increment usage (for testing or manual adjustments)
 * Admin only endpoint
 */
router.post('/increment', async (req, res) => {
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

    const { userId, type, amount, storageBytes, bandwidthBytes, period } = req.body;
    
    if (!userId || !type) {
      return res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          message: 'userId and type are required',
          code: 'MISSING_REQUIRED_FIELDS',
        },
      });
    }

    if (!['ai_request', 'deployment', 'security_scan', 'storage', 'bandwidth'].includes(type)) {
      return res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid usage type',
          code: 'INVALID_USAGE_TYPE',
        },
      });
    }

    const increment = {
      userId,
      type,
      amount,
      storageBytes: storageBytes ? BigInt(storageBytes) : undefined,
      bandwidthBytes: bandwidthBytes ? BigInt(bandwidthBytes) : undefined,
      period,
    };

    const result = await usageService.incrementUsage(increment);
    
    res.json({
      success: true,
      data: {
        usage: result,
      },
    });
  } catch (error) {
    console.error('Increment usage error:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to increment usage',
        code: 'USAGE_INCREMENT_FAILED',
      },
    });
  }
});

/**
 * GET /api/usage/admin/aggregated
 * Get aggregated usage statistics for admin dashboard
 * Admin only endpoint
 */
router.get('/admin/aggregated', async (req, res) => {
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

    const period = req.query.period ;
    const aggregated = await usageService.getAggregatedUsage(period);
    
    res.json({
      success: true,
      data: {
        aggregated,
        period: period || new Date().toISOString().slice(0, 7),
      },
    });
  } catch (error) {
    console.error('Get aggregated usage error:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve aggregated usage data',
        code: 'AGGREGATED_USAGE_FAILED',
      },
    });
  }
});

export default router;