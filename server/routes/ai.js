 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import express from 'express';

import { authMiddleware } from '../lib/middleware/auth.middleware';

import { hardQueryRateLimiter } from '../lib/middleware/production-security';
import { aiService } from '../lib/services/ai.service';
import { aiAnalyticsService } from '../lib/services/ai-analytics.service';
import { aiRequestSchema } from '../lib/validations/ai';

const router = express.Router();

// Apply authentication to all AI routes
router.use(authMiddleware);

/**
 * GET /api/ai/services
 * Get all available AI services
 */
router.get('/services', async (req, res) => {
  try {
    const services = aiService.getAvailableServices();
    
    res.json({
      success: true,
      data: {
        services,
        total: services.length
      }
    });
  } catch (error) {
    console.error('Error fetching AI services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI services'
    });
  }
});

/**
 * GET /api/ai/services/:category
 * Get AI services by category
 */
router.get('/services/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    // Validate category
    const validCategories = ['chat', 'analysis', 'generation', 'processing'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category. Must be one of: ' + validCategories.join(', ')
      });
    }

    const services = aiService.getServicesByCategory(category);
    
    res.json({
      success: true,
      data: {
        services,
        category,
        total: services.length
      }
    });
  } catch (error) {
    console.error('Error fetching AI services by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI services'
    });
  }
});

/**
 * POST /api/ai/request
 * Submit a new AI request
 */
router.post('/request', 
  hardQueryRateLimiter,
  async (req, res) => {
    try {
      // Validate request body
      const validation = aiRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors
        });
      }

      const { serviceId, input, parameters, priority } = validation.data;
      const userId = req.user.id;

      // Submit the request
      const result = await aiService.submitRequest({
        userId,
        serviceId,
        input,
        parameters,
        priority
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: {
          requestId: result.requestId,
          status: 'pending',
          message: 'Request submitted successfully'
        }
      });

    } catch (error) {
      console.error('Error submitting AI request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit AI request'
      });
    }
  }
);

/**
 * GET /api/ai/request/:id
 * Get AI request status and result
 */
router.get('/request/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await aiService.getRequestStatus(id);

    if (result.error) {
      return res.status(404).json({
        success: false,
        error: result.error
      });
    }

    // Check if request belongs to user
    if (_optionalChain([result, 'access', _ => _.request, 'optionalAccess', _2 => _2.userId]) !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to request'
      });
    }

    res.json({
      success: true,
      data: {
        request: result.request,
        queueStatus: result.queueStatus
      }
    });

  } catch (error) {
    console.error('Error fetching AI request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI request'
    });
  }
});

/**
 * DELETE /api/ai/request/:id
 * Cancel an AI request
 */
router.delete('/request/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await aiService.cancelRequest(id, userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Request cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling AI request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel AI request'
    });
  }
});

/**
 * GET /api/ai/requests
 * Get user's AI requests with pagination
 */
router.get('/requests', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit ) || 20, 100);
    const offset = parseInt(req.query.offset ) || 0;
    const status = req.query.status ;
    const serviceId = req.query.serviceId ;

    const result = await aiService.getUserRequests(userId, {
      limit,
      offset,
      status: status ,
      serviceId
    });

    res.json({
      success: true,
      data: {
        requests: result.requests,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + limit < result.total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user AI requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI requests'
    });
  }
});

/**
 * GET /api/ai/stats
 * Get user's AI usage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const period = (req.query.period ) || 'day';

    // Validate period
    const validPeriods = ['hour', 'day', 'week', 'month'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be one of: ' + validPeriods.join(', ')
      });
    }

    const stats = await aiService.getUserStats(userId, period );

    res.json({
      success: true,
      data: {
        stats,
        period
      }
    });

  } catch (error) {
    console.error('Error fetching AI stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI statistics'
    });
  }
});

/**
 * GET /api/ai/service/:id/test
 * Test AI service availability
 */
router.get('/service/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await aiService.testService(id);

    res.json({
      success: true,
      data: {
        serviceId: id,
        available: result.success,
        error: result.error
      }
    });

  } catch (error) {
    console.error('Error testing AI service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test AI service'
    });
  }
});

