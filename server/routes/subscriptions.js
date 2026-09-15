import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { subscriptionService } from '../lib/services/subscription.service.js';
import { stripeService } from '../lib/services/stripe.service.js';
import { webhookService } from '../lib/services/webhook.service.js';
import { authMiddleware } from '../lib/middleware/auth.middleware.js';
import { requireActiveSubscription } from '../lib/middleware/subscription.middleware.js';
import {
  createSubscriptionRequestSchema,
  updateSubscriptionRequestSchema,
  billingPortalRequestSchema,
  cancelSubscriptionRequestSchema,
} from '../lib/validations/subscription.js';

const prisma = new PrismaClient();

const router = express.Router();

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await subscriptionService.getPlans();

    res.json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch subscription plans',
        code: 'PLANS_FETCH_FAILED',
      },
    });
  }
});

/**
 * GET /api/subscriptions/current
 * Get current user's subscription
 */
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const subscription = await subscriptionService.getUserSubscription(req.user.id);

    res.json({
      success: true,
      data: { subscription },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch subscription',
        code: 'SUBSCRIPTION_FETCH_FAILED',
      },
    });
  }
});

/**
 * POST /api/subscriptions/create
 * Create a new subscription
 */
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const validatedData = createSubscriptionRequestSchema.parse(req.body);

    const result = await subscriptionService.createSubscription({
      userId: req.user.id,
      ...(validatedData ),
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          code: 'VALIDATION_FAILED',
          details: error.errors,
        },
      });
      return;
    }

    if (error instanceof Error) {
      if (error.message.includes('already has an active subscription')) {
        res.status(409).json({
          error: {
            type: 'SUBSCRIPTION_ERROR',
            message: error.message,
            code: 'SUBSCRIPTION_EXISTS',
          },
        });
        return;
      }

      if (error.message.includes('not found')) {
        res.status(404).json({
          error: {
            type: 'SUBSCRIPTION_ERROR',
            message: error.message,
            code: 'RESOURCE_NOT_FOUND',
          },
        });
        return;
      }
    }

    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create subscription',
        code: 'SUBSCRIPTION_CREATE_FAILED',
      },
    });
  }
});

/**
 * PUT /api/subscriptions/:id/update
 * Update an existing subscription (alternative endpoint for clarity)
 */
router.put('/:id/update', authMiddleware, requireActiveSubscription, async (req, res) => {
  // Same logic as PUT /:id but with explicit /update path
  try {
    const subscriptionId = req.params.id;
    const validatedData = updateSubscriptionRequestSchema.parse(req.body);

    // Verify user owns this subscription
    const currentSubscription = await subscriptionService.getUserSubscription(req.user.id);
    if (!currentSubscription || currentSubscription.id !== subscriptionId) {
      res.status(403).json({
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'Not authorized to modify this subscription',
          code: 'SUBSCRIPTION_ACCESS_DENIED',
        },
      });
      return;
    }

    const updatedSubscription = await subscriptionService.updateSubscription({
      subscriptionId,
      ...validatedData,
    });

    res.json({
      success: true,
      data: { subscription: updatedSubscription },
    });
  } catch (error) {
    console.error('Error updating subscription:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          code: 'VALIDATION_FAILED',
          details: error.errors,
        },
      });
      return;
    }

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: {
          type: 'SUBSCRIPTION_ERROR',
          message: error.message,
          code: 'SUBSCRIPTION_NOT_FOUND',
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update subscription',
        code: 'SUBSCRIPTION_UPDATE_FAILED',
      },
    });
  }
});

/**
 * PUT /api/subscriptions/:id
 * Update an existing subscription
 */
router.put('/:id', authMiddleware, requireActiveSubscription, async (req, res) => {
  try {
    const subscriptionId = req.params.id;
    const validatedData = updateSubscriptionRequestSchema.parse(req.body);

    // Verify user owns this subscription
    const currentSubscription = await subscriptionService.getUserSubscription(req.user.id);
    if (!currentSubscription || currentSubscription.id !== subscriptionId) {
      res.status(403).json({
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'Not authorized to modify this subscription',
          code: 'SUBSCRIPTION_ACCESS_DENIED',
        },
      });
      return;
    }

    const updatedSubscription = await subscriptionService.updateSubscription({
      subscriptionId,
      ...validatedData,
    });

    res.json({
      success: true,
      data: { subscription: updatedSubscription },
    });
  } catch (error) {
    console.error('Error updating subscription:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          code: 'VALIDATION_FAILED',
          details: error.errors,
        },
      });
      return;
    }

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: {
          type: 'SUBSCRIPTION_ERROR',
          message: error.message,
          code: 'SUBSCRIPTION_NOT_FOUND',
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update subscription',
        code: 'SUBSCRIPTION_UPDATE_FAILED',
      },
    });
  }
});

