 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
import { subscriptionService } from '../services/subscription.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();










/**
 * Middleware to check if user has an active subscription
 */
export const requireActiveSubscription = async (
  req,
  res,
  next
) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
      });
      return;
    }

    const subscription = await subscriptionService.getUserSubscription(req.user.id);

    if (!subscription) {
      res.status(403).json({
        error: {
          type: 'SUBSCRIPTION_ERROR',
          message: 'Active subscription required',
          code: 'SUBSCRIPTION_REQUIRED',
        },
      });
      return;
    }

    // Check if subscription is in a valid state
    const validStatuses = ['ACTIVE', 'TRIALING'];
    if (!validStatuses.includes(subscription.status)) {
      res.status(403).json({
        error: {
          type: 'SUBSCRIPTION_ERROR',
          message: 'Subscription is not active',
          code: 'SUBSCRIPTION_INACTIVE',
          details: { status: subscription.status },
        },
      });
      return;
    }

    // Add subscription info to request for downstream use
    (req ).subscription = subscription;
    next();
  } catch (error) {
    console.error('Subscription middleware error:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify subscription',
        code: 'SUBSCRIPTION_CHECK_FAILED',
      },
    });
  }
};

/**
 * Middleware to check usage limits for specific actions
 */
export const checkUsageLimit = (action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'AUTH_REQUIRED',
          },
        });
        return;
      }

      const canPerform = await subscriptionService.canPerformAction(req.user.id, action);

      if (!canPerform) {
        // Get current usage and limits for detailed error
        const limits = await subscriptionService.getSubscriptionLimits(req.user.id);
        const period = new Date().toISOString().slice(0, 7);
        
        const usage = await prisma.usageMetrics.findUnique({
          where: {
            userId_period: {
              userId: req.user.id,
              period,
            },
          },
        });

        const actionLimitMap = {
          ai_request: { 
            current: _optionalChain([usage, 'optionalAccess', _ => _.aiRequestsCount]) || 0, 
            limit: _optionalChain([limits, 'optionalAccess', _2 => _2.aiRequestsPerMonth]) || 0,
            name: 'AI requests'
          },
          deployment: { 
            current: _optionalChain([usage, 'optionalAccess', _3 => _3.deploymentCount]) || 0, 
            limit: _optionalChain([limits, 'optionalAccess', _4 => _4.deploymentsPerMonth]) || 0,
            name: 'deployments'
          },
          security_scan: { 
            current: _optionalChain([usage, 'optionalAccess', _5 => _5.securityScansCount]) || 0, 
            limit: _optionalChain([limits, 'optionalAccess', _6 => _6.securityScansPerMonth]) || 0,
            name: 'security scans'
          },
        };

        const actionInfo = actionLimitMap[action];

        res.status(429).json({
          error: {
            type: 'RATE_LIMIT_ERROR',
            message: `Monthly ${actionInfo.name} limit exceeded`,
            code: 'USAGE_LIMIT_EXCEEDED',
            details: {
              action,
              current: actionInfo.current,
              limit: actionInfo.limit,
              period,
            },
          },
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Usage limit middleware error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check usage limits',
          code: 'USAGE_CHECK_FAILED',
        },
      });
    }
  };
};

/**
 * Middleware to require specific subscription plan or higher
 */
export const requirePlan = (requiredPlanName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'AUTH_REQUIRED',
          },
        });
        return;
      }

      const subscription = await subscriptionService.getUserSubscription(req.user.id);

      if (!subscription) {
        res.status(403).json({
          error: {
            type: 'SUBSCRIPTION_ERROR',
            message: `${requiredPlanName} plan or higher required`,
            code: 'PLAN_UPGRADE_REQUIRED',
            details: { requiredPlan: requiredPlanName },
          },
        });
        return;
      }

      // Define plan hierarchy (you can adjust this based on your plans)
      const planHierarchy = ['Free', 'Starter', 'Professional', 'Enterprise'];
      const userPlanIndex = planHierarchy.indexOf(subscription.plan.name);
      const requiredPlanIndex = planHierarchy.indexOf(requiredPlanName);

      if (userPlanIndex < requiredPlanIndex) {
        res.status(403).json({
          error: {
            type: 'SUBSCRIPTION_ERROR',
            message: `${requiredPlanName} plan or higher required`,
            code: 'PLAN_UPGRADE_REQUIRED',
            details: {
              currentPlan: subscription.plan.name,
              requiredPlan: requiredPlanName,
            },
          },
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Plan requirement middleware error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify plan requirements',
          code: 'PLAN_CHECK_FAILED',
        },
      });
    }
  };
};

/**
 * Middleware to track usage after successful action
 */
export const trackUsage = (action) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send to track usage on successful responses
    res.send = function(body) {
      // Only track usage for successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        // Track usage asynchronously to not block response
        trackUsageAsync(req.user.id, action).catch(error => {
          console.error('Failed to track usage:', error);
        });
      }

      // Call original send
      return originalSend.call(this, body);
    };

    next();
  };
};

/**
 * Async function to track usage
 */
async function trackUsageAsync(userId, action) {
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM format

  const updateData = {};
  switch (action) {
    case 'ai_request':
      updateData.aiRequestsCount = { increment: 1 };
      break;
    case 'deployment':
      updateData.deploymentCount = { increment: 1 };
      break;
    case 'security_scan':
      updateData.securityScansCount = { increment: 1 };
      break;
  }

  await prisma.usageMetrics.upsert({
    where: {
      userId_period: {
        userId,
        period,
      },
    },
    update: updateData,
    create: {
      userId,
      period,
      ...updateData,
    },
  });
}