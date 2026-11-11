import { beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

// Create a deep mock of the PrismaClient
const mockPrisma = mockDeep<PrismaClient>();

// Reset the mock before each test
beforeEach(() => {
  mockReset(mockPrisma);
});

export { mockPrisma };
