import { PrismaClient, User } from '@prisma/client';
import { AuthError } from '../auth';
import { updateFirebaseUserEmail } from '../firebase-admin';
import { UserService } from './user.service';

/**
 * AuthService — profile operations only.
 *
 * Firebase Auth owns identity, registration, login, session/refresh tokens and
 * password management. This service therefore exposes NO token minting: the
 * former JWT access/refresh issuance (JWTService) and the refresh-token/session
 * bookkeeping were removed together with the app-issued JWT layer.
 */
export class AuthService {
  private userService: UserService;

  constructor(prisma: PrismaClient) {
    this.userService = new UserService(prisma);
  }

  /**
   * Strip the password hash before a user object is serialized to a response.
   *
   * `Omit<User, 'passwordHash'>` is a compile-time type only — it does not
   * remove the field at runtime, so returning a raw User row would leak the
   * bcrypt hash into profile responses.
   */
  private toPublicUser(
    user: User | Omit<User, 'passwordHash'>
  ): Omit<User, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...publicUser } = user as User;
    return publicUser;
  }

  /**
   * Get user profile (authenticated)
   *
   * The profile is resolved through `findOrCreateFirebaseUser`, so a
   * first-time signer-in is provisioned on demand instead of failing with
   * USER_NOT_FOUND. The Firebase UID is the authoritative primary key.
   *
   * `claims` carries the verified token's profile fields. They are only used
   * when provisioning a new row; an existing row keeps its stored values.
   */
  async getProfile(
    userId: string,
    claims?: {
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
      emailVerified?: boolean;
      updateExistingProfile?: boolean;
    }
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userService.findOrCreateFirebaseUser({
      firebaseUid: userId,
      email: claims?.email,
      firstName: claims?.firstName,
      lastName: claims?.lastName,
      profileImageUrl: claims?.profileImageUrl,
      emailVerified: claims?.emailVerified,
      updateExistingProfile: claims?.updateExistingProfile,
    });
    return this.toPublicUser(user);
  }

  /**
   * Update user profile (authenticated)
   *
   * The email is intentionally NOT part of `updateData`. Firebase Auth owns
   * identity, so the local email is a projection of the Firebase value; letting
   * the client write it directly would desynchronise the two and — because
   * legacy rows are re-keyed onto the Firebase UID by email match — could be
   * used to capture another user's row. Use `changeEmail` for that.
   */
  async updateProfile(
    userId: string,
    updateData: Partial<{ firstName: string; lastName: string; profileImageUrl: string | null }>
  ): Promise<Omit<User, 'passwordHash'>> {
    return this.userService.updateUserProfile(userId, updateData);
  }

  /**
   * Change the account's email address.
   *
   * Firebase Auth is the source of truth for identity, so the new address is
   * applied to Firebase FIRST. Only once Firebase has accepted it is the local
   * projection updated. If Firebase rejects the change (for example because
   * the address is already in use) the local row is left untouched, so the two
   * stores never diverge.
   */
  async changeEmail(userId: string, email: string): Promise<Omit<User, 'passwordHash'>> {
    const normalizedEmail = email.trim().toLowerCase();

    // The new address must not already belong to a different account.
    const existingUser = await this.userService.findUserByEmail(normalizedEmail);
    if (existingUser && existingUser.id !== userId) {
      throw new AuthError('Email is already taken', 'EMAIL_ALREADY_TAKEN', 400);
    }

    // Apply to Firebase first. If this throws, the local row is unchanged.
    try {
      await updateFirebaseUserEmail(userId, normalizedEmail);
    } catch (error) {
      throw new AuthError(
        'Unable to update the email address. Please sign out, sign in again and retry.',
        'EMAIL_UPDATE_FAILED',
        400
      );
    }

    // Mirror the new address onto the local projection. Firebase has already
    // accepted the change, so this cannot fail on a uniqueness conflict.
    return this.userService.updateUserEmail(userId, normalizedEmail);
  }
}
