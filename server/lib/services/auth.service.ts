import { PrismaClient, User } from '@prisma/client';
import { JWTService, AuthError, TokenBlacklistService } from '../auth';
import { UserService } from './user.service';
import { SessionService } from './session.service';
import {
  RegisterUserInput,
  LoginUserInput,
} from '../validations/user';
import {
  RefreshTokenInput,
  PasswordResetRequestInput,
  PasswordResetInput,
  EmailVerificationInput,
  ChangePasswordInput
} from '../validations/auth';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  tokens: AuthTokens;
}

export class AuthService {
  private userService: UserService;
  private sessionService: SessionService;

  constructor(private prisma: PrismaClient) {
    this.userService = new UserService(prisma);
    this.sessionService = new SessionService(prisma);
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterUserInput): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.userService.findUserByEmail(userData.email);
    if (existingUser) {
      throw new AuthError('User with this email already exists', 'EMAIL_ALREADY_EXISTS', 400);
    }

    // Create user
    const user = await this.userService.createUser(userData);

    // Create refresh token in database
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days
    const refreshTokenRecord = await this.sessionService.createRefreshToken(
      user.id,
      refreshTokenExpiry
    );

    // Generate token pair
    const tokens = JWTService.generateTokenPair(user, refreshTokenRecord.id);

    // Send email verification (in a real app, you'd queue this)
    await this.sendEmailVerification(user.id, user.email);

