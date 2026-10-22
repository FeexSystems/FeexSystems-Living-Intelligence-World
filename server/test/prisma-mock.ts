import { PrismaClient } from '@prisma/client';
import { PrismockClient } from 'prismock';
import { beforeEach, vi } from 'vitest';

// ── Env for the test process ────────────────────────────────────────────────
// Firebase Auth is the single source of truth; there are no app-issued JWT
// secrets. Requests authenticate through the mocked `verifyFirebaseToken`
// below, which accepts the opaque test tokens minted by createTestUser().
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/testdb';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-at-least-32-chars!';
process.env.USE_MOCK_AUTH = 'false';
// ─────────────────────────────────────────────────────────────────────────────


// Create an in-memory mock of the PrismaClient
export const prismaMock = new PrismockClient() as unknown as PrismaClient;

// Patch BigInt serialization globally for test environments
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Mock the internal database module used throughout the server
vi.mock('@server/lib/database', () => ({
  prisma: prismaMock,
  db: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
  checkDatabaseHealth: vi.fn().mockResolvedValue({ status: 'healthy', timestamp: new Date().toISOString() })
}));

// Mock relative imports as well just in case
vi.mock('../lib/database', () => ({
  prisma: prismaMock,
  db: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
  checkDatabaseHealth: vi.fn().mockResolvedValue({ status: 'healthy', timestamp: new Date().toISOString() })
}));

// Mock the official @prisma/client so that 'new PrismaClient()' returns the mock
vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@prisma/client')>();
  return {
    ...actual,
    PrismaClient: class {
      constructor() {
        return prismaMock;
      }
    },
  };
});

// Reset the mock data before each test to ensure test isolation
beforeEach(() => {
  (prismaMock as any).reset();
});

// --- REDIS MOCK ---
vi.mock('ioredis', () => {
  const store = new Map();
  return {
    default: class MockRedis {
      async incr(key: string) {
        const val = (store.get(key) || 0) + 1;
        store.set(key, val);
        return val;
      }
      async expire(key: string, ttl: number) { return 1; }
      async get(key: string) { return store.get(key); }
      async del(key: string) { store.delete(key); return 1; }
      async ping() { return 'PONG'; }
      on() {}
      quit() {}
      disconnect() {}
    }
  };
});

// --- FIREBASE MOCK ---
const mockFirebaseAdmin = {
  // Accepts the opaque test tokens minted by createTestUser():
  //   "feex-firebase:<uid>:<email>"
  //
  // Anything that is NOT a well-formed test token is rejected, exactly like the
  // real `firebase-admin.verifyIdToken` rejects a malformed/expired ID token.
  // This matters because the auth middleware now PROVISIONS a row for any
  // successfully verified token (a first-time signer-in is not an error), so a
  // permissive mock would silently authenticate `Bearer invalid-token`.
  verifyFirebaseToken: vi.fn().mockImplementation(async (token: string) => {
    const raw = String(token);
    if (!raw.startsWith('feex-firebase:')) {
      throw new Error('Invalid test Firebase token');
    }
    // Split on the FIRST colon only — the remainder is the email, which may
    // itself contain colons in other schemes.
    const rest = raw.slice('feex-firebase:'.length);
    const separator = rest.indexOf(':');
    const uid = separator === -1 ? rest : rest.slice(0, separator);
    const email = separator === -1 ? undefined : rest.slice(separator + 1);
    if (!uid) throw new Error('Invalid test Firebase token');
    return {
      uid,
      email: email || `${uid}@example.com`,
      email_verified: true,
    };
  }),
  isFirebaseAdminConfigured: vi.fn().mockReturnValue(true),
  getFirebaseUser: vi.fn().mockResolvedValue(null),
  setFirebaseCustomClaims: vi.fn().mockResolvedValue(undefined),
  deleteFirebaseUser: vi.fn().mockResolvedValue(undefined),
  updateFirebaseUserEmail: vi.fn().mockResolvedValue(undefined)
};

vi.mock('@server/lib/firebase-admin', () => mockFirebaseAdmin);
vi.mock('../lib/firebase-admin', () => mockFirebaseAdmin);
vi.mock('../../lib/firebase-admin', () => mockFirebaseAdmin);

// --- DOCKERODE MOCK ---
vi.mock('dockerode', () => {
  class MockDocker {
    createContainer = vi.fn().mockResolvedValue({
      start: vi.fn().mockResolvedValue(undefined),
      logs: vi.fn().mockResolvedValue({
        on: vi.fn(),
      }),
      wait: vi.fn().mockResolvedValue({ StatusCode: 0 }),
      remove: vi.fn().mockResolvedValue(undefined),
    });
  }
  return {
    default: MockDocker,
  };
});

// --- BIGQUERY MOCK ---
vi.mock('@google-cloud/bigquery', () => {
  class MockBigQuery {
    dataset = vi.fn().mockReturnValue({
      table: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue([{}]),
      }),
    });
  }
  return {
    BigQuery: MockBigQuery,
    default: { BigQuery: MockBigQuery },
  };
});

