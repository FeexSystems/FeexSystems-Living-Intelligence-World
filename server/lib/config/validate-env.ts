import { z } from 'zod';
import { logger } from '../logging';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  REDIS_URL: z.string().url(),
  CORS_ORIGIN: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  AI_SERVICE_API_KEY: z.string().optional(),
  AI_SERVICE_URL: z.string().url().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PORT: z.string().optional(),
  // Mock auth is opt-in. When enabled its signing secrets are mandatory — there
  // is no fallback, so a forged "dev" token can never be accepted in prod.
  USE_MOCK_AUTH: z.enum(['true', 'false']).optional(),
  MOCK_JWT_SECRET: z.string().min(16).optional(),
  MOCK_JWT_REFRESH_SECRET: z.string().min(16).optional(),
}).superRefine((env, ctx) => {
  if (env.USE_MOCK_AUTH !== 'true') return;

  if (!env.MOCK_JWT_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MOCK_JWT_SECRET'],
      message: 'MOCK_JWT_SECRET is required when USE_MOCK_AUTH=true',
    });
  }
  if (!env.MOCK_JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MOCK_JWT_REFRESH_SECRET'],
      message: 'MOCK_JWT_REFRESH_SECRET is required when USE_MOCK_AUTH=true',
    });
  }
  // Guard against the historical footgun of reusing the real secrets for mock tokens.
  if (env.MOCK_JWT_SECRET && env.MOCK_JWT_SECRET === env.JWT_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MOCK_JWT_SECRET'],
      message: 'MOCK_JWT_SECRET must differ from JWT_SECRET',
    });
  }
  if (env.NODE_ENV === 'production') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['USE_MOCK_AUTH'],
      message: 'USE_MOCK_AUTH must not be enabled in production',
    });
    
    if (!env.SENTRY_DSN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SENTRY_DSN'],
        message: 'SENTRY_DSN is required in production',
      });
    }
  }
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // eslint-disable-next-line no-console
    logger.error('Invalid environment variables', { errors: result.error.format() });
    process.exit(1);
  }
}
