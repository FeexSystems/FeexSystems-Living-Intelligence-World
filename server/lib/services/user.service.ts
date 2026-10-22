import { PrismaClient, User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { 
  RegisterUserInput, 
  UpdateUserProfileInput, 
  CreateUserInput 
} from '../validations/user';

/**
 * Detect a Prisma unique-constraint violation (P2002).
 *
 * Used to make the first-sign-in provisioning path idempotent under
 * concurrent requests: two parallel first-time requests can both attempt to
 * create the row, and exactly one of them must win.
 */
function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return code === 'P2002';
}

export class UserService {
  constructor(private prisma: PrismaClient) {}
  /**
   * Create a new user
   */
  async createUser(userData: RegisterUserInput): Promise<Omit<User, 'passwordHash'>> {
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
  async createUserByAdmin(userData: CreateUserInput): Promise<Omit<User, 'passwordHash'>> {
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
  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
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
  async findUserByIdWithPassword(id: string): Promise<User | null> {
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
  async findOrCreateFirebaseUser(params: {
    firebaseUid: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
    emailVerified?: boolean;
    /**
     * When true, an already-existing row has its profile fields (name, avatar,
     * email-verified flag) refreshed from the supplied claims. The role is
     * never modified. Used by the explicit profile-sync endpoints.
     */
    updateExistingProfile?: boolean;
  }): Promise<Omit<User, 'passwordHash'>> {
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

    const normalizedEmail = email?.trim().toLowerCase();
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

    let created: User;
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
          emailVerified: emailVerified ?? false,
          profileImageUrl: profileImageUrl ?? null,
        },
      });
    } catch (error: unknown) {
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
   * Update user profile
   */
  async updateUserProfile(
    userId: string, 
    updateData: UpdateUserProfileInput
  ): Promise<Omit<User, 'passwordHash'>> {
    const dataToUpdate: any = {
      ...updateData,
      updatedAt: new Date(),
    };

    if (updateData.email) {
      dataToUpdate.email = updateData.email.toLowerCase();
      dataToUpdate.emailVerified = false;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    const {  ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user password
   */
  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
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
  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  /**
   * Mark email as verified
   */
  async verifyEmail(userId: string): Promise<void> {
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
  async updateLastLogin(userId: string): Promise<void> {
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
  async deleteUser(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });

    return !!user;
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string) {
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
  async getUsers(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
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
  async updateUserRole(userId: string, role: UserRole): Promise<Omit<User, 'passwordHash'>> {
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
  async getUserActivity(userId: string, days: number = 30) {
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