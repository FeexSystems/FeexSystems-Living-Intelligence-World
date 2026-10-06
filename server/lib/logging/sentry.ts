import * as Sentry from '@sentry/node';
import { Express } from 'express';

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
    }).catch(e => console.warn('Sentry profiling integration not available:', err?.message || err));
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
  app.use((err: any, req: any, res: any, next: any) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    // Capture error with additional context
    Sentry.withScope((scope) => {
      scope.setExtra('requestBody', req.body);
      scope.setExtra('requestQuery', req.query);
      scope.setExtra('requestParams', req.params);
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
