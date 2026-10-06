 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }







import { logger } from '../logging';

function generateRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Attaches requestId + a correlated child logger to res.locals.
 */
export function requestContext(req, res, next) {
  const requestId =
    (req.headers['x-request-id'] ) || generateRequestId();

  res.locals['requestId'] = requestId;
  res.locals['log'] = logger.child(requestId);

  // Propagate the request ID in the response so clients can correlate errors
  res.setHeader('X-Request-Id', requestId);

  next();
}

/**
 * HTTP request/response access logger.
 * Redacts Authorization headers and cookie values from logs.
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  const log = (_nullishCoalesce(res.locals['log'], () => ( logger))) ;

  // Log on finish so we have the status code
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error'
      : res.statusCode >= 400 ? 'warn'
      : 'info';

    log[level](`${req.method} ${req.originalUrl}`, {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: duration,
      user_id: _nullishCoalesce(_optionalChain([(req ), 'access', _ => _.user, 'optionalAccess', _2 => _2.id]), () => ( null)),
      ip: req.ip,
    });
  });

  next();
}
