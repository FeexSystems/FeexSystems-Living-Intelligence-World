
import { mockDeep, mockReset } from 'vitest-mock-extended';


// Create a deep mock of the PrismaClient
const mockPrisma = mockDeep();

// Reset the mock before each test
beforeEach(() => {
  mockReset(mockPrisma);
});

export { mockPrisma };
