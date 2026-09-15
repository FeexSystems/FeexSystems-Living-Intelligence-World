 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

const Sentry = typeof window !== 'undefined' ? (window ).Sentry : undefined;

export const initializeSentry = () => {
  if (Boolean(_optionalChain([import.meta, 'access', _ => _.env, 'optionalAccess', _2 => _2.PROD])) && _optionalChain([Sentry, 'optionalAccess', _3 => _3.init])) {
    try {
      Sentry.init({
        dsn: _optionalChain([(import.meta ), 'access', _4 => _4.env, 'optionalAccess', _5 => _5.VITE_SENTRY_DSN]),
        tracesSampleRate: 1.0,
        enabled: true,
      });
    } catch (e) {
      // Graceful fallback
    }
  }
};

// Higher-order component for error boundaries
export const withErrorBoundary = (Component) => {
  return Component;
};

// Custom error logger
export const logError = (error, context = {}) => {
  try {
    if (_optionalChain([Sentry, 'optionalAccess', _6 => _6.captureException])) {
      _optionalChain([Sentry, 'access', _7 => _7.withScope, 'optionalCall', _8 => _8((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        Sentry.captureException(error);
      })]);
    } else {
      console.error('[Error]:', error);
      if (Object.keys(context).length) {
        console.error('[Error Context]:', context);
      }
    }
  } catch (e2) {
    console.error('[Error]:', error);
  }
};
