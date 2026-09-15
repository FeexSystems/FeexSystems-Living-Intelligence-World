 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';






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
    const { passwordHash, ...userWithoutPassword } = user;
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

    const { passwordHash, ...userWithoutPassword } = user;
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

    const { passwordHash, ...userWithoutPassword } = user;
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
   * Update user profile
   */
  async updateUserProfile(
    userId, 
    updateData
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        email: _optionalChain([updateData, 'access', _ => _.email, 'optionalAccess', _2 => _2.toLowerCase, 'call', _3 => _3()]),
        updatedAt: new Date(),
      },
    });

    const { passwordHash, ...userWithoutPassword } = user;
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

    const { passwordHash, ...userWithoutPassword } = user;
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