/**
 * Test database helpers — mock-based, no live DB required.
 *
 * This file provides mock-safe helpers for integration tests.
 * The real PrismaClient is replaced by prismaMock (via prisma-mock.ts setupFile).
 * These helpers operate directly on the mock without ever opening a connection.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prismaMock } from '../prisma-mock';
import { mockUsers } from '../../routes/mock-auth';
import { JWTService } from '../../lib/auth';

/** Minimal user shape returned by createTestUser */
export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  createdAt: string;
  updatedAt?: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user?: any;
}

/**
 * Creates a synthetic test user in prismaMock and in-memory mock-auth.
 * Generates valid JWT tokens using JWTService.
 */
export async function createTestUser(
  overrides?: Partial<{
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  }>,
  _prismaClient?: any
): Promise<TestUser> {
  const id = overrides?.id ?? `test-user-${Math.random().toString(36).slice(2, 9)}`;
  const email = (overrides?.email ?? `test-${id}@example.com`).toLowerCase();
  const firstName = overrides?.firstName ?? 'Test';
  const lastName = overrides?.lastName ?? 'User';
  const emailVerified = overrides?.emailVerified !== undefined ? overrides.emailVerified : true;
  const role = (overrides?.role as any) ?? 'USER';
  const password = overrides?.password ?? 'password123';
  const passwordHash = bcrypt.hashSync(password, 10);

  const now = new Date();

  // 1. Insert into prismaMock in-memory tables
  try {
    await (prismaMock as any).user.upsert({
      where: { id },
      update: {
        email,
        firstName,
        lastName,
        passwordHash,
        emailVerified,
        role,
        updatedAt: now,
      },
      create: {
        id,
        email,
        firstName,
        lastName,
        passwordHash,
        role,
        emailVerified,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch {
    try {
      await (prismaMock as any).user.create({
        data: {
          id,
          email,
          firstName,
          lastName,
          passwordHash,
          role,
          emailVerified,
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch {
      // Ignore if user already exists
    }
  }

  // 2. Also register into mockUsers map for mock-auth routes
  mockUsers.set(id, {
    id,
    email,
    password: passwordHash,
    firstName,
    lastName,
    role,
    emailVerified,
    createdAt: now,
  });

  // 3. Generate tokens using JWTService
  const userPayload = {
    id,
    email,
    firstName,
    lastName,
    role,
    emailVerified,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    profileImageUrl: null,
  };

  const tokenId = `token-${Math.random().toString(36).slice(2, 9)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const rawToken = `rt_${Math.random().toString(36).slice(2, 9)}`;

  const targetPrisma = _prismaClient || (prismaMock as any);
  try {
    await targetPrisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: id,
        token: rawToken,
        expiresAt,
      },
    });
  } catch {
    // Ignore if already created
  }

  const accessToken = JWTService.generateAccessToken(userPayload);
  const refreshToken = JWTService.generateRefreshToken(id, tokenId);

  return {
    id,
    email,
    firstName,
    lastName,
    emailVerified,
    role,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    tokens: { accessToken, refreshToken },
    user: userPayload,
  };
}

/**
 * Creates multiple synthetic test users.
 */
export async function createTestUsers(
  countOrPrisma: number | any = 3,
  overridesOrCount?: any
): Promise<TestUser[]> {
  let count = 3;
  let overrides: any = {};

  if (typeof countOrPrisma === 'number') {
    count = countOrPrisma;
    overrides = overridesOrCount || {};
  } else if (typeof overridesOrCount === 'number') {
    count = overridesOrCount;
  }

  const users: TestUser[] = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      email: `test${i + 1}-${Math.random().toString(36).slice(2, 7)}@example.com`,
      firstName: `Test${i + 1}`,
      ...overrides,
    });
    users.push(user);
  }
  return users;
}

/**
 * Creates a test session for AI / route testing.
 */
export async function createTestSession(
  userId: string
): Promise<{ id: string; token: string; userId: string }> {
  const sessionId = `session-${Math.random().toString(36).slice(2, 9)}`;
  const token = JWTService.generateAccessToken({
    id: userId,
    email: `user-${userId}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    role: 'USER' as any,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    profileImageUrl: null,
  });

  try {
    await (prismaMock as any).session.create({
      data: {
        id: sessionId,
        userId,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
    });
  } catch {}

  return { id: sessionId, token, userId };
}

/**
 * Returns prismaMock for tests expecting a test database instance.
 */
export async function createTestDatabase(): Promise<PrismaClient> {
  return prismaMock;
}

/**
 * Sets up the test database (returns prismaMock).
 */
export async function setupTestDatabase(): Promise<PrismaClient> {
  return prismaMock;
}

/**
 * Cleans up the test database (resets in-memory mock or deletes test records).
 */
export async function cleanupTestDatabase(client?: any): Promise<void> {
  const p = client || prismaMock;
  try {
    if (typeof p.reset === 'function') {
      p.reset();
    } else {
      await p.activityLog?.deleteMany?.().catch(() => {});
      await p.refreshToken?.deleteMany?.().catch(() => {});
      await p.session?.deleteMany?.().catch(() => {});
      await p.aIRequest?.deleteMany?.().catch(() => {});
      await p.deployment?.deleteMany?.().catch(() => {});
      await p.pipeline?.deleteMany?.().catch(() => {});
      await p.repository?.deleteMany?.().catch(() => {});
      await p.securityScan?.deleteMany?.().catch(() => {});
      await p.usageMetrics?.deleteMany?.().catch(() => {});
      await p.teamMember?.deleteMany?.().catch(() => {});
      await p.workspace?.deleteMany?.().catch(() => {});
      await p.team?.deleteMany?.().catch(() => {});
      await p.subscription?.deleteMany?.().catch(() => {});
      await p.plan?.deleteMany?.().catch(() => {});
      await p.user?.deleteMany?.().catch(() => {});
    }
  } catch {}
}

export { createTestDatabase as getTestDatabase };