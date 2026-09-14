 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import * as Sentry from '@sentry/node';


export const initializeSentry = async (app) => {
  const sentryAny = Sentry ;
  // Build default integrations
  const integrations = [];
  if (_optionalChain([sentryAny, 'access', _ => _.Integrations, 'optionalAccess', _2 => _2.Http])) integrations.push(new sentryAny.Integrations.Http({ tracing: true }));
  if (_optionalChain([sentryAny, 'access', _3 => _3.Integrations, 'optionalAccess', _4 => _4.Express])) integrations.push(new sentryAny.Integrations.Express({ app }));

  try {
    const profiling = (await import('@sentry/profiling-node')) ;
    if (profiling && profiling.ProfilingIntegration) {
      integrations.push(new profiling.ProfilingIntegration());
    } else if (profiling && profiling.nodeProfilingIntegration) {
      integrations.push(profiling.nodeProfilingIntegration());
    }
  } catch (err) {
    console.warn('Sentry profiling integration not available:', _optionalChain([err, 'optionalAccess', _5 => _5.message]) || err);
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  if (_optionalChain([sentryAny, 'access', _6 => _6.Handlers, 'optionalAccess', _7 => _7.requestHandler])) {
    app.use(sentryAny.Handlers.requestHandler());
  }
  if (_optionalChain([sentryAny, 'access', _8 => _8.Handlers, 'optionalAccess', _9 => _9.tracingHandler])) {
    app.use(sentryAny.Handlers.tracingHandler());
  }
};

export const setupSentryErrorHandler = (app) => {
  const sentryAny = Sentry ;
  if (typeof sentryAny.setupExpressErrorHandler === 'function') {
    sentryAny.setupExpressErrorHandler(app);
  } else if (_optionalChain([sentryAny, 'access', _10 => _10.Handlers, 'optionalAccess', _11 => _11.errorHandler])) {
    app.use(sentryAny.Handlers.errorHandler());
  }

  // Optional fallthrough error handler
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    // Capture error with additional context
    Sentry.withScope((scope) => {
      scope.setExtra('requestBody', req.body);
      scope.setExtra('requestQuery', req.query);
      scope.setExtra('requestParams', req.params);
      scope.setUser({
        id: _optionalChain([req, 'access', _12 => _12.user, 'optionalAccess', _13 => _13.id]),
        email: _optionalChain([req, 'access', _14 => _14.user, 'optionalAccess', _15 => _15.email]),
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
