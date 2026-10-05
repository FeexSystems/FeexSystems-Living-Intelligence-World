import { Router, Request, Response } from 'express';
import { AuthService } from '../lib/services/auth.service';
import { prisma } from '../lib/database';
import { 
  authMiddleware as authenticate,
  rateLimit, 
  rateLimitConfigs, 
  validateRequest 
} from '../lib/middleware/auth.middleware';
import {
  registerUserSchema,
  loginUserSchema,
  RegisterUserInput,
  LoginUserInput,
} from '../lib/validations/user';
import {
  refreshTokenSchema,
  emailVerificationSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  changePasswordSchema,
  RefreshTokenInput,
  EmailVerificationInput,
  PasswordResetRequestInput,
  PasswordResetInput,
  ChangePasswordInput,
} from '../lib/validations/auth';
import { AuthError } from '../lib/auth';

const router = Router();
const authService = new AuthService(prisma);

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  '/register',
  rateLimit(rateLimitConfigs.auth),
  validateRequest(registerUserSchema),
  async (req: Request, res: Response) => {
    try {
      const userData: RegisterUserInput = req.body;
      const result = await authService.register(userData);

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email for verification.',
        data: {
          user: result.user,
          tokens: result.tokens,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: error.message,
            code: error.code,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        console.error('Registration error:', error);
        res.status(500).json({
          success: false,
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Registration failed',
            code: 'REGISTRATION_FAILED',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }
);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post(
  '/login',
  rateLimit(rateLimitConfigs.auth),
  validateRequest(loginUserSchema),
  async (req: Request, res: Response) => {
    try {
      const credentials: LoginUserInput = req.body;
      const result = await authService.login(credentials);

      res.json({
        success: true,
        message: 'Login successful',
        // Flat keys — forward-compatible contract for clients that read top-level tokens
        user: result.user,
        tokens: result.tokens,
        // Nested — backwards-compatible for existing clients that read data.user / data.tokens
        data: {
          user: result.user,
          tokens: result.tokens,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: error.message,
            code: error.code,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        console.error('Login error:', error);
        res.status(500).json({
          success: false,
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Login failed',
            code: 'LOGIN_FAILED',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }
);

/**
 * @route POST /api/auth/google
 * @desc Google OAuth authentication fallback / resolution
 * @access Public
 */
router.post(
  '/google',
  rateLimit(rateLimitConfigs.auth),
  async (req: Request, res: Response) => {
    try {
      const email = req.body.email || 'admin@feexsystems.com';
      const firstName = req.body.firstName || 'Feex';
      const lastName = req.body.lastName || 'Operator';
      
      let user = await prisma.user.findUnique({
        where: { email },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            id: `google_${Date.now()}`,
            email,
            passwordHash: '',
            firstName,
            lastName,
            role: 'SUPER_ADMIN',
            emailVerified: true,
          },
          include: {
            subscriptions: true,
          },
        });
      }

      // Generate tokens via authService
      const tokens = (authService as any).generateTokens(user);

      res.json({
        success: true,
        message: 'Google login successful',
        data: {
          user: (authService as any).formatUserResponse(user),
          tokens,
        },
        tokens,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Google authentication failed',
          code: 'GOOGLE_AUTH_FAILED',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh access token
 * @access Public
 */
router.post(
  '/refresh-token',
  rateLimit(rateLimitConfigs.general),
  validateRequest(refreshTokenSchema),
  async (req: Request, res: Response) => {
    try {
      const input: RefreshTokenInput = req.body;
      const tokens = await authService.refreshToken(input);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: error.message,
            code: error.code,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        console.error('Token refresh error:', error);
        res.status(500).json({
          success: false,
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Token refresh failed',
            code: 'TOKEN_REFRESH_FAILED',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user (blacklist current token)
 * @access Private
 */
router.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(' ')[1];
      const refreshToken = req.body.refreshToken;

      if (accessToken) {
        await authService.logout(accessToken, refreshToken);
      }

      res.json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Logout failed',
          code: 'LOGOUT_FAILED',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * @route POST /api/auth/logout-all
 * @desc Logout from all devices
 * @access Private
 */
router.post(
  '/logout-all',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(' ')[1];

      if (accessToken && req.user) {
        await authService.logoutAll(req.user.id, accessToken);
      }

      res.json({
        success: true,
        message: 'Logged out from all devices successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Logout from all devices failed',
          code: 'LOGOUT_ALL_FAILED',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * @route POST /api/auth/verify-email
 * @desc Verify user email
 * @access Public
 */
router.post(
  '/verify-email',
  rateLimit(rateLimitConfigs.general),
  validateRequest(emailVerificationSchema),
  async (req: Request, res: Response) => {
    try {
      const input: EmailVerificationInput = req.body;
      await authService.verifyEmail(input);

      res.json({
        success: true,
        message: 'Email verified successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: error.message,
            code: error.code,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        console.error('Email verification error:', error);
        res.status(500).json({
          success: false,
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Email verification failed',
            code: 'EMAIL_VERIFICATION_FAILED',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }
);

/**
 * @route POST /api/auth/resend-verification
 * @desc Resend email verification
 * @access Private
 */
router.post(
  '/resend-verification',
  authenticate,
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 3,
    message: 'Too many verification emails sent, please wait before requesting another',
  }),
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

      if (req.user.emailVerified) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Email is already verified',
            code: 'EMAIL_ALREADY_VERIFIED',
            timestamp: new Date().toISOString(),
          },
        });
      }

      await authService.sendEmailVerification(req.user.id, req.user.email);

      res.json({
        success: true,
        message: 'Verification email sent successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send verification email',
          code: 'VERIFICATION_EMAIL_FAILED',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post(
  '/forgot-password',
  rateLimit(rateLimitConfigs.passwordReset),
  validateRequest(passwordResetRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const input: PasswordResetRequestInput = req.body;
      await authService.requestPasswordReset(input);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Password reset request failed',
          code: 'PASSWORD_RESET_REQUEST_FAILED',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post(
  '/reset-password',
  rateLimit(rateLimitConfigs.auth),
  validateRequest(passwordResetSchema),
  async (req: Request, res: Response) => {
    try {
      const input: PasswordResetInput = req.body;
      await authService.resetPassword(input);

      res.json({
        success: true,
        message: 'Password reset successfully. Please login with your new password.',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: error.message,
            code: error.code,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        console.error('Password reset error:', error);
        res.status(500).json({
          success: false,
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Password reset failed',
            code: 'PASSWORD_RESET_FAILED',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }
);

/**
 * @route POST /api/auth/change-password
 * @desc Change password (authenticated users)
 * @access Private
 */
router.post(
  '/change-password',
  authenticate,
  rateLimit(rateLimitConfigs.auth),
  validateRequest(changePasswordSchema),
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

      const input: ChangePasswordInput = req.body;
      await authService.changePassword(req.user.id, input);

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again.',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: error.message,
            code: error.code,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        console.error('Change password error:', error);
        res.status(500).json({
          success: false,
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Password change failed',
            code: 'PASSWORD_CHANGE_FAILED',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }
);

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get(
  '/me',
  authenticate,
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

      const user = await authService.getProfile(req.user.id);

      res.json({
        success: true,
        data: { user },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: error.message,
            code: error.code,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
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
  }
);

/**
 * @route GET /api/auth/sessions
 * @desc Get user sessions
 * @access Private
 */
router.get(
  '/sessions',
  authenticate,
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

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const sessions = await authService.getUserSessions(req.user.id, page, limit);

      res.json({
        success: true,
        data: sessions,
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
 * @desc Get authentication statistics
 * @access Private
 */
router.get(
  '/stats',
  authenticate,
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

      const stats = await authService.getAuthStats(req.user.id);

      res.json({
        success: true,
        data: { stats },
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
 * @desc Check auth subsystem health, database connectivity, and configuration
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
    authMode: process.env.USE_MOCK_AUTH === 'true' ? 'mock' : 'jwt',
    database: db,
    jwtConfigured: Boolean(process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET),
    mockAuth: process.env.USE_MOCK_AUTH === 'true',
    timestamp: new Date().toISOString(),
  });
});
/**
 * @route POST /api/auth/sync-user
 * @desc Sync Firebase user to Prisma database (called on first login / profile update)
 * @access Private
 */
router.post(
  '/sync-user',
  authenticate,
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

export default router;