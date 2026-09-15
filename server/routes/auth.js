 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { Router, } from 'express';
import { prisma } from '../lib/database';
import { authMiddleware, } from '../lib/middleware/auth.middleware';

const router = Router();

/**
 * @route GET /api/auth/me
 * @desc Get current user profile from Prisma (authenticated via Firebase token)
 * @access Private
 */
router.get(
  '/me',
  authMiddleware,
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED',
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json({
        success: true,
        data: { user: req.user },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get user profile',
          code: 'GET_PROFILE_FAILED',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * @route POST /api/auth/sync-user
 * @desc Sync Firebase user to Prisma database (called on first login / profile update)
 * @access Private
 */
router.post(
  '/sync-user',
  authMiddleware,
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const { firstName, lastName, profileImageUrl } = req.body;
      const firebaseUid = req.user.id;

      // Update user profile fields if provided
      const updatedUser = await prisma.user.update({
        where: { id: firebaseUid },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(profileImageUrl && { profileImageUrl }),
        },
      });

      res.json({
        success: true,
        data: { user: updatedUser },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Sync user error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync user profile',
          code: 'SYNC_USER_FAILED',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * @route GET /api/auth/sessions
 * @desc Get user sessions from Prisma
 * @access Private
 */
router.get(
  '/sessions',
  authMiddleware,
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const page = parseInt(req.query.page ) || 1;
      const limit = parseInt(req.query.limit ) || 10;
      const skip = (page - 1) * limit;

      const sessions = await prisma.session.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      const total = await prisma.session.count({
        where: { userId: req.user.id },
      });

      res.json({
        success: true,
        data: {
          sessions,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get user sessions',
          code: 'GET_SESSIONS_FAILED',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * @route GET /api/auth/stats
 * @desc Get authentication statistics for current user
 * @access Private
 */
router.get(
  '/stats',
  authMiddleware,
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const userId = req.user.id;

      const [sessionCount, lastLogin] = await Promise.all([
        prisma.session.count({ where: { userId } }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { lastLoginAt: true },
        }),
      ]);

      res.json({
        success: true,
        data: {
          stats: {
            sessions: sessionCount,
            lastLogin: _optionalChain([lastLogin, 'optionalAccess', _ => _.lastLoginAt]),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get auth stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get authentication statistics',
          code: 'GET_AUTH_STATS_FAILED',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * @route GET /api/auth/health
 * @desc Check auth subsystem health and configuration
 * @access Public
 */
router.get('/health', async (_req, res) => {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch (e) {
    db = false;
  }

  res.json({
    success: true,
    authMode: 'firebase',
    database: db,
    firebaseConfigured: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;