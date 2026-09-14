import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '@prisma/client';
import {
  JwtPayload,
  RefreshTokenPayload,
  EmailVerificationToken,
  PasswordResetToken
} from './validations/auth';

// Environment variables — REQUIRED, no defaults
const JWT_SECRET_ENV = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET_ENV = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET_ENV || JWT_SECRET_ENV.length < 16) {
  throw new Error('FATAL: JWT_SECRET environment variable is required and must be at least 16 characters');
}
if (!JWT_REFRESH_SECRET_ENV || JWT_REFRESH_SECRET_ENV.length < 16) {
  throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is required and must be at least 16 characters');
}

// Narrow the guards above into non-optional strings for the jwt call signatures.
const JWT_SECRET: string = JWT_SECRET_ENV;
const JWT_REFRESH_SECRET: string = JWT_REFRESH_SECRET_ENV;

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const EMAIL_TOKEN_EXPIRES_IN = '24h';
const PASSWORD_RESET_TOKEN_EXPIRES_IN = '1h';

/**
 * jsonwebtoken types the `expiresIn` option as `number | StringValue` (a ms-style
 * template literal). Values sourced from process.env are plain `string`, which
 * does not satisfy that literal union. Cast once, here, instead of sprinkling
 * `as any` at every jwt.sign call site.
 */
const asExpiresIn = (value: string): SignOptions['expiresIn'] =>
  value as SignOptions['expiresIn'];

export class JWTService {
  /**
   * Generate access token
   */
  static generateAccessToken(user: Omit<User, 'passwordHash'>): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: asExpiresIn(JWT_EXPIRES_IN),
      issuer: 'feexsystems',
      audience: 'feexsystems-users',
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId: string, tokenId: string): string {
    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      userId,
      tokenId,
    };

    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: asExpiresIn(JWT_REFRESH_EXPIRES_IN),
      issuer: 'feexsystems',
      audience: 'feexsystems-refresh',
    });
  }

  /**
   * Generate email verification token
   */
  static generateEmailVerificationToken(userId: string, email: string): string {
    const payload: Omit<EmailVerificationToken, 'iat' | 'exp'> = {
      userId,
      email,
      type: 'email_verification',
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: asExpiresIn(EMAIL_TOKEN_EXPIRES_IN),
      issuer: 'feexsystems',
      audience: 'feexsystems-email-verification',
    });
  }

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken(userId: string, email: string): string {
    const payload: Omit<PasswordResetToken, 'iat' | 'exp'> = {
      userId,
      email,
      type: 'password_reset',
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: asExpiresIn(PASSWORD_RESET_TOKEN_EXPIRES_IN),
      issuer: 'feexsystems',
      audience: 'feexsystems-password-reset',
    });
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'feexsystems',
        audience: 'feexsystems-users',
      }) as unknown as JwtPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('Access token expired', 'TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid access token', 'INVALID_TOKEN');
      } else {
        throw new AuthError('Token verification failed', 'TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'feexsystems',
        audience: 'feexsystems-refresh',
      }) as unknown as RefreshTokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
      } else {
        throw new AuthError('Refresh token verification failed', 'REFRESH_TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * Verify email verification token
   */
  static verifyEmailVerificationToken(token: string): EmailVerificationToken {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'feexsystems',
        audience: 'feexsystems-email-verification',
      }) as unknown as EmailVerificationToken;

      if (decoded.type !== 'email_verification') {
        throw new AuthError('Invalid token type', 'INVALID_TOKEN_TYPE');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('Email verification token expired', 'EMAIL_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid email verification token', 'INVALID_EMAIL_TOKEN');
      } else {
        throw new AuthError('Email token verification failed', 'EMAIL_TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * Verify password reset token
   */
  static verifyPasswordResetToken(token: string): PasswordResetToken {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'feexsystems',
        audience: 'feexsystems-password-reset',
      }) as unknown as PasswordResetToken;

      if (decoded.type !== 'password_reset') {
        throw new AuthError('Invalid token type', 'INVALID_TOKEN_TYPE');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('Password reset token expired', 'PASSWORD_RESET_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid password reset token', 'INVALID_PASSWORD_RESET_TOKEN');
      } else {
        throw new AuthError('Password reset token verification failed', 'PASSWORD_RESET_TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    
    return parts[1];
  }

  /**
   * Get token expiration time in seconds
   */
  static getTokenExpirationTime(token: string): number | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.exp || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const exp = this.getTokenExpirationTime(token);
    if (!exp) return true;
    
    return Date.now() >= exp * 1000;
  }

  /**
   * Generate secure random token for non-JWT purposes
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate token pair (access + refresh)
   */
  static generateTokenPair(user: Omit<User, 'passwordHash'>, refreshTokenId: string) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user.id, refreshTokenId);
    
    // Get expiration time from access token
    const expiresIn = this.getTokenExpirationTime(accessToken);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: expiresIn ? expiresIn - Math.floor(Date.now() / 1000) : 900, // Default 15 minutes
      tokenType: 'Bearer',
    };
  }
}

