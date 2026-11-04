 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// src/config/monitoring.ts
export const monitoringConfig = {
  sentry: {
    // Sample rates for different event types
    tracesSampleRate: Boolean(_optionalChain([import.meta, 'access', _ => _.env, 'optionalAccess', _2 => _2.PROD])) ? 0.1 : 1.0,
    profilesSampleRate: Boolean(_optionalChain([import.meta, 'access', _3 => _3.env, 'optionalAccess', _4 => _4.PROD])) ? 0.1 : 1.0,
    
    // Environments to enable monitoring
    enabledEnvironments: ['production', 'staging'],
    
    // Error filtering
    ignoredErrors: [
      'Network request failed',
      'Failed to fetch',
      'AbortError',
      'ChunkLoadError',
    ],
    
    // Performance thresholds (in milliseconds)
    performance: {
      slowTransaction: 1000,
      verySlowTransaction: 3000,
      timeoutTransaction: 5000,
    },
    
    // Feature monitoring
    features: {
      auth: {
        sampleRate: 1.0,
        errorThreshold: 0.1,
      },
      billing: {
        sampleRate: 1.0,
        errorThreshold: 0.05,
      },
      ai: {
        sampleRate: 0.5,
        errorThreshold: 0.2,
      },
    },
    
    // Alert thresholds
    alerts: {
      errorRate: {
        critical: 0.1,
        warning: 0.05,
      },
      responseTime: {
        critical: 3000,
        warning: 1000,
      },
    },
  },
};
