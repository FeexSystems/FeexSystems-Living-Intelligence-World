/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../../index';
import { setupTestDatabase, cleanupTestDatabase, createTestUser } from '../helpers/database';
import { JWTService } from '../../lib/auth';
import path from 'path';
import fs from 'fs/promises';

describe('User Profile Management API', () => {
  let app: any;
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    app = createServer();
    await setupTestDatabase();
    
    // Create test user
    testUser = await createTestUser({
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe'
    });

    // Generate auth token
    authToken = JWTService.generateAccessToken(testUser);
  });

  afterEach(async () => {
    await cleanupTestDatabase();
    
    // Clean up uploaded test files
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
      const files = await fs.readdir(uploadsDir);
      for (const file of files) {
        if (file.startsWith(testUser.id)) {
          await fs.unlink(path.join(uploadsDir, file));
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('GET /api/users/profile', () => {
    it('should get user profile with stats and activity', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data).toHaveProperty('activity');
      
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.firstName).toBe(testUser.firstName);
      expect(response.body.data.user.lastName).toBe(testUser.lastName);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('Jane');
      expect(response.body.data.user.lastName).toBe('Smith');
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should update email and trigger verification', async () => {
      const updateData = {
        email: 'newemail@example.com'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('newemail@example.com');
      expect(response.body.data.user.emailVerified).toBe(false);
    });

    it('should validate input data', async () => {
      const invalidData = {
        firstName: '', // Empty string should fail
        email: 'invalid-email' // Invalid email format
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should prevent duplicate email', async () => {
      // Create another user
      const otherUser = await createTestUser({
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User'
      });

      const updateData = {
        email: 'other@example.com'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_ALREADY_TAKEN');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({ firstName: 'Jane' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('POST /api/users/profile/avatar', () => {
    it('should upload avatar successfully', async () => {
      // Create a test image buffer
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const response = await request(app)
        .post('/api/users/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', testImageBuffer, {
          filename: 'test-avatar.jpg',
          contentType: 'image/jpeg'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.profileImageUrl).toContain('/uploads/profiles/');
      expect(response.body.data.avatarUrl).toContain('/uploads/profiles/');
    });

    it('should reject non-image files', async () => {
      const testFileBuffer = Buffer.from('not-an-image');
      
      const response = await request(app)
        .post('/api/users/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', testFileBuffer, {
          filename: 'test.txt',
          contentType: 'text/plain'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require file upload', async () => {
      const response = await request(app)
        .post('/api/users/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE_UPLOADED');
    });

    it('should require authentication', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      
      const response = await request(app)
        .post('/api/users/profile/avatar')
        .attach('avatar', testImageBuffer, {
          filename: 'test-avatar.jpg',
          contentType: 'image/jpeg'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });

    it('should replace existing avatar', async () => {
      // First upload
      const testImageBuffer1 = Buffer.from('fake-image-data-1');
      
      const response1 = await request(app)
        .post('/api/users/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', testImageBuffer1, {
          filename: 'test-avatar-1.jpg',
          contentType: 'image/jpeg'
        })
        .expect(200);

      const firstAvatarUrl = response1.body.data.avatarUrl;

      // Second upload (should replace first)
      const testImageBuffer2 = Buffer.from('fake-image-data-2');
      
      const response2 = await request(app)
        .post('/api/users/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', testImageBuffer2, {
          filename: 'test-avatar-2.jpg',
          contentType: 'image/jpeg'
        })
        .expect(200);

      expect(response2.body.success).toBe(true);
      expect(response2.body.data.avatarUrl).not.toBe(firstAvatarUrl);
    });
  });

  describe('DELETE /api/users/profile/avatar', () => {
    beforeEach(async () => {
      // Upload an avatar first
      const testImageBuffer = Buffer.from('fake-image-data');
      
      await request(app)
        .post('/api/users/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', testImageBuffer, {
          filename: 'test-avatar.jpg',
          contentType: 'image/jpeg'
        });
    });

    it('should delete avatar successfully', async () => {
      const response = await request(app)
        .delete('/api/users/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.profileImageUrl).toBeNull();
    });

    it('should handle no avatar to delete', async () => {
      // Delete avatar first
      await request(app)
        .delete('/api/users/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`);

      // Try to delete again
      const response = await request(app)
        .delete('/api/users/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_AVATAR_EXISTS');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/users/profile/avatar')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('GET /api/users/profile/activity', () => {
    it('should get user activity logs', async () => {
      // First, trigger some activity by accessing profile
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .get('/api/users/profile/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('activities');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.activities)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/users/profile/activity?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should support filtering by action', async () => {
      const response = await request(app)
        .get('/api/users/profile/activity?action=PROFILE_VIEWED')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.activities)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile/activity')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe.skip('Rate Limiting', () => {
    it('should rate limit profile updates', async () => {
      const updateData = { firstName: 'Jane' };
      
      // Make multiple requests quickly
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should rate limit avatar uploads', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      
      // Make multiple upload requests quickly
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/users/profile/avatar')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('avatar', testImageBuffer, {
            filename: 'test-avatar.jpg',
            contentType: 'image/jpeg'
          })
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Activity Logging', () => {
    it('should log profile view activity', async () => {
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const activityResponse = await request(app)
        .get('/api/users/profile/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const activities = activityResponse.body.data.activities;
      const profileViewActivity = activities.find((a: any) => a.action === 'PROFILE_VIEWED');
      
      expect(profileViewActivity).toBeDefined();
      expect(profileViewActivity.resource).toBe('USER_PROFILE');
      expect(profileViewActivity.userId).toBe(testUser.id);
    });

    it('should log profile update activity', async () => {
      const updateData = { firstName: 'Jane' };
      
      await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      const activityResponse = await request(app)
        .get('/api/users/profile/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const activities = activityResponse.body.data.activities;
      const updateActivity = activities.find((a: any) => a.action === 'PROFILE_UPDATED');
      
      expect(updateActivity).toBeDefined();
      expect(updateActivity.resource).toBe('USER_PROFILE');
      expect(updateActivity.metadata.changes).toEqual(updateData);
    });

    it('should log avatar upload activity', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      
      await request(app)
        .post('/api/users/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', testImageBuffer, {
          filename: 'test-avatar.jpg',
          contentType: 'image/jpeg'
        })
        .expect(200);

      const activityResponse = await request(app)
        .get('/api/users/profile/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const activities = activityResponse.body.data.activities;
      const uploadActivity = activities.find((a: any) => a.action === 'AVATAR_UPLOADED');
      
      expect(uploadActivity).toBeDefined();
      expect(uploadActivity.resource).toBe('USER_PROFILE');
      expect(uploadActivity.metadata.originalname).toContain('test-avatar.jpg');
    });
  });
});