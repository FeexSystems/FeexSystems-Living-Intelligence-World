 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { Router, } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { AuthService } from '../lib/services/auth.service';
import { UserService } from '../lib/services/user.service';
import { ActivityLogService } from '../lib/services/activity-log.service';
import { prisma } from '../lib/database';
import { 
  authMiddleware as authenticate,
  rateLimit, 
  rateLimitConfigs, 
  validateRequest 
} from '../lib/middleware/auth.middleware';
import {
  updateUserProfileSchema,

} from '../lib/validations/user';
import { AuthError } from '../lib/auth';

const router = Router();
const authService = new AuthService(prisma);
const userService = new UserService(prisma);
const activityLogService = new ActivityLogService(prisma);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error , '');
    }
  },
  filename: (req, file, cb) => {
    const userId = _optionalChain([req, 'access', _ => _.user, 'optionalAccess', _2 => _2.id]);
    const ext = path.extname(file.originalname);
    const filename = `${userId}-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
});

/**
 * @route GET /api/users/profile
 * @desc Get current user profile with activity summary
 * @access Private
 */
router.get(
  '/profile',
  authenticate,
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

      // Get user profile
      const user = await authService.getProfile(req.user.id);
      
      // Get user statistics
      const stats = await userService.getUserStats(req.user.id);
      
      // Get recent activity
      const activity = await userService.getUserActivity(req.user.id, 30);

      // Log profile access
      await activityLogService.logActivity({
        userId: req.user.id,
        action: 'PROFILE_VIEWED',
        resource: 'USER_PROFILE',
        resourceId: req.user.id,
        metadata: {
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      });

      res.json({
        success: true,
        data: {
          user,
          stats,
          activity
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
 * @route PUT /api/users/profile
 * @desc Update user profile
 * @access Private
 */
router.put(
  '/profile',
  authenticate,
  rateLimit(rateLimitConfigs.general),
  validateRequest(updateUserProfileSchema),
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

      const updateData = req.body;
      
      // Get current user data for comparison
      const currentUser = await authService.getProfile(req.user.id);
      
      // Update profile
      const updatedUser = await authService.updateProfile(req.user.id, updateData);

      // Log profile update
      await activityLogService.logActivity({
        userId: req.user.id,
        action: 'PROFILE_UPDATED',
        resource: 'USER_PROFILE',
        resourceId: req.user.id,
        metadata: {
          changes: updateData,
          previousData: {
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            email: currentUser.email
          },
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser },
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
        console.error('Update profile error:', error);
        res.status(500).json({
          success: false,
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update user profile',
            code: 'UPDATE_PROFILE_FAILED',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }
);

/**
 * @route POST /api/users/profile/avatar
 * @desc Upload profile avatar image
 * @access Private
 */
router.post(
  '/profile/avatar',
  authenticate,
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many avatar upload attempts, please try again later',
  }),
  (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: err.message || 'Invalid file',
            code: 'INVALID_FILE',
            timestamp: new Date().toISOString(),
          },
        });
      }
      next();
    });
  },
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

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'No file uploaded',
            code: 'NO_FILE_UPLOADED',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Get current user to check for existing avatar
      const currentUser = await authService.getProfile(req.user.id);
      
      // Delete old avatar if exists
      if (currentUser.profileImageUrl) {
        try {
          const oldImagePath = path.join(process.cwd(), 'uploads', 'profiles', path.basename(currentUser.profileImageUrl));
          await fs.unlink(oldImagePath);
        } catch (error) {
          // Don't fail if old image deletion fails
          console.warn('Failed to delete old avatar:', error);
        }
      }

      // Update user with new avatar URL
      const avatarUrl = `/uploads/profiles/${req.file.filename}`;
      const updatedUser = await userService.updateUserProfile(req.user.id, {
        profileImageUrl: avatarUrl
      });

      // Log avatar upload
      await activityLogService.logActivity({
        userId: req.user.id,
        action: 'AVATAR_UPLOADED',
        resource: 'USER_PROFILE',
        resourceId: req.user.id,
        metadata: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          previousAvatar: currentUser.profileImageUrl,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      });

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: { 
          user: updatedUser,
          avatarUrl 
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Clean up uploaded file if there was an error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.warn('Failed to cleanup uploaded file:', cleanupError);
        }
      }

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
        console.error('Avatar upload error:', error);
        res.status(500).json({
          success: false,
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to upload avatar',
            code: 'AVATAR_UPLOAD_FAILED',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }
);

/**
 * @route DELETE /api/users/profile/avatar
 * @desc Delete profile avatar image
 * @access Private
 */
router.delete(
  '/profile/avatar',
  authenticate,
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

      // Get current user to check for existing avatar
      const currentUser = await authService.getProfile(req.user.id);
      
      if (!currentUser.profileImageUrl) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'No avatar to delete',
            code: 'NO_AVATAR_EXISTS',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Delete avatar file
      try {
        const imagePath = path.join(process.cwd(), 'uploads', 'profiles', path.basename(currentUser.profileImageUrl));
        await fs.unlink(imagePath);
      } catch (error) {
        console.warn('Failed to delete avatar file:', error);
      }

      // Update user to remove avatar URL
      const updatedUser = await userService.updateUserProfile(req.user.id, {
        profileImageUrl: null
      });

      // Log avatar deletion
      await activityLogService.logActivity({
        userId: req.user.id,
        action: 'AVATAR_DELETED',
        resource: 'USER_PROFILE',
        resourceId: req.user.id,
        metadata: {
          deletedAvatar: currentUser.profileImageUrl,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      });

      res.json({
        success: true,
        message: 'Avatar deleted successfully',
        data: { user: updatedUser },
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
        console.error('Avatar delete error:', error);
        res.status(500).json({
          success: false,
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete avatar',
            code: 'AVATAR_DELETE_FAILED',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }
);

/**
 * @route GET /api/users/profile/activity
 * @desc Get user activity logs
 * @access Private
 */
router.get(
  '/profile/activity',
  authenticate,
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
      const limit = parseInt(req.query.limit ) || 20;
      const action = req.query.action ;
      const resource = req.query.resource ;

      const activities = await activityLogService.getUserActivities(
        req.user.id,
        page,
        limit,
        { action, resource }
      );

      res.json({
        success: true,
        data: activities,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get activity logs error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get activity logs',
          code: 'GET_ACTIVITY_LOGS_FAILED',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

export default router;