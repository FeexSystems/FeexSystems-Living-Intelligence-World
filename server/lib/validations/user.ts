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

/**
 * The accepted shapes for a profile image URL.
 *
 *  - an absolute http(s) URL (e.g. a Google/avatar provider URL), or
 *  - a server-hosted upload path (`/uploads/profiles/...`), which is what the
 *    avatar upload route stores.
 *
 * Everything else — most importantly `javascript:` and `data:` URIs — is
 * rejected, because the value is later rendered as an image source.
 */
export const PROFILE_IMAGE_URL_PATTERN = /^(https?:\/\/|\/uploads\/[A-Za-z0-9_\-/.]+$)/i;

/**
 * Runtime check for a profile image URL.
 *
 * Exported separately from the Zod schema so the service layer can apply the
 * same rule defensively (defence in depth) even when a caller bypasses the
 * HTTP validation layer.
 */
export function isSafeProfileImageUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (value.length > 2048) return false;
  return PROFILE_IMAGE_URL_PATTERN.test(value);
}

/**
 * Shared `profileImageUrl` field.
 *
 * Only two shapes are accepted (see `isSafeProfileImageUrl`):
 *  - an absolute http(s) URL (e.g. a Google/avatar provider URL), or
 *  - a server-hosted upload path (`/uploads/profiles/...`), which is what the
 *    avatar upload route stores.
 *
 * Everything else — most importantly `javascript:` and `data:` URIs — is
 * rejected, because the value is later rendered as an image source.
 */
const profileImageUrlField = z
  .string()
  .max(2048, 'Image URL is too long')
  .refine(
    (value) => isSafeProfileImageUrl(value),
    'Image URL must be an http(s) URL or a server-hosted upload path'
  )
  .nullable()
  .optional();

/**
 * Body schema for PUT /api/users/profile.
 *
 * The email is deliberately ABSENT. Firebase Auth owns identity, so the email
 * on the local row is a projection of the Firebase value. Accepting a
 * body-supplied email would let a caller rewrite the email on their own row
 * and, because legacy rows are re-keyed onto the Firebase UID by email match,
 * that could be used to capture another user's row. Changing the email is a
 * separate, explicit operation (`PUT /api/users/profile/email`) that goes
 * through Firebase Auth.
 */
export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long').optional(),
  profileImageUrl: profileImageUrlField,
}).strict();

/**
 * Body schema for PUT /api/users/profile/email.
 *
 * A dedicated endpoint for the one operation that legitimately changes the
 * email. The new address is applied to Firebase Auth first (which owns
 * identity); only once Firebase has accepted it is the local row updated.
 */
export const updateUserEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
}).strict();

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
  profileImageUrl: profileImageUrlField,
}).strict();

/**
 * Body schema for POST /api/auth/google.
 *
 * The email is deliberately ABSENT: the email is owned by Firebase and is only
 * ever taken from the verified token claims. Accepting a body-supplied email
 * would let a caller rewrite the email on their own row and, because legacy
 * rows are re-keyed onto the Firebase UID by email match, that could be used
 * to capture another user's row. The role is likewise never client-settable.
 */
export const googleProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long').optional(),
  profileImageUrl: profileImageUrlField,
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
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type UpdateUserEmailInput = z.infer<typeof updateUserEmailSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type SyncUserInput = z.infer<typeof syncUserSchema>;