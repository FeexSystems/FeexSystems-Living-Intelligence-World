/**
 * API Versioning Middleware
 *
 * Supports /api/v1/* as the canonical versioned prefix.
 * /api/* (unversioned) is maintained for backward compatibility
 * and will be deprecated in a future release.
 */

import { Request, Response, NextFunction } from 'express';

export const API_VERSION = 'v1';

/**
 * Middleware that sets API version headers on all responses.
 */
export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-API-Version', API_VERSION);
  res.setHeader('X-API-Deprecated', req.path.startsWith('/api/') && !req.path.startsWith('/api/v1/') ? 'true' : 'false');
  next();
}

/**
 * Creates a versioned router that mounts the same routes under both
 * /api and /api/v1 for backward compatibility.
 */
export function createVersionedPath(path: string): string[] {
  return [`/api/${path}`, `/api/v1/${path}`];
}
