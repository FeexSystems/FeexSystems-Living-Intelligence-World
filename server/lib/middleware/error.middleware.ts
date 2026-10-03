import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { logger } from '../logging';

// ─────────────────────────────────────────────────────────────────
// Error taxonomy
// ─────────────────────────────────────────────────────────────────

export enum ErrorType {
  VALIDATION_ERROR     = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR  = 'AUTHORIZATION_ERROR',
  RATE_LIMIT_ERROR     = 'RATE_LIMIT_ERROR',
  SERVICE_UNAVAILABLE  = 'SERVICE_UNAVAILABLE',
  PAYMENT_ERROR        = 'PAYMENT_ERROR',
  EXTERNAL_API_ERROR   = 'EXTERNAL_API_ERROR',
  INTERNAL_SERVER_ERROR= 'INTERNAL_SERVER_ERROR',
  NOT_FOUND_ERROR      = 'NOT_FOUND_ERROR',
}

export interface ApiError {
  type: ErrorType;
  message: string;
  code: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

// ─────────────────────────────────────────────────────────────────
// Typed application error class for explicit throws
// ─────────────────────────────────────────────────────────────────

export class AppError extends Error {
  readonly type: ErrorType;
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    type: ErrorType,
    message: string,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.statusCode = getStatusCode(type);
    this.details = details;
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function getStatusCode(errorType: ErrorType): number {
  const map: Record<ErrorType, number> = {
    [ErrorType.VALIDATION_ERROR]:      400,
    [ErrorType.AUTHENTICATION_ERROR]:  401,
    [ErrorType.AUTHORIZATION_ERROR]:   403,
    [ErrorType.RATE_LIMIT_ERROR]:      429,
    [ErrorType.PAYMENT_ERROR]:         402,
    [ErrorType.NOT_FOUND_ERROR]:       404,
    [ErrorType.EXTERNAL_API_ERROR]:    502,
    [ErrorType.SERVICE_UNAVAILABLE]:   503,
    [ErrorType.INTERNAL_SERVER_ERROR]: 500,
  };
  return map[errorType] ?? 500;
}

/**
 * Persists an error to the `error_logs` table.
 *
 * Fire-and-forget by design: the database module is imported lazily and every
 * failure is swallowed so error reporting can never hang or break a response
 * (Non-Blocking Infrastructure Initialization invariant).
 */
function persistErrorLog(entry: {
  type: string;
  message: string;
  stack?: string;
  endpoint?: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  severity: 'error' | 'warning' | 'critical';
}): void {
  void (async () => {
    try {
      const { prisma } = await import('../database');
      await prisma.errorLog.create({
        data: {
          type: entry.type,
          message: entry.message.slice(0, 2000),
          stack: entry.stack?.slice(0, 8000),
          endpoint: entry.endpoint,
          userId: entry.userId ?? null,
          metadata: entry.metadata as object | undefined,
          severity: entry.severity,
        },
      });
    } catch (persistError) {
      logger.debug('[ErrorHandler] Failed to persist error log', {
        reason: persistError instanceof Error ? persistError.message : String(persistError),
      });
    }
  })();
}

function transformError(error: unknown, requestId: string): ApiError {
  const timestamp = new Date().toISOString();

  // Zod validation errors
  if (error instanceof ZodError) {
    return {
      type: ErrorType.VALIDATION_ERROR,
      message: 'Request validation failed',
      code: 'VALIDATION_FAILED',
      details: { issues: error.errors },
      timestamp,
      requestId,
    };
  }

  // Prisma known request errors
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return {
        type: ErrorType.VALIDATION_ERROR,
        message: 'A record with that value already exists',
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        details: { fields: error.meta?.target as string[] },
        timestamp,
        requestId,
      };
    }
    if (error.code === 'P2025') {
      return {
        type: ErrorType.NOT_FOUND_ERROR,
        message: 'Record not found',
        code: 'RECORD_NOT_FOUND',
        timestamp,
        requestId,
      };
    }
  }

  // Typed AppError
  if (error instanceof AppError) {
    return {
      type: error.type,
      message: error.message,
      code: error.code,
      details: error.details,
      timestamp,
      requestId,
    };
  }

  // Legacy AuthError (name-based duck typing)
  if (error instanceof Error && error.name === 'AuthError') {
    return {
      type: ErrorType.AUTHENTICATION_ERROR,
      message: error.message,
      code: (error as any).code ?? 'AUTH_ERROR',
      timestamp,
      requestId,
    };
  }

  // Generic Error — hide internals in production
  if (error instanceof Error) {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      type: ErrorType.INTERNAL_SERVER_ERROR,
      message: isProd ? 'An unexpected error occurred' : error.message,
      code: 'INTERNAL_ERROR',
      timestamp,
      requestId,
    };
  }

  return {
    type: ErrorType.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    timestamp,
    requestId,
  };
}

// ─────────────────────────────────────────────────────────────────
// Global error handler — must have 4 params for Express to recognise it
// ─────────────────────────────────────────────────────────────────

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const requestId = (res?.locals?.['requestId'] as string | undefined) ?? 'unknown';
  const log = (res?.locals?.['log'] ?? logger) as typeof logger;

  const apiError = transformError(error, requestId);
  const statusCode = getStatusCode(apiError.type);

  // Structured log — full stack in dev, trimmed in prod
  const logMeta = {
    error_code: apiError.code,
    status: statusCode,
    method: req?.method ?? 'UNKNOWN',
    path: req?.originalUrl ?? req?.url ?? 'unknown',
    user_id: (req as any)?.user?.id ?? null,
    ip: req?.ip,
    stack: error instanceof Error ? error.stack : undefined,
  };

  if (statusCode >= 500) {
    log.error(`[ErrorHandler] ${apiError.message}`, logMeta);
    persistErrorLog({
      type: apiError.type,
      message: apiError.message,
      stack: logMeta.stack,
      endpoint: logMeta.path,
      userId: logMeta.user_id,
      metadata: { code: apiError.code, requestId, method: logMeta.method, status: statusCode },
      severity: statusCode === 503 ? 'critical' : 'error',
    });
  } else {
    log.warn(`[ErrorHandler] ${apiError.message}`, logMeta);
  }

  if (res && !res.headersSent && typeof res.status === 'function') {
    res.status(statusCode).json({ success: false, error: apiError });
  }
}

/**
 * 404 handler — placed after all routes.
 */
export function notFoundHandler(req: Request, res: Response) {
  const requestId = (res?.locals?.['requestId'] as string | undefined) ?? 'unknown';
  const apiError: ApiError = {
    type: ErrorType.NOT_FOUND_ERROR,
    message: `Cannot ${req?.method ?? 'GET'} ${req?.originalUrl ?? req?.url ?? ''}`,
    code: 'RESOURCE_NOT_FOUND',
    timestamp: new Date().toISOString(),
    requestId,
  };
  if (res && typeof res.status === 'function') {
    res.status(404).json({ success: false, error: apiError });
  }
}