// Admin routes (require admin role)
/**
 * GET /api/ai/analytics/usage
 * Get detailed usage analytics for user
 */
router.get('/analytics/usage', async (req, res) => {
  try {
    const userId = req.user.id;
    const period = (req.query.period ) || 'day';

    // Validate period
    const validPeriods = ['hour', 'day', 'week', 'month'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be one of: ' + validPeriods.join(', ')
      });
    }

    const metrics = await aiAnalyticsService.getUserUsageMetrics(userId, period );

    res.json({
      success: true,
      data: { metrics }
    });

  } catch (error) {
    console.error('Error fetching usage analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage analytics'
    });
  }
});

/**
 * GET /api/ai/analytics/cost
 * Get cost analysis for user
 */
router.get('/analytics/cost', async (req, res) => {
  try {
    const userId = req.user.id;
    const period = (req.query.period ) || 'month';

    // Validate period
    const validPeriods = ['week', 'month'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be one of: ' + validPeriods.join(', ')
      });
    }

    const analysis = await aiAnalyticsService.getCostAnalysis(userId, period );

    res.json({
      success: true,
      data: { analysis }
    });

  } catch (error) {
    console.error('Error fetching cost analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cost analysis'
    });
  }
});

/**
 * GET /api/ai/analytics/performance
 * Get performance metrics for user
 */
router.get('/analytics/performance', async (req, res) => {
  try {
    const userId = req.user.id;
    const period = (req.query.period ) || 'day';

    // Validate period
    const validPeriods = ['day', 'week', 'month'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be one of: ' + validPeriods.join(', ')
      });
    }

    const metrics = await aiAnalyticsService.getPerformanceMetrics(userId, period );

    res.json({
      success: true,
      data: { metrics }
    });

  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics'
    });
  }
});

/**
 * POST /api/ai/analytics/budget-alert
 * Create budget alert
 */
router.post('/analytics/budget-alert', async (req, res) => {
  try {
    const userId = req.user.id;
    const { budgetLimit, alertThreshold, period } = req.body;

    // Validate input
    if (!budgetLimit || !alertThreshold || !period) {
      return res.status(400).json({
        success: false,
        error: 'Budget limit, alert threshold, and period are required'
      });
    }

    if (budgetLimit <= 0 || alertThreshold <= 0 || alertThreshold > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid budget limit or alert threshold'
      });
    }

    const validPeriods = ['daily', 'weekly', 'monthly'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be one of: ' + validPeriods.join(', ')
      });
    }

    const alert = await aiAnalyticsService.createBudgetAlert({
      userId,
      budgetLimit,
      alertThreshold,
      period
    });

    res.status(201).json({
      success: true,
      data: { alert }
    });

  } catch (error) {
    console.error('Error creating budget alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create budget alert'
    });
  }
});

/**
 * GET /api/ai/analytics/budget-alerts
 * Get user's budget alerts
 */
router.get('/analytics/budget-alerts', async (req, res) => {
  try {
    const userId = req.user.id;

    const alerts = await aiAnalyticsService.checkBudgetAlerts(userId);

    res.json({
      success: true,
      data: { alerts }
    });

  } catch (error) {
    console.error('Error fetching budget alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch budget alerts'
    });
  }
});

// Admin routes (require admin role)
/**
 * GET /api/ai/admin/queue/stats
 * Get queue statistics (admin only)
 */
router.get('/admin/queue/stats', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const stats = await aiService.getQueueStats();

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Error fetching queue stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue statistics'
    });
  }
});

/**
 * GET /api/ai/admin/analytics/system
 * Get system-wide analytics (admin only)
 */
router.get('/admin/analytics/system', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const period = (req.query.period ) || 'day';

    // Validate period
    const validPeriods = ['day', 'week', 'month'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be one of: ' + validPeriods.join(', ')
      });
    }

    const analytics = await aiAnalyticsService.getSystemAnalytics(period );

    res.json({
      success: true,
      data: { analytics }
    });

  } catch (error) {
    console.error('Error fetching system analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system analytics'
    });
  }
});

export default router;