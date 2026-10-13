import { z } from 'zod';
import { logger } from '../logging';

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
}).superRefine((env, ctx) => {
  // Mock Auth validation
  if (env.USE_MOCK_AUTH === 'true') {
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
    // Guard against reusing real secrets
    if (env.MOCK_JWT_SECRET && env.MOCK_JWT_SECRET === env.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MOCK_JWT_SECRET'],
        message: 'MOCK_JWT_SECRET must differ from JWT_SECRET',
      });
    }
  }
  
  // Production validation
  if (env.NODE_ENV === 'production') {
    // Mock auth forbidden in production
    if (env.USE_MOCK_AUTH === 'true') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['USE_MOCK_AUTH'],
        message: 'USE_MOCK_AUTH must not be enabled in production',
      });
    }
    
    // Sentry required in production
    if (!env.SENTRY_DSN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SENTRY_DSN'],
        message: 'SENTRY_DSN is required in production',
      });
    }
    
    // encryption key required in production
    if (!env.ENCRYPTION_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ENCRYPTION_KEY'],
        message: 'ENCRYPTION_KEY is required in production for data encryption',
      });
    }
  }
});

/**
 * True only while the Firebase CLI's local *analysis server* loads the bundle
 * to discover trigger exports (`firebase deploy` → "Serving at port 8800").
 * This process is spawned as `node node_modules/firebase-functions/lib/bin/
 * firebase-functions.js <functionsDir>` with FUNCTIONS_CONTROL_API=true and
 * has NO runtime secrets provisioned.
 */
export function isAnalyzerProcess(): boolean {
  // `firebase deploy` shells out to a local analysis server that serves the
  // trigger definitions on port 8800 ("Serving at port 8800" in deploy logs).
  if (process.env.FUNCTIONS_CONTROL_API === 'true') return true;
  if (process.env.FUNCTIONS_MANIFEST_OUTPUT_PATH) return true;
  const entry = process.argv[1] ?? '';
  if (/firebase-functions[\\/]lib[\\/]bin[\\/]firebase-functions/i.test(entry)) return true;
  return false;
}

/**
 * True while the Firebase CLI (or the Functions runtime bootstrap) is merely
 * *analyzing* the codebase to discover exports — not serving traffic. In this
 * phase no runtime secrets (Secret Manager) are provisioned, so hard
 * validation (process.exit / throw) must be deferred to request time.
 */
export function isFunctionsAnalysis(): boolean {
  if (isAnalyzerProcess()) return true;
  if (process.env.FUNCTIONS_EMULATOR === 'true') return true;
  if (process.env.FUNCTION_TARGET) return true;
  if (process.env.K_SERVICE) return true;
  if (process.env.FIREBASE_CONFIG) return true;
  if (process.env.FUNCTIONS_ANALYSIS === 'true') return true;
  if (process.env.X_GOOGLE_ENTRY_POINT) return true;
  return false;
}

export function validateEnv() {
  // During Firebase Functions codebase analysis (`firebase deploy` loads the
  // bundle with no runtime secrets provisioned) validateEnv() must NOT
  // process.exit — analysis would report
  // "Functions codebase could not be analyzed successfully". Defer: skip at
  // import/analysis time, enforce hard at request time (see
  // `requireValidEnv()` / index.ts).
  if (isFunctionsAnalysis()) {
    return null;
  }
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.format();
    logger.error('Invalid environment variables', { errors });
    
    // Print user-friendly error messages
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
    process.exit(1);
  }
  
  // Return parsed env for convenience
  return result.data;
}

/**
 * Strict request-time env check for Firebase Functions. The `api` export is
 * created at import time (analysis-safe, no validation), so the first real
 * request — when Secret Manager env IS provisioned — enforces the schema.
 * Throws (never process.exit) so Cloud Functions surfaces a 500 with the
 * missing-var message in logs instead of killing the instance.
 */
export function requireValidEnv() {
  // Only the CLI analyzer process skips; every real request path (including
  // the emulator) validates so missing vars surface as a 500 with a clear
  // message instead of a silent misconfiguration.
  if (isAnalyzerProcess()) {
    return null;
  }
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => (i.path.length > 0 ? String(i.path[0]) : 'env'))
      .join(', ');
    throw new Error(
      `Invalid environment variables: ${missing}. ` +
        `Provision runtime secrets in Secret Manager (see docs/CI-DEPLOYMENT-SETUP.md §6).`,
    );
  }
  return result.data;
}
