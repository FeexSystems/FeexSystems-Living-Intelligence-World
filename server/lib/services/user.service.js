 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {



  isSafeProfileImageUrl
} from '../validations/user';
import { AuthError } from '../auth';

/**
 * Detect a Prisma unique-constraint violation (P2002).
 *
 * Used to make the first-sign-in provisioning path idempotent under
 * concurrent requests: two parallel first-time requests can both attempt to
 * create the row, and exactly one of them must win.
 */
function isUniqueConstraintError(error) {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error ).code;
  return code === 'P2002';
}

export class UserService {
  constructor( prisma) {;this.prisma = prisma;}
  /**
   * Create a new user
   */
  async createUser(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const user = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: userData.email.toLowerCase(),
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
    });

    // Return user without password hash
    const {  ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Create user by admin (with additional options)
   */
  async createUserByAdmin(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const user = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: userData.email.toLowerCase(),
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || UserRole.USER,
        emailVerified: userData.emailVerified || false,
      },
    });

    const {  ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Find user by ID
   */
  async findUserById(id) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    const {  ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Find user by ID with password (for authentication)
   */
  async findUserByIdWithPassword(id) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Resolve a Firebase-authenticated principal to a local `users` row,
   * provisioning the row on first sign-in.
   *
   * The database is a projection of Firebase Auth identity, so the Firebase UID
   * is the authoritative primary key (`users.id`). A user who authenticated
   * successfully but has no local row yet is a first-time signer-in, not an
   * error — the row is created here with safe, non-privileged defaults.
   *
   * Two cases are reconciled:
   *  1. No row with this UID and no row with this email -> create one.
   *  2. No row with this UID, but a row with this email exists (e.g. created by
   *     the legacy password path, which used a random UUID rather than the
   *     Firebase UID) -> re-key that row onto the Firebase UID so subsequent
   *     lookups by UID resolve. The pre-existing role is preserved in that
   *     case, because the row was already provisioned under an explicit role.
   *
   * New rows always default to `UserRole.USER`; role escalation is an
   * explicit, out-of-band administrative action.
   */
  async findOrCreateFirebaseUser(params












) {
    const {
      firebaseUid,
      email,
      firstName,
      lastName,
      profileImageUrl,
      emailVerified,
      updateExistingProfile = false,
    } = params;

    const byUid = await this.prisma.user.findUnique({ where: { id: firebaseUid } });
    if (byUid) {
      if (!updateExistingProfile) {
        const { passwordHash: _passwordHash, ...userWithoutPassword } = byUid;
        return userWithoutPassword;
      }

      const updated = await this.prisma.user.update({
        where: { id: firebaseUid },
        data: {
          ...(email ? { email: email.trim().toLowerCase() } : {}),
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          ...(profileImageUrl ? { profileImageUrl } : {}),
          ...(emailVerified !== undefined ? { emailVerified } : {}),
        },
      });
      const { passwordHash: _passwordHash, ...userWithoutPassword } = updated;
      return userWithoutPassword;
    }

    const normalizedEmail = _optionalChain([email, 'optionalAccess', _ => _.trim, 'call', _2 => _2(), 'access', _3 => _3.toLowerCase, 'call', _4 => _4()]);
    const byEmail = normalizedEmail
      ? await this.prisma.user.findUnique({ where: { email: normalizedEmail } })
      : null;

    if (byEmail) {
      // Re-key the pre-existing row onto the Firebase UID.
      const rekeyed = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          id: firebaseUid,
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          ...(profileImageUrl ? { profileImageUrl } : {}),
          ...(emailVerified !== undefined ? { emailVerified } : {}),
        },
      });
      const { passwordHash: _passwordHash, ...userWithoutPassword } = rekeyed;
      return userWithoutPassword;
    }

    let created;
    try {
      created = await this.prisma.user.create({
        data: {
          id: firebaseUid,
          email: normalizedEmail || `${firebaseUid}@users.noreply.firebaseid.com`,
          // Firebase Auth owns credentials; there is no local password to verify.
          passwordHash: 'FIREBASE_AUTH_MANAGED',
          firstName: firstName || 'Feex',
          lastName: lastName || 'Explorer',
          role: UserRole.USER,
          emailVerified: _nullishCoalesce(emailVerified, () => ( false)),
          profileImageUrl: _nullishCoalesce(profileImageUrl, () => ( null)),
        },
      });
    } catch (error) {
      // Unique-violation race: two concurrent first requests both tried to
      // create the row. The winner's row is authoritative, so re-read it.
      if (isUniqueConstraintError(error)) {
        const existing = await this.prisma.user.findUnique({
          where: { id: firebaseUid },
        });
        if (existing) {
          const { passwordHash: _passwordHash, ...userWithoutPassword } = existing;
          return userWithoutPassword;
        }
      }
      throw error;
    }

    const { passwordHash: _passwordHash, ...userWithoutPassword } = created;
    return userWithoutPassword;
  }

  /**
   * Update the mutable profile fields (name, avatar).
   *
   * The email is intentionally NOT part of `UpdateUserProfileInput`. Firebase
   * Auth owns identity, so the email on this row is a projection of the
   * Firebase value. Accepting a body-supplied email would let a caller
   * rewrite the email on their own row and — because legacy rows are re-keyed
   * onto the Firebase UID by email match — that could be used to capture
   * another user's row. Use `updateUserEmail` for that.
   */
  async updateUserProfile(
    userId,
    updateData
  ) {
    // Defence in depth: the HTTP layer already rejects `email`/`role` (and any
    // other unknown key) through `updateUserProfileSchema.strict()`. The
    // service re-whitelists the fields it is allowed to touch so that a future
    // caller cannot smuggle a privileged column through this method.
    const dataToUpdate = {};

    if (typeof updateData.firstName === 'string') {
      dataToUpdate.firstName = updateData.firstName;
    }
    if (typeof updateData.lastName === 'string') {
      dataToUpdate.lastName = updateData.lastName;
    }
    if (updateData.profileImageUrl !== undefined) {
      if (updateData.profileImageUrl !== null && !isSafeProfileImageUrl(updateData.profileImageUrl)) {
        throw new AuthError(
          'Image URL must be an http(s) URL or a server-hosted upload path',
          'INVALID_PROFILE_IMAGE_URL',
          400
        );
      }
      dataToUpdate.profileImageUrl = updateData.profileImageUrl;
    }

    // `email` and `role` are NEVER writable here — Firebase Auth owns the
    // email and role escalation is an explicit, out-of-band administrative
    // action (see `admin.service.ts`).

    dataToUpdate.updatedAt = new Date();

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Mirror a Firebase-verified email change onto the local projection.
   *
   * This is only ever called AFTER Firebase Auth has accepted the new
   * address, so the email is already known to be unique and verified there.
   * The local row is updated to match — never the other way around.
   */
  async updateUserEmail(
    userId,
    email
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: email.toLowerCase(),
        emailVerified: false,
        updatedAt: new Date(),
      },
    });

    const {  ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user password
   */
  async updateUserPassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Verify user password
   */
  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.passwordHash);
  }

  /**
   * Mark email as verified
   */
  async verifyEmail(userId) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete user account
   */
  async deleteUser(userId) {
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Check if email exists
   */
  async emailExists(email) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });

    return !!user;
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId) {
    const [
      aiRequestsCount,
      repositoriesCount,
      securityScansCount,
      subscriptions,
    ] = await Promise.all([
      this.prisma.aIRequest.count({ where: { userId } }),
      this.prisma.repository.count({ where: { userId } }),
      this.prisma.securityScan.count({ where: { userId } }),
      this.prisma.subscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      }),
    ]);

    return {
      aiRequestsCount,
      repositoriesCount,
      securityScansCount,
      currentSubscription: subscriptions[0] || null,
    };
  }

  /**
   * Get users with pagination
   */
  async getUsers(page = 1, limit = 10, search) {
    const skip = (page - 1) * limit;
    
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive'  } },
            { firstName: { contains: search, mode: 'insensitive'  } },
            { lastName: { contains: search, mode: 'insensitive'  } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId, role) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role,
        updatedAt: new Date(),
      },
    });

    const {  ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get user activity summary
   */
  async getUserActivity(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [aiRequests, deployments, securityScans] = await Promise.all([
      this.prisma.aIRequest.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          serviceId: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deployment.findMany({
        where: {
          repository: { userId },
          startedAt: { gte: startDate },
        },
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
        },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.securityScan.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          scanType: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      aiRequests,
      deployments,
      securityScans,
      summary: {
        totalAiRequests: aiRequests.length,
        totalDeployments: deployments.length,
        totalSecurityScans: securityScans.length,
        successfulDeployments: deployments.filter(d => d.status === 'SUCCESS').length,
        completedScans: securityScans.filter(s => s.status === 'COMPLETED').length,
      },
    };
  }
}