
import pkg from '@prisma/client';
const { PrismaClient, UserRole } = pkg;

import { ActivityLogService } from '../services/activity-log.service';

const prisma = new PrismaClient();


// Extend Express Request type to include admin context




























/**
 * Get admin permissions based on role
 */
export const getAdminPermissions = (role) => {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return {
        canViewMetrics: true,
        canViewUsers: true,
        canManageUsers: true,
        canViewSubscriptions: true,
        canManageSubscriptions: true,
        canViewSecurity: true,
        canManageSecurity: true,
        canViewSystem: true,
        canManageSystem: true,
        canViewAuditLogs: true,
        canManageRoles: true,
        canAccessSuperAdmin: true
      };
    case UserRole.ADMIN:
      return {
        canViewMetrics: true,
        canViewUsers: true,
        canManageUsers: false,
        canViewSubscriptions: true,
        canManageSubscriptions: false,
        canViewSecurity: true,
        canManageSecurity: false,
        canViewSystem: true,
        canManageSystem: false,
        canViewAuditLogs: true,
        canManageRoles: false,
        canAccessSuperAdmin: false
      };
    default:
      return {
        canViewMetrics: false,
        canViewUsers: false,
        canManageUsers: false,
        canViewSubscriptions: false,
        canManageSubscriptions: false,
        canViewSecurity: false,
        canManageSecurity: false,
        canViewSystem: false,
        canManageSystem: false,
        canViewAuditLogs: false,
        canManageRoles: false,
        canAccessSuperAdmin: false
      };
  }
};

/**
 * Admin authentication middleware - validates admin role and sets up admin context
 */
