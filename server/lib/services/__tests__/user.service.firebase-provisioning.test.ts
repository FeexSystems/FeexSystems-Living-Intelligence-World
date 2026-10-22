/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRole } from '@prisma/client';
import { UserService } from '../user.service';
import { prismaMock } from '../../../test/prisma-mock';

describe('UserService.findOrCreateFirebaseUser', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService(prismaMock);
  });

  describe('first-time sign-in (no existing row)', () => {
    it('creates a row keyed by the Firebase UID', async () => {
      const user = await service.findOrCreateFirebaseUser({
        firebaseUid: 'firebase-uid-1',
        email: 'New.User@Example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });

      expect(user.id).toBe('firebase-uid-1');
      expect(user.email).toBe('new.user@example.com');
      expect(user.firstName).toBe('Ada');
      expect(user.lastName).toBe('Lovelace');
    });

    it('provisions the user as USER and never as ADMIN or SUPER_ADMIN', async () => {
      const user = await service.findOrCreateFirebaseUser({
        firebaseUid: 'firebase-uid-role',
        email: 'newbie@example.com',
      });

      expect(user.role).toBe(UserRole.USER);
      expect(user.role).not.toBe(UserRole.ADMIN);
      expect(user.role).not.toBe(UserRole.SUPER_ADMIN);
    });

    it('stores a non-usable password marker rather than a credential', async () => {
      await service.findOrCreateFirebaseUser({
        firebaseUid: 'firebase-uid-pw',
        email: 'pw@example.com',
      });

      const row = await prismaMock.user.findUnique({ where: { id: 'firebase-uid-pw' } });
      expect(row?.passwordHash).toBe('FIREBASE_AUTH_MANAGED');
    });

    it('applies safe profile defaults when no name is supplied', async () => {
      const user = await service.findOrCreateFirebaseUser({
        firebaseUid: 'firebase-uid-defaults',
        email: 'defaults@example.com',
      });

      expect(user.firstName).toBe('Feex');
      expect(user.lastName).toBe('Explorer');
      expect(user.emailVerified).toBe(false);
    });

    it('falls back to a noreply address when Firebase provides no email', async () => {
      const user = await service.findOrCreateFirebaseUser({ firebaseUid: 'firebase-uid-noemail' });

      expect(user.email).toBe('firebase-uid-noemail@users.noreply.firebaseid.com');
    });

    it('never returns the password hash to the caller', async () => {
      const user = await service.findOrCreateFirebaseUser({
        firebaseUid: 'firebase-uid-nohash',
        email: 'nohash@example.com',
      });

      expect(user).not.toHaveProperty('passwordHash');
    });
  });


  describe('existing row by Firebase UID', () => {
    it('returns the existing row without mutating it', async () => {
      await prismaMock.user.create({
        data: {
          id: 'firebase-uid-existing',
          email: 'existing@example.com',
          passwordHash: 'FIREBASE_AUTH_MANAGED',
          firstName: 'Existing',
          lastName: 'Person',
          role: UserRole.ADMIN,
        },
      });

      const user = await service.findOrCreateFirebaseUser({
        firebaseUid: 'firebase-uid-existing',
        email: 'existing@example.com',
      });

      expect(user.id).toBe('firebase-uid-existing');
      expect(user.role).toBe(UserRole.ADMIN);
    });

    it('preserves an existing privileged role even when claims differ', async () => {
      await prismaMock.user.create({
        data: {
          id: 'firebase-uid-admin',
          email: 'admin@example.com',
          passwordHash: 'FIREBASE_AUTH_MANAGED',
          firstName: 'Ad',
          lastName: 'Min',
          role: UserRole.SUPER_ADMIN,
        },
      });

      const user = await service.findOrCreateFirebaseUser({
        firebaseUid: 'firebase-uid-admin',
        email: 'admin@example.com',
        firstName: 'ShouldNot',
        lastName: 'Apply',
      });

      expect(user.role).toBe(UserRole.SUPER_ADMIN);
      expect(user.firstName).toBe('Ad');
    });

    it('refreshes profile fields but not the role when profile sync is requested', async () => {
      await prismaMock.user.create({
        data: {
          id: 'firebase-uid-sync',
          email: 'sync@example.com',
          passwordHash: 'FIREBASE_AUTH_MANAGED',
          firstName: 'Old',
          lastName: 'Name',
          role: UserRole.ADMIN,
        },
      });

      const user = await service.findOrCreateFirebaseUser({
        firebaseUid: 'firebase-uid-sync',
        email: 'sync@example.com',
        firstName: 'New',
        lastName: 'Name',
        emailVerified: true,
        updateExistingProfile: true,
      });

      expect(user.firstName).toBe('New');
      expect(user.emailVerified).toBe(true);
      expect(user.role).toBe(UserRole.ADMIN);
    });
  });


  describe('legacy email-matched row (UID re-keying)', () => {
    it('re-keys the legacy row onto the Firebase UID', async () => {
      await prismaMock.user.create({
        data: {
          id: 'legacy-uuid-1234',
          email: 'legacy@example.com',
          passwordHash: 'FIREBASE_AUTH_MANAGED',
          firstName: 'Legacy',
          lastName: 'User',
          role: UserRole.USER,
        },
      });

      const user = await service.findOrCreateFirebaseUser({
        firebaseUid: 'firebase-uid-legacy',
        email: 'legacy@example.com',
      });

      expect(user.id).toBe('firebase-uid-legacy');
    });

    it('preserves the existing role during re-keying', async () => {
      await prismaMock.user.create({
        data: {
          id: 'legacy-uuid-admin',
          email: 'legacy-admin@example.com',
          passwordHash: 'FIREBASE_AUTH_MANAGED',
          firstName: 'Legacy',
          lastName: 'Admin',
          role: UserRole.ADMIN,
        },
      });

      const user = await service.findOrCreateFirebaseUser({
        firebaseUid: 'firebase-uid-legacy-admin',
        email: 'legacy-admin@example.com',
      });

      expect(user.role).toBe(UserRole.ADMIN);
      expect(user.id).toBe('firebase-uid-legacy-admin');
    });

    it('does not leave the legacy row behind under its old id', async () => {
      await prismaMock.user.create({
        data: {
          id: 'legacy-uuid-gone',
          email: 'gone@example.com',
          passwordHash: 'FIREBASE_AUTH_MANAGED',
          firstName: 'Legacy',
          lastName: 'Gone',
          role: UserRole.USER,
        },
      });

      await service.findOrCreateFirebaseUser({
        firebaseUid: 'firebase-uid-gone',
        email: 'gone@example.com',
      });

      const old = await prismaMock.user.findUnique({ where: { id: 'legacy-uuid-gone' } });
      const fresh = await prismaMock.user.findUnique({ where: { id: 'firebase-uid-gone' } });

      expect(old).toBeNull();
      expect(fresh).not.toBeNull();
    });

    it('does not re-key when the email does not match', async () => {
      await prismaMock.user.create({
        data: {
          id: 'legacy-uuid-other',
          email: 'other@example.com',
          passwordHash: 'FIREBASE_AUTH_MANAGED',
          firstName: 'Other',
          lastName: 'Person',
          role: UserRole.USER,
        },
      });

      const user = await service.findOrCreateFirebaseUser({
        firebaseUid: 'firebase-uid-different',
        email: 'different@example.com',
      });

      expect(user.id).toBe('firebase-uid-different');
      expect(user.role).toBe(UserRole.USER);
    });
  });


  describe('concurrent provisioning', () => {
    it('re-reads the winning row when creation hits a unique-constraint race', async () => {
      // The competing request wins the race and inserts the row first.
      await prismaMock.user.create({
        data: {
          id: 'firebase-uid-race',
          email: 'race@example.com',
          passwordHash: 'FIREBASE_AUTH_MANAGED',
          firstName: 'Feex',
          lastName: 'Explorer',
          role: UserRole.USER,
        },
      });

      const raceError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      const createSpy = vi.spyOn(prismaMock.user, 'create').mockImplementationOnce(async () => {
        throw raceError;
      });

      const user = await service.findOrCreateFirebaseUser({
        firebaseUid: 'firebase-uid-race',
        email: 'race@example.com',
      });

      expect(user.id).toBe('firebase-uid-race');
      expect(user.role).toBe(UserRole.USER);
      createSpy.mockRestore();
    });

    it('propagates non-race database errors', async () => {
      const boom = Object.assign(new Error('connection lost'), { code: 'P1001' });
      const createSpy = vi.spyOn(prismaMock.user, 'create').mockImplementationOnce(async () => {
        throw boom;
      });

      await expect(
        service.findOrCreateFirebaseUser({
          firebaseUid: 'firebase-uid-error',
          email: 'error@example.com',
        }),
      ).rejects.toThrow('connection lost');

      createSpy.mockRestore();
    });
  });
});