/**
 * DELETE /api/subscriptions/:id/cancel
 * Cancel a subscription (alternative endpoint for clarity)
 */
router.delete('/:id/cancel', authMiddleware, requireActiveSubscription, async (req, res) => {
  // Same logic as DELETE /:id but with explicit /cancel path
  try {
    const subscriptionId = req.params.id;
    const { immediate } = cancelSubscriptionRequestSchema.parse(req.query);

    // Verify user owns this subscription
    const currentSubscription = await subscriptionService.getUserSubscription(req.user.id);
    if (!currentSubscription || currentSubscription.id !== subscriptionId) {
      res.status(403).json({
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'Not authorized to cancel this subscription',
          code: 'SUBSCRIPTION_ACCESS_DENIED',
        },
      });
      return;
    }

    const canceledSubscription = await subscriptionService.cancelSubscription(
      subscriptionId,
      immediate
    );

    res.json({
      success: true,
      data: { subscription: canceledSubscription },
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: {
          type: 'SUBSCRIPTION_ERROR',
          message: error.message,
          code: 'SUBSCRIPTION_NOT_FOUND',
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to cancel subscription',
        code: 'SUBSCRIPTION_CANCEL_FAILED',
      },
    });
  }
});

/**
 * DELETE /api/subscriptions/:id
 * Cancel a subscription
 */
router.delete('/:id', authMiddleware, requireActiveSubscription, async (req, res) => {
  try {
    const subscriptionId = req.params.id;
    const { immediate } = cancelSubscriptionRequestSchema.parse(req.query);

    // Verify user owns this subscription
    const currentSubscription = await subscriptionService.getUserSubscription(req.user.id);
    if (!currentSubscription || currentSubscription.id !== subscriptionId) {
      res.status(403).json({
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'Not authorized to cancel this subscription',
          code: 'SUBSCRIPTION_ACCESS_DENIED',
        },
      });
      return;
    }

    const canceledSubscription = await subscriptionService.cancelSubscription(
      subscriptionId,
      immediate
    );

    res.json({
      success: true,
      data: { subscription: canceledSubscription },
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: {
          type: 'SUBSCRIPTION_ERROR',
          message: error.message,
          code: 'SUBSCRIPTION_NOT_FOUND',
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to cancel subscription',
        code: 'SUBSCRIPTION_CANCEL_FAILED',
      },
    });
  }
});

/**
 * GET /api/subscriptions/usage
 * Get current usage and limits
 */
router.get('/usage', authMiddleware, async (req, res) => {
  try {
    const limits = await subscriptionService.getSubscriptionLimits(req.user.id);

    // Get current period usage
    const period = new Date().toISOString().slice(0, 7);
    const usage = await prisma.usageMetrics.findUnique({
      where: {
        userId_period: {
          userId: req.user.id,
          period,
        },
      },
    });

    res.json({
      success: true,
      data: {
        limits,
        usage: usage || {
          aiRequestsCount: 0,
          deploymentCount: 0,
          securityScansCount: 0,
          storageUsed: 0,
          bandwidthUsed: 0,
        },
        period,
      },
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch usage information',
        code: 'USAGE_FETCH_FAILED',
      },
    });
  }
});

/**
 * POST /api/subscriptions/billing-portal
 * Create Stripe billing portal session
 */
