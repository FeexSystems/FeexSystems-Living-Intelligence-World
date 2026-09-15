
import crypto from 'crypto';

export class SessionService {
  constructor( prisma) {;this.prisma = prisma;}

  /**
   * Create a new session
   */
  async createSession(userId, expiresAt) {
    const token = this.generateSecureToken();

    return this.prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  /**
   * Find session by token
   */
  async findSessionByToken(token) {
    return this.prisma.session.findUnique({
      where: { token },
    });
  }

  /**
   * Find valid session by token (not expired)
   */
  async findValidSessionByToken(token) {
    return this.prisma.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Delete session by token
   */
  async deleteSession(token) {
    await this.prisma.session.delete({
      where: { token },
    });
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllUserSessions(userId) {
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * Delete expired sessions
   */
  async deleteExpiredSessions() {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }

  /**
   * Create a refresh token
   */
  async createRefreshToken(userId, expiresAt) {
    const token = this.generateSecureToken();

    return this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  /**
   * Find refresh token by token
   */
  async findRefreshTokenByToken(token) {
    return this.prisma.refreshToken.findUnique({
      where: { token },
    });
  }

  /**
   * Find valid refresh token by token (not expired)
   */
  async findValidRefreshTokenByToken(token) {
    return this.prisma.refreshToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Delete refresh token by token
   */
  async deleteRefreshToken(token) {
    await this.prisma.refreshToken.delete({
      where: { token },
    });
  }

  /**
   * Delete all refresh tokens for a user
   */
  async deleteAllUserRefreshTokens(userId) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Delete expired refresh tokens
   */
  async deleteExpiredRefreshTokens() {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }

  /**
   * Rotate refresh token (delete old, create new)
   */
  async rotateRefreshToken(
    oldToken, 
    userId, 
    expiresAt
  ) {
    // Delete the old token and create a new one in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Delete old token
      await tx.refreshToken.delete({
        where: { token: oldToken },
      });

      // Create new token
      const newToken = this.generateSecureToken();
      return tx.refreshToken.create({
        data: {
          userId,
          token: newToken,
          expiresAt,
        },
      });
    });
  }

  /**
   * Get user sessions with pagination
   */
  async getUserSessions(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.prisma.session.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          token: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
      this.prisma.session.count({ where: { userId } }),
    ]);

    return {
      sessions: sessions.map(session => ({
        ...session,
        token: this.maskToken(session.token), // Mask token for security
        isExpired: session.expiresAt < new Date(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user refresh tokens with pagination
   */
  async getUserRefreshTokens(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [tokens, total] = await Promise.all([
      this.prisma.refreshToken.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          token: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
      this.prisma.refreshToken.count({ where: { userId } }),
    ]);

    return {
      tokens: tokens.map(token => ({
        ...token,
        token: this.maskToken(token.token), // Mask token for security
        isExpired: token.expiresAt < new Date(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Clean up expired tokens (both sessions and refresh tokens)
   */
  async cleanupExpiredTokens() {
    const [sessionsDeleted, refreshTokensDeleted] = await Promise.all([
      this.deleteExpiredSessions(),
      this.deleteExpiredRefreshTokens(),
    ]);

    return { sessionsDeleted, refreshTokensDeleted };
  }

  /**
   * Get session statistics for a user
   */
  async getUserSessionStats(userId) {
    const [activeSessions, activeRefreshTokens, totalSessions, totalRefreshTokens] = await Promise.all([
      this.prisma.session.count({
        where: {
          userId,
          expiresAt: { gt: new Date() },
        },
      }),
      this.prisma.refreshToken.count({
        where: {
          userId,
          expiresAt: { gt: new Date() },
        },
      }),
      this.prisma.session.count({ where: { userId } }),
      this.prisma.refreshToken.count({ where: { userId } }),
    ]);

    return {
      activeSessions,
      activeRefreshTokens,
      totalSessions,
      totalRefreshTokens,
      expiredSessions: totalSessions - activeSessions,
      expiredRefreshTokens: totalRefreshTokens - activeRefreshTokens,
    };
  }

  /**
   * Revoke all user sessions and refresh tokens (logout from all devices)
   */
  async revokeAllUserTokens(userId) {
    await Promise.all([
      this.deleteAllUserSessions(userId),
      this.deleteAllUserRefreshTokens(userId),
    ]);
  }

  /**
   * Generate a cryptographically secure token
   */
   generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Mask token for display purposes (show only first and last 4 characters)
   */
   maskToken(token) {
    if (token.length <= 8) return '****';
    return `${token.slice(0, 4)}${'*'.repeat(token.length - 8)}${token.slice(-4)}`;
  }

  /**
   * Validate session token format
   */
  isValidTokenFormat(token) {
    // Check if token is a valid hex string of expected length (64 characters for 32 bytes)
    return /^[a-f0-9]{64}$/i.test(token);
  }

  /**
   * Get session with user information
   */
  async getSessionWithUser(token) {
    return this.prisma.session.findUnique({
      where: { token },
      include: {
        user: {
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
        },
      },
    });
  }

  /**
   * Get refresh token with user information
   */
  async getRefreshTokenWithUser(token) {
    return this.prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: {
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
        },
      },
    });
  }
}