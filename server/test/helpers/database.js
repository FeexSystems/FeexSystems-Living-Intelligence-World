 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { PrismaClient } from '@prisma/client';

let testPrisma = null;

export async function createTestDatabase() {
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

export async function cleanupTestDatabase(prisma) {
  const client = prisma || testPrisma;
  if (!client) return;

  // Clean up all test data in correct order (respecting foreign key constraints)
  await _optionalChain([client, 'access', _ => _.activityLog, 'optionalAccess', _2 => _2.deleteMany, 'optionalCall', _3 => _3()]);
  await _optionalChain([client, 'access', _4 => _4.refreshToken, 'optionalAccess', _5 => _5.deleteMany, 'optionalCall', _6 => _6()]);
  await _optionalChain([client, 'access', _7 => _7.session, 'optionalAccess', _8 => _8.deleteMany, 'optionalCall', _9 => _9()]);
  await _optionalChain([client, 'access', _10 => _10.aIRequest, 'optionalAccess', _11 => _11.deleteMany, 'optionalCall', _12 => _12()]);
  await _optionalChain([client, 'access', _13 => _13.deployment, 'optionalAccess', _14 => _14.deleteMany, 'optionalCall', _15 => _15()]);
  await _optionalChain([client, 'access', _16 => _16.pipeline, 'optionalAccess', _17 => _17.deleteMany, 'optionalCall', _18 => _18()]);
  await _optionalChain([client, 'access', _19 => _19.repository, 'optionalAccess', _20 => _20.deleteMany, 'optionalCall', _21 => _21()]);
  await _optionalChain([client, 'access', _22 => _22.securityScan, 'optionalAccess', _23 => _23.deleteMany, 'optionalCall', _24 => _24()]);
  await _optionalChain([client, 'access', _25 => _25.usageMetrics, 'optionalAccess', _26 => _26.deleteMany, 'optionalCall', _27 => _27()]);
  await _optionalChain([client, 'access', _28 => _28.teamMember, 'optionalAccess', _29 => _29.deleteMany, 'optionalCall', _30 => _30()]);
  await _optionalChain([client, 'access', _31 => _31.workspace, 'optionalAccess', _32 => _32.deleteMany, 'optionalCall', _33 => _33()]);
  await _optionalChain([client, 'access', _34 => _34.team, 'optionalAccess', _35 => _35.deleteMany, 'optionalCall', _36 => _36()]);
  await _optionalChain([client, 'access', _37 => _37.subscription, 'optionalAccess', _38 => _38.deleteMany, 'optionalCall', _39 => _39()]);
  await _optionalChain([client, 'access', _40 => _40.plan, 'optionalAccess', _41 => _41.deleteMany, 'optionalCall', _42 => _42()]);
  await _optionalChain([client, 'access', _43 => _43.stripeWebhookEvent, 'optionalAccess', _44 => _44.deleteMany, 'optionalCall', _45 => _45()]);
  await _optionalChain([client, 'access', _46 => _46.user, 'optionalAccess', _47 => _47.deleteMany, 'optionalCall', _48 => _48()]);
  
  if (!prisma) {
    await client.$disconnect();
    testPrisma = null;
  }
}

export async function createTestUser(userData





, prisma) {
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

export async function createTestUsers(prisma, count = 3) {
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
export async function setupTestDatabase() {
  return createTestDatabase();
}

export { createTestDatabase as getTestDatabase };