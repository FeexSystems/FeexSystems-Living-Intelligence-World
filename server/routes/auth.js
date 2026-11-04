 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }/**
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

import { Router, } from 'express';
import { AuthService } from '../lib/services/auth.service';
import { UserService } from '../lib/services/user.service';
import { prisma } from '../lib/database';
import { authMiddleware as authenticate } from '../lib/middleware/auth.middleware';
import { authRateLimiter } from '../lib/middleware/production-security';
import { syncUserSchema, googleProfileSchema, } from '../lib/validations/user';
import { AuthError } from '../lib/auth';

const router = Router();
const authService = new AuthService(prisma);
const userService = new UserService(prisma);

function authErrorResponse(res, error, fallbackMessage, fallbackCode) {
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
function validateSyncUser(req, res, next) {
  const parsed = syncUserSchema.safeParse(_nullishCoalesce(req.body, () => ( {})));
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
 * Validate the request body against the Google-profile schema.
 *
 * The schema is `.strict()`, so a body that tries to supply an `email` (or a
 * `role`) is rejected with 400 rather than silently ignored. This makes the
 * "the email and the role come from Firebase / the database, never from the
 * client" contract explicit and observable.
 */
function validateGoogleProfile(req, res, next) {
  const parsed = googleProfileSchema.safeParse(_nullishCoalesce(req.body, () => ( {})));
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
router.get('/me', authenticate, async (req, res) => {
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

    const user = await authService.getProfile(req.user.id, {
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      profileImageUrl: _nullishCoalesce(req.user.profileImageUrl, () => ( null)),
      emailVerified: req.user.emailVerified,
    });

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

      // The user id always comes from the verified token so a caller can only
      // ever update their own profile.
      const { firstName, lastName, profileImageUrl } = req.body;
      const firebaseUid = req.user.id;

      // The row is already provisioned by the `authenticate` middleware (or
      // re-keyed from a legacy email-matched row). This route only mirrors the
      // submitted profile fields onto it. The email and role are intentionally
      // NOT taken from the request body: the email is owned by Firebase and
      // the role is an administrative concern.
      const updatedUser = await userService.findOrCreateFirebaseUser({
        firebaseUid,
        firstName,
        lastName,
        profileImageUrl,
        updateExistingProfile: true,
      });

      const { passwordHash: _passwordHash, ...publicUser } = updatedUser ;

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
router.post('/google', authenticate, validateGoogleProfile, async (req, res) => {
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

    // The email is owned by Firebase and is NEVER read from the request body:
    // `req.user.email` is the verified token claim (or the provisioned row's
    // stored email). Accepting a body-supplied email would let a caller rewrite
    // the email on their own row, and because legacy rows are re-keyed onto the
    // Firebase UID by email match, that could capture another user's row.
    const body = (_nullishCoalesce(req.body, () => ( {}))) 



;

    // The user row is already provisioned by the `authenticate` middleware.
    // This route only mirrors the Google profile fields onto it.
    const user = await authService.getProfile(req.user.id, {
      email: req.user.email,
      firstName: _nullishCoalesce(body.firstName, () => ( req.user.firstName)),
      lastName: _nullishCoalesce(body.lastName, () => ( req.user.lastName)),
      profileImageUrl: _nullishCoalesce(_nullishCoalesce(body.profileImageUrl, () => ( req.user.profileImageUrl)), () => ( null)),
      emailVerified: req.user.emailVerified,
      updateExistingProfile: true,
    });

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
    timestamp: new Date().toISOString(),
  });
});

export default router;
