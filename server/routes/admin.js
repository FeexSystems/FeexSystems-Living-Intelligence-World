import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '../lib/middleware/auth.middleware';
import {
  protectAdminRoute,
  protectSuperAdminRoute,
  adminRateLimit,

} from '../lib/middleware/admin.middleware';
import pkg from '@prisma/client';
const { PrismaClient, UserRole } = pkg;
import { AdminService } from '../lib/services/admin.service';

const router = express.Router();
const prisma = new PrismaClient();

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

/**
 * GET /api/admin/metrics
 * Get comprehensive dashboard metrics
 */
router.get('/metrics',
  ...protectAdminRoute('canViewMetrics', 'view_metrics', 'dashboard'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 30 }),
  async (req, res) => {
    try {
      const metrics = await adminService.getDashboardMetrics();

      res.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch admin metrics',
          code: 'METRICS_FETCH_FAILED',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * GET /api/admin/users
 * Get user analytics and statistics
 */
router.get('/users',
  ...protectAdminRoute('canViewUsers', 'view_users', 'user_analytics'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }),
  async (req, res) => {
    try {
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
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user analytics',
          code: 'USER_ANALYTICS_FAILED',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * GET /api/admin/subscriptions
 * Get subscription and revenue analytics
 */
router.get('/subscriptions',
  ...protectAdminRoute('canViewSubscriptions', 'view_subscriptions', 'subscription_analytics'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }),
  async (req, res) => {
    try {
      // This endpoint is included in the main metrics, but can be expanded for detailed subscription analytics
      const metrics = await adminService.getDashboardMetrics();

      res.json({
        success: true,
        subscriptionMetrics: metrics.subscriptionMetrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching subscription analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch subscription analytics',
          code: 'SUBSCRIPTION_ANALYTICS_FAILED',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * GET /api/admin/usage
 * Get system usage analytics
 */
router.get('/usage',
  ...protectAdminRoute('canViewMetrics', 'view_usage', 'usage_analytics'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }),
  async (req, res) => {
    try {
      const metrics = await adminService.getDashboardMetrics();

      res.json({
        success: true,
        usageMetrics: metrics.usageMetrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching usage analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch usage analytics',
          code: 'USAGE_ANALYTICS_FAILED',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * PUT /api/admin/users/:id/role
 * Update user role (requires manage users permission)
 */
router.put('/users/:id/role',
  ...protectAdminRoute('canManageUsers', 'update_user_role', 'user'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 5 }),
  async (req, res) => {
    try {
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
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user role',
          code: 'ROLE_UPDATE_ERROR',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * GET /api/admin/security
 * Get security analytics and reports
 */
router.get('/security',
  ...protectAdminRoute('canViewSecurity', 'view_security', 'security_analytics'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }),
  async (req, res) => {
    try {
      const securityReport = await adminService.getSecurityReport();

      res.json({
        success: true,
        report: securityReport,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching security analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch security analytics',
          code: 'SECURITY_ANALYTICS_FAILED',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * GET /api/admin/audit-logs
 * Get admin audit logs
 */
router.get('/audit-logs',
  ...protectAdminRoute('canViewAuditLogs', 'view_audit_logs', 'audit_logs'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 20 }),
  async (req, res) => {
    try {
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

      res.json({
        success: true,
        logs: result.logs,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit)
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch audit logs',
          code: 'AUDIT_LOGS_FAILED',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * GET /api/admin/permissions
 * Get current admin user's permissions
 */
router.get('/permissions',
  ...protectAdminRoute('canViewMetrics'),
  async (req, res) => {
    try {
      res.json({
        success: true,
        permissions: req.adminContext.permissions,
        role: req.adminContext.role,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching admin permissions:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch permissions',
          code: 'PERMISSIONS_FETCH_FAILED',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * GET /api/admin/system/health
 * Get detailed system health information
 */
router.get('/system/health',
  ...protectAdminRoute('canViewSystem', 'view_system_health', 'system_health'),
  adminRateLimit({ windowMs: 30 * 1000, maxRequests: 10 }),
  async (req, res) => {
    try {
      const metrics = await adminService.getDashboardMetrics();

      res.json({
        success: true,
        systemHealth: metrics.systemHealth,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking system health:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check system health',
          code: 'SYSTEM_HEALTH_CHECK_FAILED',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * POST /api/admin/system/maintenance
 * Toggle system maintenance mode (Super Admin only)
 */
router.post('/system/maintenance',
  ...protectSuperAdminRoute('toggle_maintenance', 'system_maintenance'),
  adminRateLimit({ windowMs: 60 * 1000, maxRequests: 5 }),
  async (req, res) => {
    try {
      const { enabled, message } = req.body;

      // This would typically update a system-wide maintenance flag
      // For now, we'll just log the action
      console.log(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} by admin ${req.user.id}`);

      res.json({
        success: true,
        maintenanceMode: {
          enabled: Boolean(enabled),
          message: message || 'System maintenance in progress',
          enabledBy: req.user.id,
          enabledAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to toggle maintenance mode',
          code: 'MAINTENANCE_TOGGLE_FAILED',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

export default router; 