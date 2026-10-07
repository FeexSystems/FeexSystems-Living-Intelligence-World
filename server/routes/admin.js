 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '../lib/middleware/auth.middleware';
import { logger } from '../lib/logging';
import { checkDatabaseHealth, prisma } from '../lib/database';
import { checkRedisHealth } from '../lib/redis';
import {
  protectAdminRoute,
  protectSuperAdminRoute,
  adminRateLimit,

} from '../lib/middleware/admin.middleware';
import pkg from '@prisma/client';
const { UserRole } = pkg;
import { AdminService } from '../lib/services/admin.service';

const router = express.Router();

const adminService = new AdminService(prisma);

// Apply authentication to all admin routes
router.use(authMiddleware);

// Validation schemas
const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole)
});

const userAnalyticsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  emailVerified: z.coerce.boolean().optional()
});

const auditLogsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  action: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
});

const maintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(500).optional()
});

/**
 * Wraps an async route handler with standard admin error handling.
 * Eliminates repetitive try/catch boilerplate across admin routes.
 * Unlike the marketing asyncHandler (which delegates to next()),
 * this version returns the admin-specific JSON error shape with
 * route-level error codes.
 */
function asyncHandler(
  fn,
  errorConfig
) {
  return (req, res, next) => {
    fn(req, res, next).catch((error) => {
      logger.error(errorConfig.message, {
        error: error instanceof Error ? error.message : String(error)
      });
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: errorConfig.message,
          code: errorConfig.code,
          timestamp: new Date().toISOString()
        }
      });
    });
  };
}

/**
 * GET /api/admin/metrics
 * Get comprehensive dashboard metrics
 */
router.get('/metrics',
  ...protectAdminRoute('canViewMetrics', 'view_metrics', 'dashboard'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 30 }),
  asyncHandler(async (req, res) => {
    const metrics = await adminService.getDashboardMetrics();

    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  }, { message: 'Failed to fetch admin metrics', code: 'METRICS_FETCH_FAILED' })
);

/**
 * GET /api/admin/users
 * Get user analytics and statistics
 */
router.get('/users',
  ...protectAdminRoute('canViewUsers', 'view_users', 'user_analytics'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }),
  asyncHandler(async (req, res) => {
    const validation = userAnalyticsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          code: 'VALIDATION_FAILED',
          details: validation.error.errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    const { page, limit, search, role, emailVerified } = validation.data;
    const filters = { search, role, emailVerified };

    const result = await adminService.getUserAnalytics(page, limit, filters);

    res.json({
      success: true,
      users: result.users,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      },
      analytics: result.analytics,
      timestamp: new Date().toISOString()
    });
  }, { message: 'Failed to fetch user analytics', code: 'USER_ANALYTICS_FAILED' })
);

/**
 * GET /api/admin/subscriptions/metrics
 * Get subscription metrics
 */
router.get('/subscriptions/metrics',
  ...protectAdminRoute('canViewSubscriptions', 'view_subscriptions_metrics', 'subscription_analytics'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }),
  asyncHandler(async (req, res) => {
    const metrics = await adminService.getDashboardMetrics();

    res.json({
      success: true,
      metrics: {
        ...metrics.subscriptionMetrics,
        churnRate: 3.2,
        growthRate: 12.5
      },
      timestamp: new Date().toISOString()
    });
  }, { message: 'Failed to fetch subscription metrics', code: 'SUBSCRIPTION_METRICS_FAILED' })
);

/**
 * GET /api/admin/subscriptions
 * Get subscriptions list
 */
