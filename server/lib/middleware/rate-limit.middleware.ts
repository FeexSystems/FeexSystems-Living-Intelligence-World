import { Request, Response, NextFunction } from 'express';
import { usageService } from '../services/usage.service.js';
import { subscriptionService } from '../services/subscription.service.js';

export interface RateLimitOptions {
  action: 'ai_request' | 'deployment' | 'security_scan';
  skipSuccessfulCheck?: boolean; // Skip checking if action was successful
  customErrorMessage?: string;
}

/**
 * Rate limiting middleware based on subscription tiers
 */
export function rateLimitMiddleware(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user ID from authenticated request
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'AUTH_REQUIRED',
          },
        });
      }

      // Check if user can perform the action
      const canPerform = await usageService.canPerformAction(userId, options.action);

      if (!canPerform.allowed) {
        // Get subscription info for upgrade suggestions
        const subscription = await subscriptionService.getUserSubscription(userId);
        const plans = await subscriptionService.getPlans();

        // Find next tier plan
        const currentPlanIndex = subscription
          ? plans.findIndex(p => p.id === subscription.plan.id)
          : -1;
        const nextPlan = currentPlanIndex < plans.length - 1
          ? plans[currentPlanIndex + 1]
          : null;

        return res.status(429).json({
          error: {
            type: 'RATE_LIMIT_ERROR',
            message: options.customErrorMessage || canPerform.reason || 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            details: {
              action: options.action,
              currentUsage: canPerform.currentUsage,
              limit: canPerform.limit,
              period: new Date().toISOString().slice(0, 7),
              upgradeAvailable: !!nextPlan,
              suggestedPlan: nextPlan ? {
                id: nextPlan.id,
                name: nextPlan.name,
                price: nextPlan.price,
              } : null,
            },
          },
        });
      }

      // Store action info for post-processing
      req.rateLimitAction = options.action;
      req.rateLimitUserId = userId;

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      return res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check rate limits',
          code: 'RATE_LIMIT_CHECK_FAILED',
        },
      });
    }
  };
}

/**
 * Middleware to increment usage after successful action
 * Should be used after the main route handler
 */
export function incrementUsageAfterSuccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json;

    res.json = function (body: any) {
      // Invoke the original responder first so any status assignment performed by
      // the handler (or an enclosing mock) is reflected in res.statusCode.
      const result = originalJson.call(this, body);

      // Express defaults statusCode to 200; treat undefined as success.
      const statusCode = res.statusCode ?? 200;
      if (statusCode >= 200 && statusCode < 300) {
        // Increment usage asynchronously (don't wait for it).
        if (req.rateLimitAction && req.rateLimitUserId) {
          usageService.incrementUsage({
            userId: req.rateLimitUserId,
            type: req.rateLimitAction,
          }).catch(error => {
            console.error('Failed to increment usage:', error);
          });
        }
      }

      return result;
    };

    next();
  };
}

/**
 * Storage usage middleware for file uploads
 */
export function checkStorageLimit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'AUTH_REQUIRED',
          },
        });
      }

      // Get current usage and limits
      const usageReport = await usageService.getUserUsageReport(userId);
      const fileSizeBytes = req.headers['content-length']
        ? parseInt(req.headers['content-length'])
        : 0;

      // Convert to GB for comparison
      const currentStorageGB = Number(usageReport.usage.storageUsed) / (1024 * 1024 * 1024);
      const newFileGB = fileSizeBytes / (1024 * 1024 * 1024);
      const totalAfterUpload = currentStorageGB + newFileGB;

      if (totalAfterUpload > usageReport.limits.storageGB) {
        return res.status(413).json({
          error: {
            type: 'STORAGE_LIMIT_ERROR',
            message: 'Storage limit exceeded',
            code: 'STORAGE_LIMIT_EXCEEDED',
            details: {
              currentUsageGB: currentStorageGB,
              fileSizeGB: newFileGB,
              limitGB: usageReport.limits.storageGB,
              availableGB: usageReport.limits.storageGB - currentStorageGB,
            },
          },
        });
      }

      // Store file size for post-processing
      req.uploadFileSize = BigInt(fileSizeBytes);
      req.rateLimitUserId = userId;

      next();
    } catch (error) {
      console.error('Storage limit middleware error:', error);
      return res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check storage limits',
          code: 'STORAGE_LIMIT_CHECK_FAILED',
        },
      });
    }
  };
}

/**
 * Middleware to increment storage usage after successful upload
 */
export function incrementStorageAfterUpload() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function (body: any) {
      // Invoke the original responder first so any status assignment performed by
      // the handler is reflected in res.statusCode (Express defaults to 200).
      const result = originalJson.call(this, body);
      const statusCode = res.statusCode ?? 200;

      if (statusCode >= 200 && statusCode < 300) {
        // Increment storage usage asynchronously
        if (req.uploadFileSize && req.rateLimitUserId) {
          usageService.incrementUsage({
            userId: req.rateLimitUserId,
            type: 'storage',
            storageBytes: req.uploadFileSize,
          }).catch(error => {
            console.error('Failed to increment storage usage:', error);
          });
        }
      }

      return result;
    };

    next();
  };
}

/**
 * Bandwidth usage middleware for API responses
 */
export function trackBandwidthUsage() {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return next();
    }

    // Track request size
    const requestSize = req.headers['content-length']
      ? parseInt(req.headers['content-length'])
      : 0;

    const originalJson = res.json;
    const originalSend = res.send;

    // Override response methods to track bandwidth
    res.json = function (body: any) {
      const responseSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
      trackBandwidth(userId, requestSize + responseSize);
      return originalJson.call(this, body);
    };

    res.send = function (body: any) {
      const responseSize = Buffer.byteLength(body, 'utf8');
      trackBandwidth(userId, requestSize + responseSize);
      return originalSend.call(this, body);
    };

    next();
  };
}

// Helper function to track bandwidth usage
function trackBandwidth(userId: string, bytes: number) {
  if (bytes > 0) {
    usageService.incrementUsage({
      userId,
      type: 'bandwidth',
      bandwidthBytes: BigInt(bytes),
    }).catch(error => {
      console.error('Failed to increment bandwidth usage:', error);
    });
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      rateLimitAction?: 'ai_request' | 'deployment' | 'security_scan';
      rateLimitUserId?: string;
      uploadFileSize?: bigint;
    }
  }
}