    return { user, tokens };
  }

  /**
   * Login user
   */
  async login(credentials: LoginUserInput): Promise<AuthResponse> {
    // Find user with password
    const userWithPassword = await this.userService.findUserByEmail(credentials.email);
    if (!userWithPassword) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    // Verify password
    const isPasswordValid = await this.userService.verifyPassword(
      userWithPassword,
      credentials.password
    );
    if (!isPasswordValid) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    // Update last login
    await this.userService.updateLastLogin(userWithPassword.id);

    // Get user without password
    const user = await this.userService.findUserById(userWithPassword.id);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    // Create refresh token in database
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days
    const refreshTokenRecord = await this.sessionService.createRefreshToken(
      user.id,
      refreshTokenExpiry
    );

    // Generate token pair
    const tokens = JWTService.generateTokenPair(user, refreshTokenRecord.id);

    return { user, tokens };
  }

  /**
   * Refresh access token
   */
  async refreshToken(input: RefreshTokenInput): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = JWTService.verifyRefreshToken(input.refreshToken);

      // Find refresh token in database
      const refreshTokenRecord = await this.sessionService.findValidRefreshTokenByToken(
        input.refreshToken
      );
      if (!refreshTokenRecord || refreshTokenRecord.id !== payload.tokenId) {
        throw new AuthError('Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401);
      }

      // Get user
      const user = await this.userService.findUserById(payload.userId);
      if (!user) {
        throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
      }

      // Rotate refresh token (delete old, create new)
      const newRefreshTokenExpiry = new Date();
      newRefreshTokenExpiry.setDate(newRefreshTokenExpiry.getDate() + 7); // 7 days
      const newRefreshTokenRecord = await this.sessionService.rotateRefreshToken(
        input.refreshToken,
        user.id,
        newRefreshTokenExpiry
      );

      // Generate new token pair
      const tokens = JWTService.generateTokenPair(user, newRefreshTokenRecord.id);

      return tokens;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Token refresh failed', 'TOKEN_REFRESH_FAILED', 401);
    }
  }

  /**
   * Logout user (blacklist token)
   */
  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    // Add access token to blacklist
    await TokenBlacklistService.addToBlacklist(accessToken);

    // Delete refresh token from database if provided
    if (refreshToken) {
      try {
        await this.sessionService.deleteRefreshToken(refreshToken);
      } catch (error) {
        // Don't fail logout if refresh token deletion fails
        console.error('Failed to delete refresh token during logout:', error);
      }
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string, currentAccessToken: string): Promise<void> {
    // Add current access token to blacklist
    await TokenBlacklistService.addToBlacklist(currentAccessToken);

    // Delete all refresh tokens for user
    await this.sessionService.deleteAllUserRefreshTokens(userId);

    // Delete all sessions for user
    await this.sessionService.deleteAllUserSessions(userId);
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(userId: string, email: string): Promise<void> {
    const token = JWTService.generateEmailVerificationToken(userId, email);

    // In a real application, you would send this via email service
    console.log(`Email verification token for ${email}: ${token}`);

    // TODO: Implement actual email sending
    // await emailService.sendEmailVerification(email, token);
  }

  /**
   * Verify email
   */
  async verifyEmail(input: EmailVerificationInput): Promise<void> {
    try {
      const payload = JWTService.verifyEmailVerificationToken(input.token);

      // Verify user exists and email matches
      const user = await this.userService.findUserById(payload.userId);
      if (!user || user.email !== payload.email) {
        throw new AuthError('Invalid verification token', 'INVALID_VERIFICATION_TOKEN', 400);
      }

      // Mark email as verified
      await this.userService.verifyEmail(payload.userId);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Email verification failed', 'EMAIL_VERIFICATION_FAILED', 400);
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(input: PasswordResetRequestInput): Promise<void> {
    const user = await this.userService.findUserByEmail(input.email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return;
    }

    const token = JWTService.generatePasswordResetToken(user.id, user.email);

    // In a real application, you would send this via email service
    console.log(`Password reset token for ${user.email}: ${token}`);

    // TODO: Implement actual email sending
    // await emailService.sendPasswordReset(user.email, token);
  }

  /**
   * Reset password
   */
  async resetPassword(input: PasswordResetInput): Promise<void> {
    try {
      const payload = JWTService.verifyPasswordResetToken(input.token);

      // Verify user exists and email matches
      const user = await this.userService.findUserById(payload.userId);
      if (!user || user.email !== payload.email) {
        throw new AuthError('Invalid reset token', 'INVALID_RESET_TOKEN', 400);
      }

      // Update password
      await this.userService.updateUserPassword(payload.userId, input.password);

      // Revoke all existing tokens for security
      await this.logoutAll(payload.userId, '');
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Password reset failed', 'PASSWORD_RESET_FAILED', 400);
    }
  }

  /**
   * Change password (for authenticated users)
   */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    // Get user with password
    const userWithPassword = await this.userService.findUserByIdWithPassword(userId);
    if (!userWithPassword) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await this.userService.verifyPassword(
      userWithPassword,
      input.currentPassword
    );
    if (!isCurrentPasswordValid) {
      throw new AuthError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD', 400);
    }

    // Update password
    await this.userService.updateUserPassword(userId, input.newPassword);

    // Revoke all existing refresh tokens for security (user will need to login again)
    await this.sessionService.deleteAllUserRefreshTokens(userId);
  }

  /**
   * Get user profile (authenticated)
   */
  async getProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }
    return user;
  }

  /**
   * Update user profile (authenticated)
   */
  async updateProfile(
    userId: string,
    updateData: Partial<{ firstName: string; lastName: string; email: string }>
  ): Promise<Omit<User, 'passwordHash'>> {
    // If email is being changed, check if it's already taken
    if (updateData.email) {
      const existingUser = await this.userService.findUserByEmail(updateData.email);
      if (existingUser && existingUser.id !== userId) {
        throw new AuthError('Email is already taken', 'EMAIL_ALREADY_TAKEN', 400);
      }
    }

    const updatedUser = await this.userService.updateUserProfile(userId, updateData);

    // If email was changed, mark as unverified and send verification
    if (updateData.email) {
      await this.sendEmailVerification(userId, updateData.email);
    }

    return updatedUser;
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string, page: number = 1, limit: number = 10) {
    return this.sessionService.getUserSessions(userId, page, limit);
  }

  /**
   * Get user refresh tokens
   */
  async getUserRefreshTokens(userId: string, page: number = 1, limit: number = 10) {
    return this.sessionService.getUserRefreshTokens(userId, page, limit);
  }

  /**
   * Revoke specific refresh token
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.sessionService.deleteRefreshToken(refreshToken);
  }

  /**
   * Get authentication statistics for user
   */
  async getAuthStats(userId: string) {
    const sessionStats = await this.sessionService.getUserSessionStats(userId);
    const userStats = await this.userService.getUserStats(userId);

    return {
      ...sessionStats,
      ...userStats,
      lastLogin: (await this.userService.findUserById(userId))?.lastLoginAt,
    };
  }

  /**
   * Validate token without throwing errors
   */
  async validateToken(token: string): Promise<{ valid: boolean; payload?: any; error?: string }> {
    try {
      const payload = JWTService.verifyAccessToken(token);

      // Check if token is blacklisted
      if (await TokenBlacklistService.isBlacklisted(token)) {
        return { valid: false, error: 'Token has been revoked' };
      }

      // Check if user still exists
      const user = await this.userService.findUserById(payload.userId);
      if (!user) {
        return { valid: false, error: 'User not found' };
      }

      return { valid: true, payload };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof AuthError ? error.message : 'Invalid token'
      };
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<{ sessionsDeleted: number; refreshTokensDeleted: number }> {
    return this.sessionService.cleanupExpiredTokens();
  }
}