router.get('/subscriptions',
  ...protectAdminRoute('canViewSubscriptions', 'view_subscriptions', 'subscription_analytics'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }),
  asyncHandler(async (req, res) => {
    // Return mock list for now since Stripe integration is pending
    const subscriptions = [
      {
        id: '1',
        userId: 'user1',
        userEmail: 'john.doe@example.com',
        userName: 'John Doe',
        planName: 'Professional',
        status: 'ACTIVE',
        currentPeriodStart: '2024-01-15T00:00:00Z',
        currentPeriodEnd: '2024-02-15T00:00:00Z',
        cancelAtPeriodEnd: false,
        monthlyRevenue: 49.99,
        createdAt: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        userId: 'user2',
        userEmail: 'jane.smith@example.com',
        userName: 'Jane Smith',
        planName: 'Enterprise',
        status: 'ACTIVE',
        currentPeriodStart: '2024-02-01T00:00:00Z',
        currentPeriodEnd: '2024-03-01T00:00:00Z',
        cancelAtPeriodEnd: false,
        monthlyRevenue: 199.99,
        createdAt: '2024-02-01T09:15:00Z'
      },
      {
        id: '3',
        userId: 'user3',
        userEmail: 'mike.wilson@example.com',
        userName: 'Mike Wilson',
        planName: 'Starter',
        status: 'TRIALING',
        currentPeriodStart: '2024-02-10T00:00:00Z',
        currentPeriodEnd: '2024-02-24T00:00:00Z',
        cancelAtPeriodEnd: false,
        trialEnd: '2024-02-24T00:00:00Z',
        monthlyRevenue: 0,
        createdAt: '2024-02-10T14:22:00Z'
      },
      {
        id: '4',
        userId: 'user4',
        userEmail: 'sarah.johnson@example.com',
        userName: 'Sarah Johnson',
        planName: 'Professional',
        status: 'CANCELED',
        currentPeriodStart: '2024-01-20T00:00:00Z',
        currentPeriodEnd: '2024-02-20T00:00:00Z',
        cancelAtPeriodEnd: true,
        monthlyRevenue: 49.99,
        createdAt: '2024-01-20T16:45:00Z'
      }
    ];

    res.json({
      success: true,
      subscriptions,
      pagination: {
        page: 1,
        limit: 20,
        total: subscriptions.length,
        totalPages: 1
      },
      timestamp: new Date().toISOString()
    });
  }, { message: 'Failed to fetch subscriptions', code: 'SUBSCRIPTIONS_FAILED' })
);

/**
 * GET /api/admin/subscriptions/revenue
 * Get revenue trend data
 */
router.get('/subscriptions/revenue',
  ...protectAdminRoute('canViewSubscriptions', 'view_revenue', 'subscription_analytics'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }),
  asyncHandler(async (req, res) => {
    const { period = '30d' } = req.query;

    const revenueData = [
      { period: '2024-01-15', revenue: 42350, subscriptions: 1156, newSubscriptions: 89, canceledSubscriptions: 23 },
      { period: '2024-01-22', revenue: 43120, subscriptions: 1178, newSubscriptions: 67, canceledSubscriptions: 45 },
      { period: '2024-01-29', revenue: 44890, subscriptions: 1203, newSubscriptions: 78, canceledSubscriptions: 53 },
      { period: '2024-02-05', revenue: 45670, subscriptions: 1247, newSubscriptions: 92, canceledSubscriptions: 48 }
    ];

    res.json({
      success: true,
      revenueData,
      period,
      timestamp: new Date().toISOString()
    });
  }, { message: 'Failed to fetch revenue data', code: 'REVENUE_FAILED' })
);

/**
 * GET /api/admin/usage
 * Get system usage analytics
 */
router.get('/usage',
  ...protectAdminRoute('canViewMetrics', 'view_usage', 'usage_analytics'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }),
  asyncHandler(async (req, res) => {
    const metrics = await adminService.getDashboardMetrics();

    res.json({
      success: true,
      usageMetrics: metrics.usageMetrics,
      timestamp: new Date().toISOString()
    });
  }, { message: 'Failed to fetch usage analytics', code: 'USAGE_ANALYTICS_FAILED' })
);

/**
 * PUT /api/admin/users/:id/role
 * Update user role (requires manage users permission)
 */
router.put('/users/:id/role',
  ...protectAdminRoute('canManageUsers', 'update_user_role', 'user'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 5 }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validation = updateUserRoleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid role specified',
          code: 'VALIDATION_FAILED',
          details: validation.error.errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    const { role } = validation.data;
    const result = await adminService.updateUserRole(req.user.id, id, role);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'BUSINESS_LOGIC_ERROR',
          message: result.error,
          code: 'ROLE_UPDATE_FAILED',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      user: result.user,
      message: 'User role updated successfully',
      timestamp: new Date().toISOString()
    });
  }, { message: 'Failed to update user role', code: 'ROLE_UPDATE_ERROR' })
);

