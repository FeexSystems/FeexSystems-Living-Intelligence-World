 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
import { usageService } from '../services/usage.service.js';
import { subscriptionService } from '../services/subscription.service.js';







/**
 * Rate limiting middleware based on subscription tiers
 */
export function rateLimitMiddleware(options) {
  return async (req, res, next) => {
    try {
      // Get user ID from authenticated request
      const userId = _optionalChain([req, 'access', _ => _.user, 'optionalAccess', _2 => _2.id]);
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
  return async (req, res, next) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json;

    res.json = function (body) {
      // Check if response indicates success (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Increment usage asynchronously (don't wait for it)
        if (req.rateLimitAction && req.rateLimitUserId) {
          usageService.incrementUsage({
            userId: req.rateLimitUserId,
            type: req.rateLimitAction,
          }).catch(error => {
            console.error('Failed to increment usage:', error);
          });
        }
      }

      // Call original json method
      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * Storage usage middleware for file uploads
 */
export function checkStorageLimit() {
  return async (req, res, next) => {
    try {
      const userId = _optionalChain([req, 'access', _3 => _3.user, 'optionalAccess', _4 => _4.id]);
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
  return async (req, res, next) => {
    const originalJson = res.json;

    res.json = function (body) {
      // Check if response indicates success
      if (res.statusCode >= 200 && res.statusCode < 300) {
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

      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * Bandwidth usage middleware for API responses
 */
export function trackBandwidthUsage() {
  return (req, res, next) => {
    const userId = _optionalChain([req, 'access', _5 => _5.user, 'optionalAccess', _6 => _6.id]);
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
    res.json = function (body) {
      const responseSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
      trackBandwidth(userId, requestSize + responseSize);
      return originalJson.call(this, body);
    };

    res.send = function (body) {
      const responseSize = Buffer.byteLength(body, 'utf8');
      trackBandwidth(userId, requestSize + responseSize);
      return originalSend.call(this, body);
    };

    next();
  };
}

// Helper function to track bandwidth usage
function trackBandwidth(userId, bytes) {
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










