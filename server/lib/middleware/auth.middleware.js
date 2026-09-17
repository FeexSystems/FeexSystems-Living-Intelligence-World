function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

import * as jwt from 'jsonwebtoken';
import { verifyFirebaseToken, } from '../firebase-admin';
import { UserService } from '../services/user.service';
import { RateLimitService } from '../redis';
import { prisma } from '../database';
import { SessionService } from '../services/session.service';
import { mockUsers, JWT_SECRET } from '../../routes/mock-auth.js';

// Extend Express Request type to include user



















/**
 * Authentication middleware - verifies Firebase ID token or Mock Auth token
 */
export const authMiddleware = async (
  req,
  res,
  next
) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Access token is required',
          code: 'MISSING_TOKEN',
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
        },
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Check if token matches Mock Auth JWT
    try {
      const mockDecoded = jwt.verify(token, JWT_SECRET);
      const userId = mockDecoded.sub || mockDecoded.id;
      if (userId) {
        const mockUser = mockUsers.get(userId);
        if (mockUser) {
          req.user = {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            role: mockUser.role || 'SUPER_ADMIN',
            emailVerified: mockUser.emailVerified,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.createdAt,
            lastLoginAt: new Date(),
          };
          return next();
        }
      }
    } catch {
      // Not a mock token, fall through to Firebase verification
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(token);
    } catch (e) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
        },
      });
      return;
    }

    // Get user from database using Firebase UID
    const userService = new UserService(prisma);
    const user = await userService.findUserById(decodedToken.uid);

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
        },
      });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication failed',
        code: 'AUTH_INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuthenticate = async (
  req,
  res,
  next
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];

    // Check if mock auth token
    try {
      const mockDecoded = jwt.verify(token, JWT_SECRET);
      const userId = mockDecoded.sub || mockDecoded.id;
      if (userId) {
        const mockUser = mockUsers.get(userId);
        if (mockUser) {
          req.user = {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            role: mockUser.role || 'SUPER_ADMIN',
            emailVerified: mockUser.emailVerified,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.createdAt,
            lastLoginAt: new Date(),
          };
          return next();
        }
      }
    } catch {
      // Fall through to Firebase verification
    }

    const decodedToken = await verifyFirebaseToken(token);

    const userService = new UserService(prisma);
    const user = await userService.findUserById(decodedToken.uid);

    if (user) {
      req.user = user;
    }

    next();
  } catch (e2) {
    // For optional auth, we don't fail on errors, just continue without user
    next();
  }
};

/**
 * Authorization middleware - checks user roles
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
        },
      });
      return;
    }

    next();
  };
};

/**
 * Email verification middleware - ensures user has verified their email
 */
export const requireEmailVerification = (
  req,
  res,
  next
) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
    });
    return;
  }

  if (!req.user.emailVerified) {
    res.status(403).json({
      success: false,
      error: {
        type: 'AUTHORIZATION_ERROR',
        message: 'Email verification required',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
    });
    return;
  }

  next();
};

/**
 * Rate limiting middleware
 */
export const rateLimit = (options






) => {
  const rateLimitService = new RateLimitService();

  return async (req, res, next) => {
    try {
      // Generate rate limit key
      const key = options.keyGenerator
        ? options.keyGenerator(req)
        : _optionalChain([req, 'access', _ => _.user, 'optionalAccess', _2 => _2.id]) || req.ip || 'anonymous';

      // Check rate limit
      const result = await rateLimitService.checkRateLimit(
        key,
        options.windowMs,
        options.maxRequests
      );

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': options.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });

      if (!result.allowed) {
        res.status(429).json({
          success: false,
          error: {
            type: 'RATE_LIMIT_ERROR',
            message: options.message || 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            timestamp: new Date().toISOString(),
            requestId: generateRequestId(),
            details: {
              limit: options.maxRequests,
              remaining: result.remaining,
              resetTime: new Date(result.resetTime).toISOString(),
            },
          },
        });
        return;
      }

      next();
    } catch (error) {
      // On error, allow the request to proceed to avoid blocking users
      console.error('Rate limiting error:', error);
      next();
    }
  };
};

/**
 * Session-based authentication middleware (alternative to JWT)
 */
export const authenticateSession = async (
  req,
  res,
  next
) => {
  try {
    const sessionToken = req.headers['x-session-token'] ;

    if (!sessionToken) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Session token is required',
          code: 'MISSING_SESSION_TOKEN',
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
        },
      });
      return;
    }

    const sessionService = new SessionService(prisma);
    const sessionWithUser = await sessionService.getSessionWithUser(sessionToken);

    if (!sessionWithUser || sessionWithUser.expiresAt < new Date()) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Invalid or expired session',
          code: 'INVALID_SESSION',
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
        },
      });
      return;
    }

    // Attach user and session to request
    req.user = sessionWithUser.user;
    req.sessionId = sessionWithUser.id;

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Session authentication failed',
        code: 'SESSION_AUTH_INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
    });
  }
};

/**
 * API key authentication middleware (for future use)
 */
export const authenticateApiKey = async (
  req,
  res,
  next
) => {
  try {
    const apiKey = req.headers['x-api-key'] ;

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'API key is required',
          code: 'MISSING_API_KEY',
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
        },
      });
      return;
    }

    // TODO: Implement API key validation logic
    // For now, just pass through
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'API key authentication failed',
        code: 'API_KEY_AUTH_INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
    });
  }
};

/**
 * Middleware to validate request body against schema
 */
export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          code: 'VALIDATION_FAILED',
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
          details: error.errors || error.message,
        },
      });
    }
  };
};

/**
 * Middleware to validate query parameters against schema
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Query validation failed',
          code: 'QUERY_VALIDATION_FAILED',
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
          details: error.errors || error.message,
        },
      });
    }
  };
};

/**
 * Generate unique request ID for tracking
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Common rate limit configurations
 */
export const rateLimitConfigs = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests from this IP, please try again later',
  },

  // Authentication endpoints (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many authentication attempts, please try again later',
  },

  // Password reset (very strict)
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts, please try again later',
  },

  // AI services (per user)
  aiServices: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (req) => `ai_${_optionalChain([req, 'access', _3 => _3.user, 'optionalAccess', _4 => _4.id]) || req.ip}`,
    message: 'AI service rate limit exceeded, please wait before making more requests',
  },
};

// Alias for backward compatibility
export const requireAuth = authMiddleware;
