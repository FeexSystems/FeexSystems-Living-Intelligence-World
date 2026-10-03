/**
 * Request context middleware — attaches a unique requestId to every inbound
 * request and exposes it on res.locals for downstream use by logging and
 * error handlers. Uses the X-Request-Id header if already set (e.g. by a
 * reverse proxy) so trace IDs are preserved end-to-end.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logging';

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Attaches requestId + a correlated child logger to res.locals.
 */
export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId =
    (req.headers['x-request-id'] as string | undefined) || generateRequestId();

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
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const log = (res.locals['log'] ?? logger) as typeof logger;

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
      user_id: (req as any).user?.id ?? null,
      ip: req.ip,
    });
  });

  next();
}