export const adminAuthMiddleware = async (
  req,
  res,
  next
) => {
  try {
    // Ensure user is authenticated first
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Get fresh user data if DB is available, otherwise fallback to req.user
    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          role: true,
          emailVerified: true,
          lastLoginAt: true
        }
      });
    } catch {
      // Database not reachable, fallback to authenticated session
    }

    if (!user && req.user) {
      user = {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        emailVerified: req.user.emailVerified,
        lastLoginAt: req.user.lastLoginAt
      };
    }

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Check if user has admin privileges
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      // Log unauthorized access attempt
      try {
        const activityLogService = new ActivityLogService(prisma);
        await activityLogService.logActivity({
          userId: user.id,
          action: 'admin.access_denied',
          resource: 'admin_panel',
          resourceId: 'admin_dashboard',
          metadata: {
            userRole: user.role,
            attemptedPath: req.path,
            userAgent: req.headers['user-agent'],
            ip: req.ip
          }
        });
      } catch {
        // Non-blocking telemetry
      }

      res.status(403).json({
        success: false,
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'Admin privileges required',
          code: 'INSUFFICIENT_PRIVILEGES',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Check email verification for admin access
    if (!user.emailVerified) {
      res.status(403).json({
        success: false,
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'Email verification required for admin access',
          code: 'EMAIL_VERIFICATION_REQUIRED',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Set up admin context
    const permissions = getAdminPermissions(user.role);
    const sessionId = generateAdminSessionId();

    req.adminContext = {
      role: user.role,
      permissions,
      sessionId,
      lastActivity: new Date()
    };

    // Log admin access (non-blocking)
    try {
      const activityLogService = new ActivityLogService(prisma);
      await activityLogService.logActivity({
        userId: user.id,
        action: 'admin.access_granted',
        resource: 'admin_panel',
        resourceId: 'admin_dashboard',
        metadata: {
          userRole: user.role,
          accessPath: req.path,
          sessionId,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      });
    } catch {
      // Non-blocking telemetry
    }

    next();
  } catch (error) {
    console.error('Admin authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Admin authentication failed',
        code: 'ADMIN_AUTH_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Permission-based authorization middleware
 */
export const requireAdminPermission = (permission) => {
  return (req, res, next) => {
    if (!req.adminContext) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Admin authentication required',
          code: 'ADMIN_AUTH_REQUIRED',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (!req.adminContext.permissions[permission]) {
      // Log permission denied
      const activityLogService = new ActivityLogService(prisma);
      activityLogService.logActivity({
        userId: req.user.id,
        action: 'admin.permission_denied',
        resource: 'admin_permission',
        resourceId: permission,
        metadata: {
          userRole: req.adminContext.role,
          requiredPermission: permission,
          attemptedPath: req.path,
          sessionId: req.adminContext.sessionId
        }
      }).catch(console.error);

      res.status(403).json({
        success: false,
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: `Permission denied: ${permission} required`,
          code: 'INSUFFICIENT_PERMISSIONS',
          timestamp: new Date().toISOString(),
          details: {
            requiredPermission: permission,
            userRole: req.adminContext.role
          }
        }
      });
      return;
    }

    next();
  };
};

/**
 * Super admin only middleware
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.adminContext || req.adminContext.role !== UserRole.SUPER_ADMIN) {
    res.status(403).json({
      success: false,
      error: {
        type: 'AUTHORIZATION_ERROR',
        message: 'Super admin privileges required',
        code: 'SUPER_ADMIN_REQUIRED',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  next();
};

/**
 * Admin action auditing middleware
 */
export const auditAdminAction = (action, resourceType) => {
  return async (req, res, next) => {
    // Store original res.json to intercept responses
    const originalJson = res.json;

    res.json = function (body) {
      // Log admin action after response
      if (req.user && req.adminContext) {
        const activityLogService = new ActivityLogService(prisma);
        activityLogService.logActivity({
          userId: req.user.id,
          action: `admin.${action}`,
          resource: resourceType,
          resourceId: req.params.id || 'system',
          metadata: {
            userRole: req.adminContext.role,
            sessionId: req.adminContext.sessionId,
            requestBody: req.body,
            responseStatus: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            path: req.path,
            method: req.method
          }
        }).catch(console.error);
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Admin session management middleware
 */
export const adminSessionMiddleware = async (
  req,
  res,
  next
) => {
  if (req.adminContext) {
    // Update last activity
    req.adminContext.lastActivity = new Date();

    // Check for session timeout (configurable, default 2 hours)
    const sessionTimeout = parseInt(process.env.ADMIN_SESSION_TIMEOUT || '7200000'); // 2 hours in ms
    const now = new Date().getTime();
    const lastActivity = req.adminContext.lastActivity.getTime();

    if (now - lastActivity > sessionTimeout) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Admin session expired',
          code: 'SESSION_EXPIRED',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
  }

  next();
};

/**
 * Rate limiting for admin actions
 */
export const adminRateLimit = (options



) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      next();
      return;
    }

    const key = `admin_${req.user.id}_${req.path}`;
    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Clean up old entries
    for (const [k, v] of requests.entries()) {
      if (v.resetTime < now) {
        requests.delete(k);
      }
    }

    const current = requests.get(key) || { count: 0, resetTime: now + options.windowMs };

    if (current.resetTime < now) {
      current.count = 0;
      current.resetTime = now + options.windowMs;
    }

    current.count++;
    requests.set(key, current);

    if (current.count > options.maxRequests) {
      res.status(429).json({
        success: false,
        error: {
          type: 'RATE_LIMIT_ERROR',
          message: options.message || 'Too many admin requests',
          code: 'ADMIN_RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          details: {
            limit: options.maxRequests,
            windowMs: options.windowMs,
            resetTime: new Date(current.resetTime).toISOString()
          }
        }
      });
      return;
    }

    // Add rate limit headers
    res.set({
      'X-Admin-RateLimit-Limit': options.maxRequests.toString(),
      'X-Admin-RateLimit-Remaining': (options.maxRequests - current.count).toString(),
      'X-Admin-RateLimit-Reset': new Date(current.resetTime).toISOString()
    });

    next();
  };
};

/**
 * Generate admin session ID
 */
function generateAdminSessionId() {
  return `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Admin security headers middleware
 */
export const adminSecurityHeaders = (req, res, next) => {
  // Add security headers for admin panel
  res.set({
    'X-Admin-Panel': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  next();
};

/**
 * Common admin middleware stack
 */
export const adminMiddlewareStack = [
  adminSecurityHeaders,
  adminAuthMiddleware,
  adminSessionMiddleware
];

/**
 * Admin route protection with specific permission
 */
export const protectAdminRoute = (permission, action, resourceType) => {
  const middleware = [
    ...adminMiddlewareStack,
    requireAdminPermission(permission)
  ];

  if (action && resourceType) {
    middleware.push(auditAdminAction(action, resourceType));
  }

  return middleware;
};

/**
 * Super admin route protection
 */
export const protectSuperAdminRoute = (action, resourceType) => {
  const middleware = [
    ...adminMiddlewareStack,
    requireSuperAdmin
  ];

  if (action && resourceType) {
    middleware.push(auditAdminAction(action, resourceType));
  }

  return middleware;
};