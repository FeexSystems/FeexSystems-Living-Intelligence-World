 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }








import bcrypt from 'bcryptjs';
import { prismaMock } from '../prisma-mock';
import { mockUsers } from '../../routes/mock-auth';
import { JWTService } from '../../lib/auth';

/** Minimal user shape returned by createTestUser */
















/**
 * Creates a synthetic test user in prismaMock and in-memory mock-auth.
 * Generates valid JWT tokens using JWTService.
 */
export async function createTestUser(
  overrides







,
  _prismaClient
) {
  const id = _nullishCoalesce(_optionalChain([overrides, 'optionalAccess', _ => _.id]), () => ( `test-user-${Math.random().toString(36).slice(2, 9)}`));
  const email = (_nullishCoalesce(_optionalChain([overrides, 'optionalAccess', _2 => _2.email]), () => ( `test-${id}@example.com`))).toLowerCase();
  const firstName = _nullishCoalesce(_optionalChain([overrides, 'optionalAccess', _3 => _3.firstName]), () => ( 'Test'));
  const lastName = _nullishCoalesce(_optionalChain([overrides, 'optionalAccess', _4 => _4.lastName]), () => ( 'User'));
  const emailVerified = _optionalChain([overrides, 'optionalAccess', _5 => _5.emailVerified]) !== undefined ? overrides.emailVerified : true;
  const role = _nullishCoalesce((_optionalChain([overrides, 'optionalAccess', _6 => _6.role]) ), () => ( 'USER'));
  const password = _nullishCoalesce(_optionalChain([overrides, 'optionalAccess', _7 => _7.password]), () => ( 'password123'));
  const passwordHash = bcrypt.hashSync(password, 10);

  const now = new Date();

  // 1. Insert into prismaMock in-memory tables
  try {
    await (prismaMock ).user.upsert({
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
  } catch (e) {
    try {
      await (prismaMock ).user.create({
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
    } catch (e2) {
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

  const targetPrisma = _prismaClient || (prismaMock );
  try {
    await targetPrisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: id,
        token: rawToken,
        expiresAt,
      },
    });
  } catch (e3) {
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
  countOrPrisma = 3,
  overridesOrCount
) {
  let count = 3;
  let overrides = {};

  if (typeof countOrPrisma === 'number') {
    count = countOrPrisma;
    overrides = overridesOrCount || {};
  } else if (typeof overridesOrCount === 'number') {
    count = overridesOrCount;
  }

  const users = [];
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
  userId
) {
  const sessionId = `session-${Math.random().toString(36).slice(2, 9)}`;
  const token = JWTService.generateAccessToken({
    id: userId,
    email: `user-${userId}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    role: 'USER' ,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    profileImageUrl: null,
  });

  try {
    await (prismaMock ).session.create({
      data: {
        id: sessionId,
        userId,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
    });
  } catch (e4) {}

  return { id: sessionId, token, userId };
}

/**
 * Returns prismaMock for tests expecting a test database instance.
 */
export async function createTestDatabase() {
  return prismaMock;
}

/**
 * Sets up the test database (returns prismaMock).
 */
export async function setupTestDatabase() {
  return prismaMock;
}

/**
 * Cleans up the test database (resets in-memory mock or deletes test records).
 */
export async function cleanupTestDatabase(client) {
  const p = client || prismaMock;
  try {
    if (typeof p.reset === 'function') {
      p.reset();
    } else {
      await _optionalChain([p, 'access', _8 => _8.activityLog, 'optionalAccess', _9 => _9.deleteMany, 'optionalCall', _10 => _10(), 'access', _11 => _11.catch, 'call', _12 => _12(() => {})]);
      await _optionalChain([p, 'access', _13 => _13.refreshToken, 'optionalAccess', _14 => _14.deleteMany, 'optionalCall', _15 => _15(), 'access', _16 => _16.catch, 'call', _17 => _17(() => {})]);
      await _optionalChain([p, 'access', _18 => _18.session, 'optionalAccess', _19 => _19.deleteMany, 'optionalCall', _20 => _20(), 'access', _21 => _21.catch, 'call', _22 => _22(() => {})]);
      await _optionalChain([p, 'access', _23 => _23.aIRequest, 'optionalAccess', _24 => _24.deleteMany, 'optionalCall', _25 => _25(), 'access', _26 => _26.catch, 'call', _27 => _27(() => {})]);
      await _optionalChain([p, 'access', _28 => _28.deployment, 'optionalAccess', _29 => _29.deleteMany, 'optionalCall', _30 => _30(), 'access', _31 => _31.catch, 'call', _32 => _32(() => {})]);
      await _optionalChain([p, 'access', _33 => _33.pipeline, 'optionalAccess', _34 => _34.deleteMany, 'optionalCall', _35 => _35(), 'access', _36 => _36.catch, 'call', _37 => _37(() => {})]);
      await _optionalChain([p, 'access', _38 => _38.repository, 'optionalAccess', _39 => _39.deleteMany, 'optionalCall', _40 => _40(), 'access', _41 => _41.catch, 'call', _42 => _42(() => {})]);
      await _optionalChain([p, 'access', _43 => _43.securityScan, 'optionalAccess', _44 => _44.deleteMany, 'optionalCall', _45 => _45(), 'access', _46 => _46.catch, 'call', _47 => _47(() => {})]);
      await _optionalChain([p, 'access', _48 => _48.usageMetrics, 'optionalAccess', _49 => _49.deleteMany, 'optionalCall', _50 => _50(), 'access', _51 => _51.catch, 'call', _52 => _52(() => {})]);
      await _optionalChain([p, 'access', _53 => _53.teamMember, 'optionalAccess', _54 => _54.deleteMany, 'optionalCall', _55 => _55(), 'access', _56 => _56.catch, 'call', _57 => _57(() => {})]);
      await _optionalChain([p, 'access', _58 => _58.workspace, 'optionalAccess', _59 => _59.deleteMany, 'optionalCall', _60 => _60(), 'access', _61 => _61.catch, 'call', _62 => _62(() => {})]);
      await _optionalChain([p, 'access', _63 => _63.team, 'optionalAccess', _64 => _64.deleteMany, 'optionalCall', _65 => _65(), 'access', _66 => _66.catch, 'call', _67 => _67(() => {})]);
      await _optionalChain([p, 'access', _68 => _68.subscription, 'optionalAccess', _69 => _69.deleteMany, 'optionalCall', _70 => _70(), 'access', _71 => _71.catch, 'call', _72 => _72(() => {})]);
      await _optionalChain([p, 'access', _73 => _73.plan, 'optionalAccess', _74 => _74.deleteMany, 'optionalCall', _75 => _75(), 'access', _76 => _76.catch, 'call', _77 => _77(() => {})]);
      await _optionalChain([p, 'access', _78 => _78.user, 'optionalAccess', _79 => _79.deleteMany, 'optionalCall', _80 => _80(), 'access', _81 => _81.catch, 'call', _82 => _82(() => {})]);
    }
  } catch (e5) {}
}

export { createTestDatabase as getTestDatabase };