router.post('/billing-portal', authMiddleware, requireActiveSubscription, async (req, res) => {
  try {
    // Stripe integration is disabled
    if (!stripeService.isEnabled()) {
      res.status(503).json({
        error: {
          type: 'SERVICE_UNAVAILABLE',
          message: 'Billing portal is currently disabled',
          code: 'BILLING_DISABLED',
        },
      });
      return;
    }

    const subscription = await subscriptionService.getUserSubscription(req.user.id);

    if (!subscription) {
      res.status(400).json({
        error: {
          type: 'SUBSCRIPTION_ERROR',
          message: 'No billing information found',
          code: 'NO_BILLING_INFO',
        },
      });
      return;
    }

    const { returnUrl } = billingPortalRequestSchema.parse(req.body);

    // Stripe is enabled but we don't have the customer ID stored
    // This would work with a full Stripe integration
    res.status(503).json({
      error: {
        type: 'SERVICE_UNAVAILABLE',
        message: 'Billing portal is currently disabled',
        code: 'BILLING_DISABLED',
      },
    });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create billing portal session',
        code: 'BILLING_PORTAL_FAILED',
      },
    });
  }
});

/**
 * GET /api/subscriptions/:id/details
 * Get detailed subscription information
 */
router.get('/:id/details', authMiddleware, async (req, res) => {
  try {
    const subscriptionId = req.params.id;

    // Verify user owns this subscription
    const currentSubscription = await subscriptionService.getUserSubscription(req.user.id);
    if (!currentSubscription || currentSubscription.id !== subscriptionId) {
      res.status(403).json({
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'Not authorized to view this subscription',
          code: 'SUBSCRIPTION_ACCESS_DENIED',
        },
      });
      return;
    }

    // Get usage for current period
    const period = new Date().toISOString().slice(0, 7);
    const usage = await prisma.usageMetrics.findUnique({
      where: {
        userId_period: {
          userId: req.user.id,
          period,
        },
      },
    });

    res.json({
      success: true,
      data: {
        subscription: currentSubscription,
        usage: usage || {
          aiRequestsCount: 0,
          deploymentCount: 0,
          securityScansCount: 0,
          storageUsed: 0,
          bandwidthUsed: 0,
        },
        period,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch subscription details',
        code: 'SUBSCRIPTION_DETAILS_FAILED',
      },
    });
  }
});

/**
 * POST /api/subscriptions/preview-change
 * Preview subscription change without applying it
 */
router.post('/preview-change', authMiddleware, requireActiveSubscription, async (req, res) => {
  try {
    const { planId } = updateSubscriptionRequestSchema.parse(req.body);

    if (!planId) {
      res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Plan ID is required for preview',
          code: 'MISSING_PLAN_ID',
        },
      });
      return;
    }

    const currentSubscription = await subscriptionService.getUserSubscription(req.user.id);
    if (!currentSubscription) {
      res.status(404).json({
        error: {
          type: 'SUBSCRIPTION_ERROR',
          message: 'No active subscription found',
          code: 'SUBSCRIPTION_NOT_FOUND',
        },
      });
      return;
    }

    const newPlan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!newPlan || !newPlan.isActive) {
      res.status(404).json({
        error: {
          type: 'SUBSCRIPTION_ERROR',
          message: 'Plan not found or inactive',
          code: 'PLAN_NOT_FOUND',
        },
      });
      return;
    }

    // Calculate prorated amount (simplified calculation)
    const currentPlan = currentSubscription.plan;
    const daysRemaining = Math.ceil(
      (currentSubscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const daysInPeriod = 30; // Assuming monthly billing
    const proratedCredit = Math.round((currentPlan.price * daysRemaining) / daysInPeriod);
    const proratedCharge = Math.round((newPlan.price * daysRemaining) / daysInPeriod);
    const netAmount = proratedCharge - proratedCredit;

    res.json({
      success: true,
      data: {
        currentPlan: {
          id: currentPlan.id,
          name: currentPlan.name,
          price: currentPlan.price,
        },
        newPlan: {
          id: newPlan.id,
          name: newPlan.name,
          price: newPlan.price,
        },
        proration: {
          daysRemaining,
          proratedCredit,
          proratedCharge,
          netAmount,
          currency: newPlan.currency,
        },
        effectiveDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error previewing subscription change:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to preview subscription change',
        code: 'PREVIEW_FAILED',
      },
    });
  }
});

/**
 * POST /api/subscriptions/webhook
 * Handle Stripe webhooks
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] ;

    if (!signature) {
      res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Missing Stripe signature',
          code: 'MISSING_SIGNATURE',
        },
      });
      return;
    }

    const event = await webhookService.processStripeWebhook(req.body, signature);

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      error: {
        type: 'WEBHOOK_ERROR',
        message: 'Webhook processing failed',
        code: 'WEBHOOK_FAILED',
      },
    });
  }
});

export default router;