/**
 * DELETE /api/admin/users/:id
 * Delete a user (requires manage users permission)
 */
router.delete('/users/:id',
  ...protectAdminRoute('canManageUsers', 'delete_user', 'user'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 5 }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await adminService.deleteUser(req.user.id, id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'BUSINESS_LOGIC_ERROR',
          message: result.error,
          code: 'USER_DELETION_FAILED',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      timestamp: new Date().toISOString()
    });
  }, { message: 'Failed to delete user', code: 'USER_DELETION_ERROR' })
);

/**
 * GET /api/admin/security
 * Get security analytics and reports
 */
router.get('/security',
  ...protectAdminRoute('canViewSecurity', 'view_security', 'security_analytics'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }),
  asyncHandler(async (req, res) => {
    const securityReport = await adminService.getSecurityReport();

    res.json({
      success: true,
      report: securityReport,
      timestamp: new Date().toISOString()
    });
  }, { message: 'Failed to fetch security analytics', code: 'SECURITY_ANALYTICS_FAILED' })
);

/**
 * GET /api/admin/audit-logs
 * Get admin audit logs
 */
router.get('/audit-logs',
  ...protectAdminRoute('canViewAuditLogs', 'view_audit_logs', 'audit_logs'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }),
  asyncHandler(async (req, res) => {
    const validation = auditLogsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          code: 'VALIDATION_FAILED',
          details: validation.error.errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    const { page, limit, action, userId, startDate, endDate } = validation.data;
    const filters = { action, userId, startDate, endDate };

    const result = await adminService.getAdminAuditLogs(page, limit, filters);

    // Map to frontend expected format
    const mappedLogs = result.logs.map(log => {
      const metadata = log.metadata ;
      return {
        id: log.id,
        userId: _optionalChain([log, 'access', _ => _.user, 'optionalAccess', _2 => _2.id]) || 'unknown',
        userEmail: _optionalChain([log, 'access', _3 => _3.user, 'optionalAccess', _4 => _4.email]) || 'unknown',
        userName: log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email : 'Unknown User',
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        metadata: log.metadata,
        timestamp: log.timestamp.toISOString(),
        success: _optionalChain([metadata, 'optionalAccess', _5 => _5.success]) !== false, // default true unless explicitly false
        severity: 'LOW' // Or derive from action
      };
    });

    res.json({
      success: true,
      logs: mappedLogs,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      },
      timestamp: new Date().toISOString()
    });
  }, { message: 'Failed to fetch audit logs', code: 'AUDIT_LOGS_FAILED' })
);

/**
 * GET /api/admin/audit-logs/stats
 * Get admin audit logs statistics
 */
router.get('/audit-logs/stats',
  ...protectAdminRoute('canViewAuditLogs', 'view_audit_logs_stats', 'audit_logs'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }),
  asyncHandler(async (req, res) => {
    // Create a basic summary for the frontend
    // Ideally this would be computed by AdminService, but doing simple mock stats for now
    const stats = {
      totalLogs: 15420,
      todayLogs: 234,
      successfulActions: 14567,
      failedActions: 853,
      topActions: [
        { action: 'USER_LOGIN', count: 3456 },
        { action: 'API_REQUEST', count: 2890 },
        { action: 'DATA_ACCESS', count: 1234 },
        { action: 'SUBSCRIPTION_UPDATED', count: 567 },
        { action: 'SECURITY_SCAN_INITIATED', count: 234 }
      ],
      topUsers: [
        { userId: 'user1', userEmail: 'john.doe@example.com', count: 456 },
        { userId: 'user2', userEmail: 'jane.smith@example.com', count: 234 },
        { userId: 'admin1', userEmail: 'admin@example.com', count: 189 }
      ]
    };

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  }, { message: 'Failed to fetch audit log stats', code: 'AUDIT_LOGS_STATS_FAILED' })
);

/**
 * GET /api/admin/permissions
 * Get current admin user's permissions
 */
router.get('/permissions',
  ...protectAdminRoute('canViewMetrics'),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      permissions: req.adminContext.permissions,
      role: req.adminContext.role,
      timestamp: new Date().toISOString()
    });
  }, { message: 'Failed to fetch permissions', code: 'PERMISSIONS_FETCH_FAILED' })
);

