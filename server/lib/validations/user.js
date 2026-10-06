import { z } from 'zod';
import { UserRole } from '@prisma/client';

// User validation schemas
export const registerUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long').regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long').regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
});

export const loginUserSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long').optional(),
  email: z.string().email('Invalid email address').optional(),
  profileImageUrl: z.string().url('Invalid image URL').nullable().optional(),
});

/**
 * Body schema for POST /api/auth/sync-user.
 *
 * Previously this endpoint destructured req.body with no validation at all, so
 * arbitrary-length strings and non-URL values (including `javascript:` /
 * `data:` URIs) were written straight to the database and later rendered in the
 * UI. Mirrors updateUserProfileSchema but is explicit about what the client may
 * send — the user id is always taken from the verified token, never the body.
 */
export const syncUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long').optional(),
  profileImageUrl: z
    .string()
    .url('Invalid image URL')
    .refine((value) => /^https?:\/\//i.test(value), 'Image URL must use http or https')
    .nullable()
    .optional(),
}).strict();

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  role: z.nativeEnum(UserRole).default('USER'),
  emailVerified: z.boolean().default(false),
});


// Type exports
 



