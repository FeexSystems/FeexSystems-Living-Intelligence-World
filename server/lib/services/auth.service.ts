import { PrismaClient, User } from '@prisma/client';
import { AuthError } from '../auth';
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

    return this.userService.updateUserProfile(userId, updateData);
  }
}