/**
 * GET /api/admin/system/health
 * Get detailed system health information
 */
router.get('/system/health',
  ...protectAdminRoute('canViewSystem', 'view_system_health', 'system_health'),
  adminRateLimit({ windowMs: 30 * 1000, maxRequests: 10 }),
  asyncHandler(async (req, res) => {
    const metrics = await adminService.getDashboardMetrics();

    res.json({
      success: true,
      systemHealth: metrics.systemHealth,
      timestamp: new Date().toISOString()
    });
  }, { message: 'Failed to check system health', code: 'SYSTEM_HEALTH_CHECK_FAILED' })
);

/**
 * POST /api/admin/system/maintenance
 * Toggle system maintenance mode (Super Admin only)
 */
router.post('/system/maintenance',
  ...protectSuperAdminRoute('toggle_maintenance', 'system_maintenance'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 5 }),
  asyncHandler(async (req, res) => {
    const validation = maintenanceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid maintenance parameters',
          code: 'VALIDATION_FAILED',
          details: validation.error.errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    const { enabled, message } = validation.data;

    // This would typically update a system-wide maintenance flag
    // For now, we'll just log the action
    logger.info('Maintenance mode toggled', { enabled, userId: req.user.id });

    res.json({
      success: true,
      maintenanceMode: {
        enabled,
        message: message || 'System maintenance in progress',
        enabledBy: req.user.id,
        enabledAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }, { message: 'Failed to toggle maintenance mode', code: 'MAINTENANCE_TOGGLE_FAILED' })
);

/**
 * GET /api/admin/system-health
 * Full system health data for the admin health dashboard.
 * Combines process metrics + DB/Redis status.
 */
router.get('/system-health',
  ...protectAdminRoute('canViewSystem', 'view_system_health', 'system'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 30 }),
  asyncHandler(async (req, res) => {
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    const mem = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const eventLoopLag = await new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => resolve(Date.now() - start));
    });

    const overallStatus =
      dbHealth.status === 'healthy' && redisHealth.status === 'healthy'
        ? 'healthy'
        : 'degraded';

    res.json({
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      process: {
        uptime_seconds: Math.round(process.uptime()),
        node_version: process.version,
        pid: process.pid,
        memory: {
          rss_mb: +(mem.rss / 1024 / 1024).toFixed(2),
          heap_used_mb: +(mem.heapUsed / 1024 / 1024).toFixed(2),
          heap_total_mb: +(mem.heapTotal / 1024 / 1024).toFixed(2),
        },
        cpu: {
          user_ms: Math.round(cpuUsage.user / 1000),
          system_ms: Math.round(cpuUsage.system / 1000),
        },
        event_loop_lag_ms: eventLoopLag,
      },
      services: {
        database: dbHealth,
        redis: redisHealth,
      },
    });
  }, { message: 'Failed to fetch system health', code: 'SYSTEM_HEALTH_FAILED' })
);

/**
 * GET /api/admin/slow-queries
 * Get query performance data from pg_stat_statements
 */
router.get('/slow-queries',
  ...protectAdminRoute('canViewSystem', 'view_slow_queries', 'system'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }),
  // Custom error handling: distinguishes "extension not enabled" from other errors
  async (req, res) => {
    try {
      // Query pg_stat_statements for top 50 slowest queries by total execution time
      const slowQueries = await prisma.$queryRaw`
        SELECT
          query,
          calls,
          round(total_exec_time::numeric, 2) as total_exec_time_ms,
          round(mean_exec_time::numeric, 2) as mean_exec_time_ms,
          round(max_exec_time::numeric, 2) as max_exec_time_ms,
          rows
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY total_exec_time DESC
        LIMIT 50;
      `;

      res.json({
        success: true,
        queries: slowQueries,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to fetch slow queries', { error });

      const message = error instanceof Error ? error.message : String(error);
      // Handle case where pg_stat_statements is not enabled
      const isNotEnabled = message.includes('does not exist');

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: isNotEnabled
            ? 'pg_stat_statements is not enabled on this database. Please enable it to view slow queries.'
            : 'Failed to fetch slow query statistics',
          code: isNotEnabled ? 'EXTENSION_NOT_ENABLED' : 'SLOW_QUERIES_FETCH_FAILED',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

export default router;
