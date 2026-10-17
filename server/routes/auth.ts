/**
 * Auth routes — Firebase Auth only.
 *
 * Firebase Auth is the single source of truth for identity. Registration,
 * login, logout, email verification, password reset/change and session/refresh
 * token issuance are all owned by Firebase on the client and are NOT exposed
 * here. This router only exposes the Firebase-token-backed endpoints the SPA
 * needs to keep the Cloud SQL user record in sync.
 *
 * The legacy app-issued JWT endpoints (register / login / refresh-token /
 * logout / logout-all / verify-email / resend-verification / forgot-password /
 * reset-password / change-password / sessions / stats) were removed together
 * with JWT_SECRET / JWT_REFRESH_SECRET.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthService } from '../lib/services/auth.service';
import { prisma } from '../lib/database';
import { authMiddleware as authenticate } from '../lib/middleware/auth.middleware';
import { authRateLimiter } from '../lib/middleware/production-security';
import { syncUserSchema, SyncUserInput } from '../lib/validations/user';
import { AuthError } from '../lib/auth';

const router = Router();
const authService = new AuthService(prisma);

function authErrorResponse(res: Response, error: unknown, fallbackMessage: string, fallbackCode: string) {
  if (error instanceof AuthError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      },
    });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({
    success: false,
    error: {
      type: 'INTERNAL_SERVER_ERROR',
      message: fallbackMessage,
      code: fallbackCode,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Validate the request body against the sync-user schema.
 */
function validateSyncUser(req: Request, res: Response, next: NextFunction): void {
  const parsed = syncUserSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        code: 'VALIDATION_FAILED',
        details: parsed.error.issues,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }
  req.body = parsed.data;
  next();
}

/**
 * @route GET /api/auth/me
 * @desc Get current user profile (from the verified Firebase ID token)
 * @access Private
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
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

    const user = await authService.getProfile(req.user.id);

    res.json({
      success: true,
      data: { user },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return authErrorResponse(res, error, 'Failed to get user profile', 'GET_PROFILE_FAILED');
  }
});

/**
 * @route POST /api/auth/sync-user
 * @desc Sync the Firebase-authenticated user to the Cloud SQL record.
 *       Called on first login / profile update.
 * @access Private
 */
router.post(
  '/sync-user',
  authenticate,
  authRateLimiter,
  validateSyncUser,
  async (req: Request, res: Response) => {
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

      // The user id always comes from the verified token so a caller can only
      // ever update their own profile.
      const { firstName, lastName, profileImageUrl }: SyncUserInput = req.body;
      const firebaseUid = req.user.id;

      const existing = await prisma.user.findUnique({ where: { id: firebaseUid } });

      const updatedUser = existing
        ? await prisma.user.update({
            where: { id: firebaseUid },
            data: {
              ...(firstName !== undefined ? { firstName } : {}),
              ...(lastName !== undefined ? { lastName } : {}),
              ...(profileImageUrl !== undefined ? { profileImageUrl } : {}),
            },
          })
        : await prisma.user.create({
            data: {
              id: firebaseUid,
              email: req.user.email,
              passwordHash: 'FIREBASE_AUTH_MANAGED',
              firstName: firstName ?? req.user.firstName ?? 'Feex',
              lastName: lastName ?? req.user.lastName ?? 'Explorer',
              role: UserRole.USER,
              emailVerified: req.user.emailVerified ?? false,
              profileImageUrl: profileImageUrl ?? null,
            },
          });

      const { passwordHash: _passwordHash, ...publicUser } = updatedUser as any;

      res.json({
        success: true,
        message: 'User synced successfully',
        data: { user: publicUser },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return authErrorResponse(res, error, 'User sync failed', 'SYNC_USER_FAILED');
    }
  }
);

/**
 * @route POST /api/auth/google
 * @desc Called by the SPA after a Firebase Google sign-in to mirror the user.
 * @access Private
 */
router.post('/google', authenticate, async (req: Request, res: Response) => {
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

    const user = await authService.getProfile(req.user.id);

    res.json({
      success: true,
      message: 'Google sign-in synced',
      data: { user },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return authErrorResponse(res, error, 'Google sign-in sync failed', 'GOOGLE_SYNC_FAILED');
  }
});

/**
 * @route GET /api/auth/health
 * @desc Auth subsystem health.
 * @access Public
 */
router.get('/health', async (_req: Request, res: Response) => {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }

  res.json({
    success: true,
    authMode: 'firebase',
    database: db,
    timestamp: new Date().toISOString(),
  });
});

export default router;
