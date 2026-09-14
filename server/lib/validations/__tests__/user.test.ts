import { describe, it, expect } from 'vitest';
import {
  registerUserSchema,
  loginUserSchema,
  updateUserProfileSchema,
  createUserSchema,
} from '../user';
import {
  passwordResetRequestSchema,
  passwordResetSchema,
  emailVerificationSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '../auth';

describe('User Validation Schemas', () => {
  describe('registerUserSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = registerUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = registerUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address');
      }
    });

    it('should reject weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = registerUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters long');
      }
    });

    it('should reject password without special characters', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = registerUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('special character');
      }
    });

    it('should reject invalid first name with numbers', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John123',
        lastName: 'Doe',
      };

      const result = registerUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('letters, spaces, hyphens, and apostrophes');
      }
    });

    it('should accept names with hyphens and apostrophes', () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: "Mary-Jane",
        lastName: "O'Connor",
      };

      const result = registerUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('loginUserSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'anypassword',
      };

      const result = loginUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'password',
      };

      const result = loginUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });
  });

  describe('updateUserProfileSchema', () => {
    it('should validate partial update data', () => {
      const validData = {
        firstName: 'Jane',
      };

      const result = updateUserProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate full update data', () => {
      const validData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
      };

      const result = updateUserProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate empty object', () => {
      const validData = {};

      const result = updateUserProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email in update', () => {
      const invalidData = {
        email: 'invalid-email',
      };

      const result = updateUserProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address');
      }
    });
  });

  describe('passwordResetRequestSchema', () => {
    it('should validate valid email', () => {
      const validData = {
        email: 'test@example.com',
      };

      const result = passwordResetRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
      };

      const result = passwordResetRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('passwordResetSchema', () => {
    it('should validate valid reset data', () => {
      const validData = {
        token: 'valid-reset-token',
        password: 'NewSecurePass123!',
      };

      const result = passwordResetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const invalidData = {
        token: '',
        password: 'NewSecurePass123!',
      };

      const result = passwordResetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Reset token is required');
      }
    });

    it('should reject weak password', () => {
      const invalidData = {
        token: 'valid-reset-token',
        password: 'weak',
      };

      const result = passwordResetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters long');
      }
    });
  });

  describe('emailVerificationSchema', () => {
    it('should validate valid token', () => {
      const validData = {
        token: 'valid-verification-token',
      };

      const result = emailVerificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const invalidData = {
        token: '',
      };

      const result = emailVerificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Verification token is required');
      }
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate valid password change data', () => {
      const validData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };

      const result = changePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty current password', () => {
      const invalidData = {
        currentPassword: '',
        newPassword: 'NewPassword123!',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Current password is required');
      }
    });

    it('should reject weak new password', () => {
      const invalidData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'weak',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters long');
      }
    });
  });

  describe('createUserSchema', () => {
    it('should validate valid user creation data', () => {
      const validData = {
        email: 'admin@example.com',
        password: 'AdminPass123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN' as const,
        emailVerified: true,
      };

      const result = createUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should use default values for optional fields', () => {
      const validData = {
        email: 'user@example.com',
        password: 'UserPass123!',
        firstName: 'Regular',
        lastName: 'User',
      };

      const result = createUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('USER');
        expect(result.data.emailVerified).toBe(false);
      }
    });
  });

  describe('refreshTokenSchema', () => {
    it('should validate valid refresh token', () => {
      const validData = {
        refreshToken: 'valid-refresh-token',
      };

      const result = refreshTokenSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty refresh token', () => {
      const invalidData = {
        refreshToken: '',
      };

      const result = refreshTokenSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Refresh token is required');
      }
    });
  });
});