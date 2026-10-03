import { PrismaClient } from '@prisma/client';
import { PrismockClient } from 'prismock';
import { beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';

// ── CRITICAL: Set JWT env vars BEFORE any module imports JWTService ──────────
// JWTService throws on import if these are missing or < 16 chars.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-min16chars!!';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-min16ch!!';
process.env.USE_MOCK_AUTH = process.env.USE_MOCK_AUTH ?? 'true';
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
  verifyFirebaseToken: vi.fn().mockImplementation(async (token) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret-key') as any;
    return {
      uid: decoded.userId || decoded.id || decoded.sub, // Added fallbacks
      email: decoded.email,
      email_verified: true
    };
  }),
  isFirebaseAdminConfigured: vi.fn().mockReturnValue(true),
  getFirebaseUser: vi.fn().mockResolvedValue(null),
  setFirebaseCustomClaims: vi.fn().mockResolvedValue(undefined),
  deleteFirebaseUser: vi.fn().mockResolvedValue(undefined)
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