/**
 * Custom authentication error class
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Password utilities
 */
export class PasswordUtils {
  /**
   * Generate a secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
    let password = '';
    
    // Ensure at least one character from each required category
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '@$!%*?&';
    
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check password strength
   */
  static checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (password.length >= 12) score += 1;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Add numbers');

    if (/[@$!%*?&]/.test(password)) score += 1;
    else feedback.push('Add special characters (@$!%*?&)');

    // Common patterns check
    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Avoid repeating characters');

    return {
      score,
      feedback,
      isStrong: score >= 5,
    };
  }
}

/**
 * Token blacklist service for logout functionality.
 * Uses Redis SET with TTL for automatic expiration.
 * Falls back to in-memory Set if Redis is unavailable.
 */
export class TokenBlacklistService {
  private static readonly KEY_PREFIX = 'token:blacklist:';
  private static readonly FALLBACK_TTL_SECONDS = 900; // 15 minutes (access token lifetime)
  private static fallbackSet = new Set<string>();

  /**
   * Add token to blacklist. Uses Redis SET with TTL matching token expiry.
   * Falls back to in-memory Set if Redis is unavailable.
   */
  static async addToBlacklist(token: string): Promise<void> {
    const exp = JWTService.getTokenExpirationTime(token);
    const ttlSeconds = exp ? Math.max(1, exp - Math.floor(Date.now() / 1000)) : this.FALLBACK_TTL_SECONDS;

    try {
      const { getRedisClient } = await import('./redis');
      const redis = getRedisClient();
      const key = `${this.KEY_PREFIX}${token}`;
      await redis.setex(key, ttlSeconds, '1');
    } catch {
      // Fallback: in-memory blacklist (lost on restart, but better than nothing)
      this.fallbackSet.add(token);
      setTimeout(() => this.fallbackSet.delete(token), ttlSeconds * 1000);
    }
  }

  /**
   * Check if token is blacklisted. Checks Redis first, then in-memory fallback.
   */
  static async isBlacklisted(token: string): Promise<boolean> {
    try {
      const { getRedisClient } = await import('./redis');
      const redis = getRedisClient();
      const key = `${this.KEY_PREFIX}${token}`;
      const result = await redis.exists(key);
      return result === 1;
    } catch {
      return this.fallbackSet.has(token);
    }
  }

  /**
   * Clear all blacklisted tokens (for testing)
   */
  static async clear(): Promise<void> {
    try {
      const { getRedisClient } = await import('./redis');
      const redis = getRedisClient();
      const keys = await redis.keys(`${this.KEY_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      // Ignore Redis errors during clear
    }
    this.fallbackSet.clear();
  }

  /**
   * Get blacklist size from Redis (for monitoring)
   */
  static async size(): Promise<number> {
    try {
      const { getRedisClient } = await import('./redis');
      const redis = getRedisClient();
      const keys = await redis.keys(`${this.KEY_PREFIX}*`);
      return keys.length;
    } catch {
      return this.fallbackSet.size;
    }
  }
}
