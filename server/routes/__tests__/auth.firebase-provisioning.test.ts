/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createServer } from '../../index';
import { prismaMock } from '../../test/prisma-mock';
// The mocked Firebase Admin module (see server/test/prisma-mock.ts). Imported
// statically so `vi.mock` is applied before the route module is imported.
import { verifyFirebaseToken } from '../../lib/firebase-admin';

const app = createServer();

describe('Auth routes - Firebase provisioning and role safety', () => {
  beforeEach(() => {
    (prismaMock as any).reset();
  });

  describe('GET /api/auth/me', () => {
    it('provisions a first-time Google signer-in as USER instead of rejecting them', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer feex-firebase:firebase-uid-new:newbie@example.com')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe('firebase-uid-new');
      expect(response.body.data.user.role).toBe(UserRole.USER);
    });

    it('never grants a privileged role to a newly provisioned user', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer feex-firebase:firebase-uid-esc:esc@example.com')
        .expect(200);

      expect(response.body.data.user.role).toBe(UserRole.USER);
      expect(response.body.data.user.role).not.toBe(UserRole.ADMIN);
      expect(response.body.data.user.role).not.toBe(UserRole.SUPER_ADMIN);
    });

    it('re-keys a legacy email-matched row onto the Firebase UID, preserving its role', async () => {
      await prismaMock.user.create({
        data: {
          id: 'legacy-uuid-me',
          email: 'legacy-me@example.com',
          passwordHash: 'FIREBASE_AUTH_MANAGED',
          firstName: 'Legacy',
          lastName: 'Me',
          role: UserRole.ADMIN,
        },
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer feex-firebase:firebase-uid-me:legacy-me@example.com')
        .expect(200);

      expect(response.body.data.user.id).toBe('firebase-uid-me');
      expect(response.body.data.user.role).toBe(UserRole.ADMIN);
    });

    it('does not expose the password hash in the response', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer feex-firebase:firebase-uid-nohash:nohash@example.com')
        .expect(200);

      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('POST /api/auth/sync-user', () => {
    it('accepts profile fields and provisions the user on first call', async () => {
      const response = await request(app)
        .post('/api/auth/sync-user')
        .set('Authorization', 'Bearer feex-firebase:firebase-uid-sync:sync@example.com')
        .send({ firstName: 'Grace', lastName: 'Hopper' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('Grace');
      expect(response.body.data.user.role).toBe(UserRole.USER);
    });

    it('rejects a body that tries to set the role', async () => {
      const response = await request(app)
        .post('/api/auth/sync-user')
        .set('Authorization', 'Bearer feex-firebase:firebase-uid-roletask:sync@example.com')
        .send({ firstName: 'Grace', role: 'SUPER_ADMIN' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('rejects a body that tries to set the email', async () => {
      const response = await request(app)
        .post('/api/auth/sync-user')
        .set('Authorization', 'Bearer feex-firebase:firebase-uid-emailtask:sync@example.com')
        .send({ email: 'victim@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('does not let the body change an existing role', async () => {
      await prismaMock.user.create({
        data: {
          id: 'firebase-uid-keeprole',
          email: 'keeprole@example.com',
          passwordHash: 'FIREBASE_AUTH_MANAGED',
          firstName: 'Keep',
          lastName: 'Role',
          role: UserRole.ADMIN,
        },
      });

      const response = await request(app)
        .post('/api/auth/sync-user')
        .set('Authorization', 'Bearer feex-firebase:firebase-uid-keeprole:keeprole@example.com')
        .send({ firstName: 'Still' })
        .expect(200);

      expect(response.body.data.user.role).toBe(UserRole.ADMIN);
    });
  });

  describe('POST /api/auth/google', () => {
    it('syncs the profile from the verified token', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .set('Authorization', 'Bearer feex-firebase:firebase-uid-google:google@example.com')
        .send({ firstName: 'Google' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('Google');
      expect(response.body.data.user.role).toBe(UserRole.USER);
    });

    it('rejects a body-supplied email outright', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .set('Authorization', 'Bearer feex-firebase:firebase-uid-google2:google2@example.com')
        .send({ email: 'victim@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('cannot use a body email to capture another user row', async () => {
      await prismaMock.user.create({
        data: {
          id: 'victim-uid',
          email: 'victim@example.com',
          passwordHash: 'FIREBASE_AUTH_MANAGED',
          firstName: 'Victim',
          lastName: 'User',
          role: UserRole.USER,
        },
      });

      await request(app)
        .post('/api/auth/google')
        .set('Authorization', 'Bearer feex-firebase:attacker-uid:attacker@example.com')
        .send({ email: 'victim@example.com' })
        .expect(400);

      const victim = await prismaMock.user.findUnique({ where: { id: 'victim-uid' } });
      expect(victim).not.toBeNull();
      expect(victim?.email).toBe('victim@example.com');
    });

    it('cannot use a body-supplied role', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .set('Authorization', 'Bearer feex-firebase:firebase-uid-google3:google3@example.com')
        .send({ role: 'SUPER_ADMIN' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('authentication failures', () => {
    it('rejects a request with no Authorization header', async () => {
      const response = await request(app).get('/api/auth/me').expect(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('rejects an invalid token', async () => {
      (verifyFirebaseToken as any).mockImplementationOnce(async () => {
        throw new Error('invalid token');
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-valid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('does not provision a row for a rejected token', async () => {
      (verifyFirebaseToken as any).mockImplementationOnce(async () => {
        throw new Error('expired token');
      });

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer expired-token')
        .expect(401);

      const count = await prismaMock.user.count();
      expect(count).toBe(0);
    });
  });
});
