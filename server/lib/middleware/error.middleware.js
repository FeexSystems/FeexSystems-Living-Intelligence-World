 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { logger } from '../logging';

// ─────────────────────────────────────────────────────────────────
// Error taxonomy
// ─────────────────────────────────────────────────────────────────

export var ErrorType; (function (ErrorType) {
  const VALIDATION_ERROR     = 'VALIDATION_ERROR'; ErrorType["VALIDATION_ERROR"] = VALIDATION_ERROR;
  const AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR'; ErrorType["AUTHENTICATION_ERROR"] = AUTHENTICATION_ERROR;
  const AUTHORIZATION_ERROR  = 'AUTHORIZATION_ERROR'; ErrorType["AUTHORIZATION_ERROR"] = AUTHORIZATION_ERROR;
  const RATE_LIMIT_ERROR     = 'RATE_LIMIT_ERROR'; ErrorType["RATE_LIMIT_ERROR"] = RATE_LIMIT_ERROR;
  const SERVICE_UNAVAILABLE  = 'SERVICE_UNAVAILABLE'; ErrorType["SERVICE_UNAVAILABLE"] = SERVICE_UNAVAILABLE;
  const PAYMENT_ERROR        = 'PAYMENT_ERROR'; ErrorType["PAYMENT_ERROR"] = PAYMENT_ERROR;
  const EXTERNAL_API_ERROR   = 'EXTERNAL_API_ERROR'; ErrorType["EXTERNAL_API_ERROR"] = EXTERNAL_API_ERROR;
  const INTERNAL_SERVER_ERROR= 'INTERNAL_SERVER_ERROR'; ErrorType["INTERNAL_SERVER_ERROR"] = INTERNAL_SERVER_ERROR;
  const NOT_FOUND_ERROR      = 'NOT_FOUND_ERROR'; ErrorType["NOT_FOUND_ERROR"] = NOT_FOUND_ERROR;
})(ErrorType || (ErrorType = {}));










// ─────────────────────────────────────────────────────────────────
// Typed application error class for explicit throws
// ─────────────────────────────────────────────────────────────────

export class AppError extends Error {
  
  
  
  

  constructor(
    type,
    message,
    code,
    details,
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

function getStatusCode(errorType) {
  const map = {
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
  return _nullishCoalesce(map[errorType], () => ( 500));
}

/**
 * Persists an error to the `error_logs` table.
 *
 * Fire-and-forget by design: the database module is imported lazily and every
 * failure is swallowed so error reporting can never hang or break a response
 * (Non-Blocking Infrastructure Initialization invariant).
 */
function persistErrorLog(entry







) {
  void (async () => {
    try {
      const { prisma } = await import('../database');
      await prisma.errorLog.create({
        data: {
          type: entry.type,
          message: entry.message.slice(0, 2000),
          stack: _optionalChain([entry, 'access', _ => _.stack, 'optionalAccess', _2 => _2.slice, 'call', _3 => _3(0, 8000)]),
          endpoint: entry.endpoint,
          userId: _nullishCoalesce(entry.userId, () => ( null)),
          metadata: entry.metadata ,
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

function transformError(error, requestId) {
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
        details: { fields: _optionalChain([error, 'access', _4 => _4.meta, 'optionalAccess', _5 => _5.target])  },
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
      code: _nullishCoalesce((error ).code, () => ( 'AUTH_ERROR')),
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
  error,
  req,
  res,
  _next,
) {
  const requestId = _nullishCoalesce((_optionalChain([res, 'optionalAccess', _6 => _6.locals, 'optionalAccess', _7 => _7['requestId']]) ), () => ( 'unknown'));
  const log = (_nullishCoalesce(_optionalChain([res, 'optionalAccess', _8 => _8.locals, 'optionalAccess', _9 => _9['log']]), () => ( logger))) ;

  const apiError = transformError(error, requestId);
  const statusCode = getStatusCode(apiError.type);

  // Structured log — full stack in dev, trimmed in prod
  const logMeta = {
    error_code: apiError.code,
    status: statusCode,
    method: _nullishCoalesce(_optionalChain([req, 'optionalAccess', _10 => _10.method]), () => ( 'UNKNOWN')),
    path: _nullishCoalesce(_nullishCoalesce(_optionalChain([req, 'optionalAccess', _11 => _11.originalUrl]), () => ( _optionalChain([req, 'optionalAccess', _12 => _12.url]))), () => ( 'unknown')),
    user_id: _nullishCoalesce(_optionalChain([(req ), 'optionalAccess', _13 => _13.user, 'optionalAccess', _14 => _14.id]), () => ( null)),
    ip: _optionalChain([req, 'optionalAccess', _15 => _15.ip]),
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
export function notFoundHandler(req, res) {
  const requestId = _nullishCoalesce((_optionalChain([res, 'optionalAccess', _16 => _16.locals, 'optionalAccess', _17 => _17['requestId']]) ), () => ( 'unknown'));
  const apiError = {
    type: ErrorType.NOT_FOUND_ERROR,
    message: `Cannot ${_nullishCoalesce(_optionalChain([req, 'optionalAccess', _18 => _18.method]), () => ( 'GET'))} ${_nullishCoalesce(_nullishCoalesce(_optionalChain([req, 'optionalAccess', _19 => _19.originalUrl]), () => ( _optionalChain([req, 'optionalAccess', _20 => _20.url]))), () => ( ''))}`,
    code: 'RESOURCE_NOT_FOUND',
    timestamp: new Date().toISOString(),
    requestId,
  };
  if (res && typeof res.status === 'function') {
    res.status(404).json({ success: false, error: apiError });
  }
}
