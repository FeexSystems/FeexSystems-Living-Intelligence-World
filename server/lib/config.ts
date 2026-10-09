/**
 * Environment Configuration with Zod Schema Validation
 *
 * Provides type-safe access to environment variables with validation
 * and default values. All env vars must be defined in the schema.
 */

import { z } from 'zod';
import { logger } from './logging';

const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.string().optional().default('3001'),
  
  // Database
  DATABASE_URL: z.string().url().describe('PostgreSQL connection string'),
  
  // Redis
  REDIS_URL: z.string().url().describe('Redis connection string'),
  
  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  
  // GitHub Integration
  GITHUB_TOKEN: z.string().optional().describe('GitHub personal access token for World Model sync'),
  GITHUB_WEBHOOK_SECRET: z.string().optional().describe('Webhook verification secret'),
  
  // Payment
  PAYSTACK_SECRET_KEY: z.string().optional().describe('Paystack secret key'),
  PAYSTACK_PUBLIC_KEY: z.string().optional().describe('Paystack public key'),
  
  // AI/LLM Services
  AI_SERVICE_API_KEY: z.string().optional(),
  AI_SERVICE_URL: z.string().url().optional(),
  
  // Sentry
  SENTRY_DSN: z.string().url().optional().describe('Sentry DSN for error tracking'),
  
  // CORS
  CORS_ORIGIN: z.string().optional().describe('Comma-separated list of allowed origins'),
  
  // Mock Auth (development only)
  USE_MOCK_AUTH: z.enum(['true', 'false']).optional(),
  MOCK_JWT_SECRET: z.string().min(32).optional(),
  MOCK_JWT_REFRESH_SECRET: z.string().min(32).optional(),
  
  // Encryption
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters').optional(),
  
  // Frontend
  FRONTEND_URL: z.string().url().optional().default('http://localhost:3000'),
  
  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  
  // Feature Flags
  ENABLE_ANALYTICS: z.enum(['true', 'false']).optional().default('true'),
  ENABLE_TELEMETRY: z.enum(['true', 'false']).optional().default('true'),
  
  // Infrastructure
  FUNCTIONS_EMULATOR: z.enum(['true', 'false']).optional(),
  FUNCTION_TARGET: z.string().optional(),
  CLOUD_RUN_SERVICE_NAME: z.string().optional(),
  CLOUD_RUN_REGION: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

// Cached parse result for loadEnv(); kept separate from the exported `env`
// const below to avoid a duplicate declaration in module scope.
let cachedEnv: EnvConfig | null = null;

/**
 * Validate and parse environment variables
 * Returns parsed config or throws error
 */
export function loadEnv(): EnvConfig {
  if (cachedEnv) {
    return cachedEnv;
  }
  
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    const errors = result.error.format();
    logger.error('Environment validation failed', { errors });
    
    console.error('\n❌ Environment Validation Failed\n');
    console.error('Required environment variables are missing or invalid:\n');
    
    // Helper to format error path
    
    // Collect all error messages
    const allIssues: string[] = [];
    function collectIssues(errors: any, prefix: string = '') {
      if (!errors) return;
      for (const key in errors) {
        if (key === '_errors') {
          for (const msg of errors[key]) {
            allIssues.push(`${prefix}${key === '_errors' ? '' : key}: ${msg}`);
          }
        } else {
          collectIssues(errors[key], prefix + (prefix ? '.' : '') + key);
        }
      }
    }
    collectIssues(errors);
    
    for (const issue of allIssues) {
      console.error(`  • ${issue}`);
    }
    
    console.error('\n');
    console.error('📖 See .env.example for configuration template\n');
    process.exit(1);
  }
  
  cachedEnv = result.data;
  return cachedEnv;
}

/**
 * Get environment configuration (lazy loaded)
 * Use this in your code instead of process.env
 */
export const env = loadEnv();

/**
 * Check if a specific environment variable is set
 */
export function hasEnv(key: keyof EnvConfig): boolean {
  return key in process.env;
}

/**
 * Get environment variable (with type safety)
 */
export function getEnv<T extends keyof EnvConfig>(key: T): EnvConfig[T] {
  return env[key];
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return env.NODE_ENV === 'test';
}

/**
 * Get port from environment
 */
export function getPort(): number {
  return parseInt(env.PORT, 10);
}

/**
 * Log environment status (useful for debugging)
 */
export function logEnvironment() {
  logger.info('Environment configuration loaded', {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    corsEnabled: !!env.CORS_ORIGIN,
    sentryEnabled: !!env.SENTRY_DSN,
    mockAuth: env.USE_MOCK_AUTH === 'true',
    features: {
      analytics: env.ENABLE_ANALYTICS === 'true',
      telemetry: env.ENABLE_TELEMETRY === 'true',
    },
  });
}

export default env;
