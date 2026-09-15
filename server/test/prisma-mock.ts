import { PrismaClient } from '@prisma/client';
import { PrismockClient } from 'prismock';
import { beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';

// Create an in-memory mock of the PrismaClient
export const prismaMock = new PrismockClient() as unknown as PrismaClient;

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
      uid: decoded.userId,
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
