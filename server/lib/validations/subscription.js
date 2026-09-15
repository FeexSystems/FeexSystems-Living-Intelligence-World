import { z } from 'zod';

// Plan validation schemas
export const planSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().nullable(),
  stripePriceId: z.string().min(1, 'Stripe price ID is required'),
  stripeProductId: z.string().min(1, 'Stripe product ID is required'),
  price: z.number().int().min(0, 'Price must be non-negative'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  interval: z.enum(['month', 'year'], {
    errorMap: () => ({ message: 'Interval must be month or year' }),
  }),
  intervalCount: z.number().int().min(1, 'Interval count must be at least 1'),
  trialPeriodDays: z.number().int().min(0).max(365).nullable(),
  features: z.record(z.any()),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Subscription validation schemas
export const subscriptionSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  planId: z.string().cuid(),
  status: z.enum([
    'ACTIVE',
    'CANCELED',
    'INCOMPLETE',
    'INCOMPLETE_EXPIRED',
    'PAST_DUE',
    'TRIALING',
    'UNPAID',
    'PAUSED',
  ]),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAtPeriodEnd: z.boolean(),
  stripeSubscriptionId: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  trialStart: z.date().nullable(),
  trialEnd: z.date().nullable(),
  canceledAt: z.date().nullable(),
  endedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Request validation schemas
export const createSubscriptionRequestSchema = z.object({
  planId: z.string().cuid('Invalid plan ID format'),
  paymentMethodId: z.string().optional(),
  trialPeriodDays: z
    .number()
    .int()
    .min(0, 'Trial period must be non-negative')
    .max(365, 'Trial period cannot exceed 365 days')
    .optional(),
});

export const updateSubscriptionRequestSchema = z.object({
  planId: z.string().cuid('Invalid plan ID format').optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

export const cancelSubscriptionRequestSchema = z.object({
  immediate: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .pipe(z.boolean()),
});

// Usage metrics validation schemas
export const usageMetricsSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format'),
  aiRequestsCount: z.number().int().min(0),
  deploymentCount: z.number().int().min(0),
  securityScansCount: z.number().int().min(0),
  storageUsed: z.bigint().min(0n),
  bandwidthUsed: z.bigint().min(0n),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Billing portal request schema
export const billingPortalRequestSchema = z.object({
  returnUrl: z
    .string()
    .url('Return URL must be a valid URL')
    .optional()
    .default(process.env.FRONTEND_URL + '/dashboard/billing'),
});

// Webhook validation schemas
export const stripeWebhookEventSchema = z.object({
  id: z.string().cuid(),
  stripeEventId: z.string().min(1, 'Stripe event ID is required'),
  eventType: z.string().min(1, 'Event type is required'),
  processed: z.boolean(),
  data: z.record(z.any()),
  createdAt: z.date(),
  processedAt: z.date().nullable(),
});

// Feature limits validation
export const featureLimitsSchema = z.object({
  aiRequestsPerMonth: z.number().int().min(0).optional(),
  deploymentsPerMonth: z.number().int().min(0).optional(),
  securityScansPerMonth: z.number().int().min(0).optional(),
  storageGB: z.number().min(0).optional(),
  bandwidthGB: z.number().min(0).optional(),
  teamMembers: z.number().int().min(1).optional(),
  customIntegrations: z.boolean().optional(),
  prioritySupport: z.boolean().optional(),
  advancedAnalytics: z.boolean().optional(),
  whiteLabeling: z.boolean().optional(),
});

// Usage action validation
export const usageActionSchema = z.enum(['ai_request', 'deployment', 'security_scan'], {
  errorMap: () => ({ message: 'Invalid usage action type' }),
});

// Period validation
export const periodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format')
  .refine((period) => {
    const [year, month] = period.split('-').map(Number);
    return year >= 2020 && year <= 2030 && month >= 1 && month <= 12;
  }, 'Period must be a valid year-month combination');

// Export types
 









