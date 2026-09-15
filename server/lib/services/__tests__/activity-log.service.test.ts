import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ActivityLogService } from '../activity-log.service';
import { setupTestDatabase, cleanupTestDatabase, createTestUser } from '../../../test/helpers/database';
import { prisma } from '../../database';

describe.skip('ActivityLogService', () => {
  let activityLogService: ActivityLogService;
  let testUser: any;

  beforeEach(async () => {
    await setupTestDatabase();
    activityLogService = new ActivityLogService(prisma);
    
    testUser = await createTestUser({
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe'
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('logActivity', () => {
    it('should log activity successfully', async () => {
      const activityEntry = {
        userId: testUser.id,
        action: 'PROFILE_VIEWED',
        resource: 'USER_PROFILE',
        resourceId: testUser.id,
        metadata: {
          userAgent: 'test-agent',
          ip: '127.0.0.1'
        }
      };

      await activityLogService.logActivity(activityEntry);

      // Verify activity was logged
      const activities = await activityLogService.getUserActivities(testUser.id);
      expect(activities.activities).toHaveLength(1);
      expect(activities.activities[0].action).toBe('PROFILE_VIEWED');
      expect(activities.activities[0].resource).toBe('USER_PROFILE');
      expect(activities.activities[0].metadata).toEqual(activityEntry.metadata);
    });

    it('should handle logging errors gracefully', async () => {
      const invalidEntry = {
        userId: 'invalid-user-id',
        action: 'TEST_ACTION',
        resource: 'TEST_RESOURCE',
        resourceId: 'test-id'
      };

      // Should not throw error even with invalid user ID
      await expect(activityLogService.logActivity(invalidEntry)).resolves.not.toThrow();
    });
  });

  describe('getUserActivities', () => {
    beforeEach(async () => {
      // Create test activities
      const activities = [
        {
          userId: testUser.id,
          action: 'PROFILE_VIEWED',
          resource: 'USER_PROFILE',
          resourceId: testUser.id
        },
        {
          userId: testUser.id,
          action: 'PROFILE_UPDATED',
          resource: 'USER_PROFILE',
          resourceId: testUser.id
        },
        {
          userId: testUser.id,
          action: 'AVATAR_UPLOADED',
          resource: 'USER_PROFILE',
          resourceId: testUser.id
        }
      ];

      for (const activity of activities) {
        await activityLogService.logActivity(activity);
      }
    });

    it('should get user activities with pagination', async () => {
      const result = await activityLogService.getUserActivities(testUser.id, 1, 2);

      expect(result.activities).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.pages).toBe(2);
    });

    it('should filter activities by action', async () => {
      const result = await activityLogService.getUserActivities(
        testUser.id,
        1,
        10,
        { action: 'PROFILE_VIEWED' }
      );

      expect(result.activities).toHaveLength(1);
      expect(result.activities[0].action).toBe('PROFILE_VIEWED');
    });

    it('should filter activities by resource', async () => {
      const result = await activityLogService.getUserActivities(
        testUser.id,
        1,
        10,
        { resource: 'USER_PROFILE' }
      );

      expect(result.activities).toHaveLength(3);
      result.activities.forEach(activity => {
        expect(activity.resource).toBe('USER_PROFILE');
      });
    });

    it('should filter activities by date range', async () => {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - 1);
      const endDate = new Date();

      const result = await activityLogService.getUserActivities(
        testUser.id,
        1,
        10,
        { startDate, endDate }
      );

      expect(result.activities.length).toBeGreaterThan(0);
      result.activities.forEach(activity => {
        expect(new Date(activity.timestamp)).toBeInstanceOf(Date);
      });
    });

    it('should return empty result for non-existent user', async () => {
      const result = await activityLogService.getUserActivities('non-existent-id');

      expect(result.activities).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getUserActivitySummary', () => {
    beforeEach(async () => {
      // Create test activities with different actions and resources
      const activities = [
        { action: 'PROFILE_VIEWED', resource: 'USER_PROFILE' },
        { action: 'PROFILE_VIEWED', resource: 'USER_PROFILE' },
        { action: 'PROFILE_UPDATED', resource: 'USER_PROFILE' },
        { action: 'AVATAR_UPLOADED', resource: 'USER_PROFILE' },
        { action: 'LOGIN', resource: 'AUTH' },
      ];

      for (const activity of activities) {
        await activityLogService.logActivity({
          userId: testUser.id,
          action: activity.action,
          resource: activity.resource,
          resourceId: testUser.id
        });
      }
    });

    it('should generate activity summary', async () => {
      const summary = await activityLogService.getUserActivitySummary(testUser.id, 30);

      expect(summary.totalActivities).toBe(5);
      expect(summary.actionCounts['PROFILE_VIEWED']).toBe(2);
      expect(summary.actionCounts['PROFILE_UPDATED']).toBe(1);
      expect(summary.actionCounts['AVATAR_UPLOADED']).toBe(1);
      expect(summary.actionCounts['LOGIN']).toBe(1);
      expect(summary.resourceCounts['USER_PROFILE']).toBe(4);
      expect(summary.resourceCounts['AUTH']).toBe(1);
      expect(summary.period).toBe('30 days');
    });

    it('should handle empty activity history', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User'
      });

      const summary = await activityLogService.getUserActivitySummary(otherUser.id, 30);

      expect(summary.totalActivities).toBe(0);
      expect(Object.keys(summary.actionCounts)).toHaveLength(0);
      expect(Object.keys(summary.resourceCounts)).toHaveLength(0);
      expect(Object.keys(summary.dailyActivity)).toHaveLength(0);
    });
  });

  describe('cleanupOldLogs', () => {
    beforeEach(async () => {
      // Create activities with different timestamps
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

      // Create old activity directly in database
      await prisma.activityLog.create({
        data: {
          userId: testUser.id,
          action: 'OLD_ACTION',
          resource: 'OLD_RESOURCE',
          resourceId: testUser.id,
          timestamp: oldDate
        }
      });

      // Create recent activity
      await activityLogService.logActivity({
        userId: testUser.id,
        action: 'RECENT_ACTION',
        resource: 'RECENT_RESOURCE',
        resourceId: testUser.id
      });
    });

    it('should clean up old logs', async () => {
      const deletedCount = await activityLogService.cleanupOldLogs(90);

      expect(deletedCount).toBe(1);

      // Verify only recent activity remains
      const activities = await activityLogService.getUserActivities(testUser.id);
      expect(activities.activities).toHaveLength(1);
      expect(activities.activities[0].action).toBe('RECENT_ACTION');
    });

    it('should not delete recent logs', async () => {
      const deletedCount = await activityLogService.cleanupOldLogs(1); // Keep only 1 day

      expect(deletedCount).toBe(1);

      // Recent activity should still exist
      const activities = await activityLogService.getUserActivities(testUser.id);
      expect(activities.activities).toHaveLength(1);
    });
  });

  describe('getMostActiveUsers', () => {
    beforeEach(async () => {
      // Create another test user
      const otherUser = await createTestUser({
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User'
      });

      // Create activities for both users
      for (let i = 0; i < 5; i++) {
        await activityLogService.logActivity({
          userId: testUser.id,
          action: 'TEST_ACTION',
          resource: 'TEST_RESOURCE',
          resourceId: testUser.id
        });
      }

      for (let i = 0; i < 3; i++) {
        await activityLogService.logActivity({
          userId: otherUser.id,
          action: 'TEST_ACTION',
          resource: 'TEST_RESOURCE',
          resourceId: otherUser.id
        });
      }
    });

    it('should get most active users', async () => {
      const result = await activityLogService.getMostActiveUsers(30, 10);

      expect(result).toHaveLength(2);
      expect(result[0].activityCount).toBe(5);
      expect(result[0].user?.id).toBe(testUser.id);
      expect(result[1].activityCount).toBe(3);
    });

    it('should limit results', async () => {
      const result = await activityLogService.getMostActiveUsers(30, 1);

      expect(result).toHaveLength(1);
      expect(result[0].activityCount).toBe(5);
    });
  });

  describe('getActivityStats', () => {
    beforeEach(async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User'
      });

      // Create activities for both users
      const activities = [
        { userId: testUser.id, action: 'PROFILE_VIEWED', resource: 'USER_PROFILE' },
        { userId: testUser.id, action: 'PROFILE_UPDATED', resource: 'USER_PROFILE' },
        { userId: otherUser.id, action: 'PROFILE_VIEWED', resource: 'USER_PROFILE' },
        { userId: otherUser.id, action: 'LOGIN', resource: 'AUTH' },
      ];

      for (const activity of activities) {
        await activityLogService.logActivity({
          userId: activity.userId,
          action: activity.action,
          resource: activity.resource,
          resourceId: activity.userId
        });
      }
    });

    it('should get activity statistics', async () => {
      const stats = await activityLogService.getActivityStats(30);

      expect(stats.totalActivities).toBe(4);
      expect(stats.uniqueUsers).toBe(2);
      expect(stats.actionStats).toHaveLength(3);
      expect(stats.resourceStats).toHaveLength(2);
      expect(stats.period).toBe('30 days');

      // Check action stats
      const profileViewedStat = stats.actionStats.find(s => s.action === 'PROFILE_VIEWED');
      expect(profileViewedStat?.count).toBe(2);

      // Check resource stats
      const userProfileStat = stats.resourceStats.find(s => s.resource === 'USER_PROFILE');
      expect(userProfileStat?.count).toBe(3);
    });

    it('should handle empty activity data', async () => {
      // Clean up all activities
      await prisma.activityLog.deleteMany();

      const stats = await activityLogService.getActivityStats(30);

      expect(stats.totalActivities).toBe(0);
      expect(stats.uniqueUsers).toBe(0);
      expect(stats.actionStats).toHaveLength(0);
      expect(stats.resourceStats).toHaveLength(0);
    });
  });
});