
import bcryptjs from 'bcryptjs';

/**
 * Create a test user fixture with hashed password.
 * 
 * @param overrides - Optional partial user object to override defaults
 * @returns Promise resolving to a properly typed User object
 * 
 * @example
 * const user = await createTestUser({ email: 'custom@feex.local' });
 */
export async function createTestUser(overrides) {
  const passwordHash = await bcryptjs.hash('TestPassword123!', 10);

  return {
    id: 'user-test-001',
    email: 'test@feex.local',
    passwordHash,
    firstName: 'Test',
    lastName: 'User',
    profileImageUrl: null,
    role: 'USER',
    emailVerified: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: null,
    ...overrides,
  };
}

/**
 * Create an admin user fixture.
 * 
 * @param overrides - Optional partial user object to override defaults
 * @returns Promise resolving to a properly typed User object with admin role
 * 
 * @example
 * const admin = await createAdminUser({ email: 'admin@feex.local' });
 */
export async function createAdminUser(
  overrides
) {
  return createTestUser({ role: 'ADMIN', ...overrides });
}

/**
 * Create multiple test users with unique IDs and emails.
 * 
 * @param count - Number of users to create (default 3)
 * @returns Promise resolving to an array of properly typed User objects
 * 
 * @example
 * const users = await createTestUsers(5);
 * // Creates users with IDs: user-test-000, user-test-001, user-test-002, user-test-003, user-test-004
 * // And emails: user0@feex.local, user1@feex.local, user2@feex.local, user3@feex.local, user4@feex.local
 */
export async function createTestUsers(count = 3) {
  const users = [];

  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      id: `user-test-${i.toString().padStart(3, '0')}`,
      email: `user${i}@feex.local`,
    });
    users.push(user);
  }

  return users;
}
