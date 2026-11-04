 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
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
  

  constructor(prisma) {
    this.userService = new UserService(prisma);
  }

  /**
   * Strip the password hash before a user object is serialized to a response.
   *
   * `Omit<User, 'passwordHash'>` is a compile-time type only — it does not
   * remove the field at runtime, so returning a raw User row would leak the
   * bcrypt hash into profile responses.
   */
   toPublicUser(
    user
  ) {
    const { passwordHash: _passwordHash, ...publicUser } = user ;
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
    userId,
    claims







  ) {
    const user = await this.userService.findOrCreateFirebaseUser({
      firebaseUid: userId,
      email: _optionalChain([claims, 'optionalAccess', _ => _.email]),
      firstName: _optionalChain([claims, 'optionalAccess', _2 => _2.firstName]),
      lastName: _optionalChain([claims, 'optionalAccess', _3 => _3.lastName]),
      profileImageUrl: _optionalChain([claims, 'optionalAccess', _4 => _4.profileImageUrl]),
      emailVerified: _optionalChain([claims, 'optionalAccess', _5 => _5.emailVerified]),
      updateExistingProfile: _optionalChain([claims, 'optionalAccess', _6 => _6.updateExistingProfile]),
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
    userId,
    updateData
  ) {
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
  async changeEmail(userId, email) {
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
