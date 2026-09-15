import { PrismaClient } from '@prisma/client';

let testPrisma: PrismaClient | null = null;

export async function createTestDatabase(): Promise<PrismaClient> {
  if (testPrisma) {
    return testPrisma;
  }

  // Use a test database URL or in-memory database
  const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set for testing');
  }

  testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'test' ? [] : ['error'],
  });

  await testPrisma.$connect();
  return testPrisma;
}

export async function cleanupTestDatabase(prisma?: PrismaClient): Promise<void> {
  const client = prisma || testPrisma;
  if (!client) return;

  // Clean up all test data in correct order (respecting foreign key constraints)
  await client.activityLog?.deleteMany?.();
  await client.refreshToken?.deleteMany?.();
  await client.session?.deleteMany?.();
  await client.aIRequest?.deleteMany?.();
  await client.deployment?.deleteMany?.();
  await client.pipeline?.deleteMany?.();
  await client.repository?.deleteMany?.();
  await client.securityScan?.deleteMany?.();
  await client.usageMetrics?.deleteMany?.();
  await client.teamMember?.deleteMany?.();
  await client.workspace?.deleteMany?.();
  await client.team?.deleteMany?.();
  await client.subscription?.deleteMany?.();
  await client.plan?.deleteMany?.();
  await client.stripeWebhookEvent?.deleteMany?.();
  await client.user?.deleteMany?.();
  
  if (!prisma) {
    await client.$disconnect();
    testPrisma = null;
  }
}

export async function createTestUser(userData?: Partial<{
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
}>, prisma?: PrismaClient) {
  const client = prisma || testPrisma;
  if (!client) {
    throw new Error('Database client not available. Call setupTestDatabase first.');
  }

  const { AuthService } = await import('../../lib/services/auth.service');
  const authService = new AuthService(client);

  const defaultUserData = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    firstName: 'Test',
    lastName: 'User',
    ...userData,
  };

  const result = await authService.register(defaultUserData);
  return result.user;
}

export async function createTestUsers(prisma: PrismaClient, count: number = 3) {
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const user = await createTestUser(prisma, {
      email: `test${i + 1}@example.com`,
      firstName: `Test${i + 1}`,
      lastName: `User${i + 1}`,
    });
    users.push(user);
  }
  
  return users;
}

// Convenience functions for the new test structure
export async function setupTestDatabase(): Promise<PrismaClient> {
  return createTestDatabase();
}

export { createTestDatabase as getTestDatabase };