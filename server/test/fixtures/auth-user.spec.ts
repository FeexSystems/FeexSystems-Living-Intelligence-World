import { describe, it, expect } from 'vitest';
import { createTestUser, createAdminUser, createTestUsers } from './auth-user';

describe('Auth User Fixtures', () => {
  describe('createTestUser', () => {
    it('should create a test user with default values', async () => {
      const user = await createTestUser();

      expect(user.id).toBe('user-test-001');
      expect(user.email).toBe('test@feex.local');
      expect(user.role).toBe('USER');
      expect(user.firstName).toBe('Test');
      expect(user.lastName).toBe('User');
      expect(user.emailVerified).toBe(false);
      expect(user.createdAt).toEqual(new Date('2024-01-01'));
      expect(user.updatedAt).toEqual(new Date('2024-01-01'));
    });

    it('should have a hashed password (not plaintext)', async () => {
      const user = await createTestUser();

      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe('TestPassword123!');
      expect(user.passwordHash.length).toBeGreaterThan(20); // bcrypt hash is longer
    });

    it('should apply overrides to customize fields', async () => {
      const user = await createTestUser({
        email: 'custom@example.com',
        firstName: 'Custom',
        lastName: 'User',
      });

      expect(user.email).toBe('custom@example.com');
      expect(user.firstName).toBe('Custom');
      expect(user.lastName).toBe('User');
      expect(user.id).toBe('user-test-001'); // Default id remains
    });

    it('should be properly typed as User object', async () => {
      const user = await createTestUser();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('passwordHash');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');
    });
  });

  describe('createAdminUser', () => {
    it('should create an admin user', async () => {
      const user = await createAdminUser();

      expect(user.role).toBe('ADMIN');
      expect(user.id).toBe('user-test-001');
      expect(user.email).toBe('test@feex.local');
    });

    it('should allow overriding admin user fields', async () => {
      const user = await createAdminUser({
        email: 'admin@example.com',
      });

      expect(user.role).toBe('ADMIN');
      expect(user.email).toBe('admin@example.com');
    });
  });

  describe('createTestUsers', () => {
    it('should generate 3 users by default', async () => {
      const users = await createTestUsers();

      expect(users).toHaveLength(3);
    });

    it('should generate requested number of users', async () => {
      const users = await createTestUsers(5);

      expect(users).toHaveLength(5);
    });

    it('should generate unique IDs for each user', async () => {
      const users = await createTestUsers(5);
      const ids = users.map(u => u.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(5);
      expect(ids[0]).toBe('user-test-000');
      expect(ids[1]).toBe('user-test-001');
      expect(ids[2]).toBe('user-test-002');
      expect(ids[3]).toBe('user-test-003');
      expect(ids[4]).toBe('user-test-004');
    });

    it('should generate unique emails for each user', async () => {
      const users = await createTestUsers(5);
      const emails = users.map(u => u.email);
      const uniqueEmails = new Set(emails);

      expect(uniqueEmails.size).toBe(5);
      expect(emails[0]).toBe('user0@feex.local');
      expect(emails[1]).toBe('user1@feex.local');
      expect(emails[2]).toBe('user2@feex.local');
      expect(emails[3]).toBe('user3@feex.local');
      expect(emails[4]).toBe('user4@feex.local');
    });

    it('should have hashed passwords for all users', async () => {
      const users = await createTestUsers(3);

      users.forEach(user => {
        expect(user.passwordHash).toBeDefined();
        expect(user.passwordHash).not.toBe('TestPassword123!');
        expect(user.passwordHash.length).toBeGreaterThan(20);
      });
    });

    it('should all be regular users by default', async () => {
      const users = await createTestUsers(3);

      users.forEach(user => {
        expect(user.role).toBe('USER');
      });
    });
  });
});
