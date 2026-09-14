// User validation schemas
export * from './user';

// Authentication validation schemas
export * from './auth';

// Subscription validation schemas
export * from './subscription';

// Common validation utilities
import { z } from 'zod';

// Common validation schemas
export const idSchema = z.string().cuid('Invalid ID format');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(255, 'Query too long'),
  filters: z.record(z.any()).optional(),
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  (data) => data.startDate <= data.endDate,
  {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
  }
);

// File upload validation schema
export const fileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimetype: z.string().min(1, 'MIME type is required'),
  size: z.number().int().positive('File size must be positive'),
  buffer: z.instanceof(Buffer, { message: 'Invalid file buffer' }),
});

// Image upload validation schema
export const imageUploadSchema = fileUploadSchema.extend({
  mimetype: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif'], {
    errorMap: () => ({ message: 'Only JPEG, PNG, WebP, and GIF images are allowed' }),
  }),
  size: z.number().int().max(5 * 1024 * 1024, 'Image size cannot exceed 5MB'),
});

// Environment validation schema
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url('Invalid database URL'),
  REDIS_URL: z.string().url('Invalid Redis URL').optional(),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  EMAIL_FROM: z.string().email('Invalid sender email'),
  EMAIL_SMTP_HOST: z.string().min(1, 'SMTP host is required'),
  EMAIL_SMTP_PORT: z.coerce.number().int().positive().default(587),
  EMAIL_SMTP_USER: z.string().min(1, 'SMTP user is required'),
  EMAIL_SMTP_PASS: z.string().min(1, 'SMTP password is required'),
  STRIPE_SECRET_KEY: z.string().min(1, 'Stripe secret key is required').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'Stripe webhook secret is required').optional(),
  FRONTEND_URL: z.string().url('Invalid frontend URL').default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
});

// API response schemas
export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
  meta: z.object({
    timestamp: z.string(),
    requestId: z.string(),
    pagination: paginationSchema.optional(),
  }).optional(),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    type: z.string(),
    message: z.string(),
    code: z.string(),
    details: z.record(z.any()).optional(),
    timestamp: z.string(),
    requestId: z.string(),
  }),
});

// Webhook validation schema
export const webhookSchema = z.object({
  id: z.string().min(1, 'Webhook ID is required'),
  event: z.string().min(1, 'Event type is required'),
  data: z.record(z.any()),
  timestamp: z.coerce.date(),
  signature: z.string().min(1, 'Signature is required'),
});

// Type exports
 







