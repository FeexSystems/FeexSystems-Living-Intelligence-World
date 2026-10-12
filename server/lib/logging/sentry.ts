import * as Sentry from '@sentry/node';
import { Express } from 'express';

/**
 * Recursively redact secret-bearing fields before they leave the process.
 * Covers passwords, tokens, API keys, connection strings, and cookies —
 * anything that must never reach Sentry, stdout, or a persisted error log.
 */
const SENSITIVE_KEY_PATTERN =
  /passw|passwd|secret|token|api[-_]?key|auth|credential|private[-_]?key|client[-_]?secret|session|cookie|database[-_]?url|redis[-_]?url|dsn|webhook/i;

export function scrubSensitive<T>(value: T, depth = 0): T {
  if (value === null || value === undefined || depth > 6) return value;
  if (Array.isArray(value)) {
    return value.map((item) => scrubSensitive(item, depth + 1)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? '[REDACTED]'
        : scrubSensitive(val, depth + 1);
    }
    return out as T;
  }
  if (typeof value === 'string' && depth > 0) {
    // Catch embedded credentials (connection strings, bearer tokens, private keys).
    if (
      /postgres(ql)?:\/\/[^/\s]*:[^@/\s]*@/i.test(value) ||
      /redis:\/\/[^/\s]*:[^@/\s]*@/i.test(value) ||
      /bearer\s+[A-Za-z0-9\-._~+/=]{8,}/i.test(value) ||
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)
    ) {
      return '[REDACTED]' as unknown as T;
    }
  }
  return value;
}

export const initializeSentry = async (app: Express) => {
  const sentryAny = Sentry as any;
  // Build default integrations
  const integrations: any[] = [];
  if (sentryAny.Integrations?.Http) integrations.push(new sentryAny.Integrations.Http({ tracing: true }));
  if (sentryAny.Integrations?.Express) integrations.push(new sentryAny.Integrations.Express({ app }));

  try {
    const profiling = (await import('@sentry/profiling-node')) as any;
    if (profiling && profiling.ProfilingIntegration) {
      integrations.push(new profiling.ProfilingIntegration());
    } else if (profiling && profiling.nodeProfilingIntegration) {
      integrations.push(profiling.nodeProfilingIntegration());
    }
  } catch (err: any) {
    import('../logging').then(({ logger }) => {
      logger.warn('Sentry profiling integration not available:', err?.message || err);
    }).catch(_e => console.warn('Sentry profiling integration not available:', err?.message || err));
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  if (sentryAny.Handlers?.requestHandler) {
    app.use(sentryAny.Handlers.requestHandler());
  }
  if (sentryAny.Handlers?.tracingHandler) {
    app.use(sentryAny.Handlers.tracingHandler());
  }
};

export const setupSentryErrorHandler = (app: Express) => {
  const sentryAny = Sentry as any;
  if (typeof sentryAny.setupExpressErrorHandler === 'function') {
    sentryAny.setupExpressErrorHandler(app);
  } else if (sentryAny.Handlers?.errorHandler) {
    app.use(sentryAny.Handlers.errorHandler());
  }

  // Optional fallthrough error handler
  app.use((err: any, req: any, res: any, _next: any) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    // Capture error with additional context.
    // NEVER ship raw request bodies to Sentry — auth routes carry passwords,
    // tokens, and API keys. Scrub sensitive fields before capture.
    Sentry.withScope((scope) => {
      scope.setExtra('requestBody', scrubSensitive(req.body));
      scope.setExtra('requestQuery', scrubSensitive(req.query));
      scope.setExtra('requestParams', scrubSensitive(req.params));
      scope.setUser({
        id: req.user?.id,
        email: req.user?.email,
      });
      Sentry.captureException(err);
    });

    res.status(status).json({
      error: {
        message,
        status,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      }
    });
  });
};
