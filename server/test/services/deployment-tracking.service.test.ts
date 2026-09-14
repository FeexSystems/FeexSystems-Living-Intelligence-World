/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DeploymentTrackingService } from '../../lib/services/deployment-tracking.service';
import { repositoryService } from '../../lib/services/repository.service';
import { pipelineService } from '../../lib/services/pipeline.service';
import { setupTestDatabase, cleanupTestDatabase, createTestUser } from '../helpers/database';

const prisma = new PrismaClient();

// Mock external services
vi.mock('../../lib/services/repository.service');
vi.mock('../../lib/services/pipeline.service');

describe('DeploymentTrackingService', () => {
  let deploymentTrackingService: DeploymentTrackingService;
  let testUserId: string;
  let testRepositoryId: string;
  let testPipelineId: string;
  let testDeploymentId: string;

  beforeEach(async () => {
    await setupTestDatabase();
    deploymentTrackingService = new DeploymentTrackingService();
    
    // Create test user
    const testUser = await createTestUser({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    });
    testUserId = testUser.id;

    // Create test repository
    const repository = await prisma.repository.create({
      data: {
        userId: testUserId,
        provider: 'GITHUB',
        repoUrl: 'https://github.com/test/repo',
        branch: 'main',
      },
    });
    testRepositoryId = repository.id;

    // Create test pipeline
    const pipeline = await prisma.pipeline.create({
      data: {
        repositoryId: testRepositoryId,
        name: 'Test Pipeline',
        stages: [
          {
            id: 'build',
            name: 'Build',
            type: 'build',
            commands: ['npm install', 'npm run build'],
          },
          {
            id: 'test',
            name: 'Test',
            type: 'test',
            commands: ['npm test'],
          },
        ],
        triggers: [
          {
            id: 'push',
            type: 'push',
            branches: ['main'],
          },
        ],
        environment: { NODE_ENV: 'production' },
        status: 'ACTIVE',
      },
    });
    testPipelineId = pipeline.id;

    // Create test deployment
    const deployment = await prisma.deployment.create({
      data: {
        repositoryId: testRepositoryId,
        pipelineId: testPipelineId,
        commit: 'abc123def456',
        status: 'PENDING',
        logs: [],
      },
    });
    testDeploymentId = deployment.id;

    // Mock repository service
    vi.mocked(repositoryService.getUserRepositories).mockResolvedValue([
      {
        id: testRepositoryId,
        userId: testUserId,
        provider: 'github',
        repoUrl: 'https://github.com/test/repo',
        branch: 'main',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  afterEach(async () => {
    await cleanupTestDatabase();
    vi.clearAllMocks();
  });

  describe('getDeployment', () => {
    it('should get deployment by ID', async () => {
      const deployment = await deploymentTrackingService.getDeployment(testDeploymentId, testUserId);

      expect(deployment).toBeDefined();
      expect(deployment.id).toBe(testDeploymentId);
      expect(deployment.repositoryId).toBe(testRepositoryId);
      expect(deployment.commit).toBe('abc123def456');
      expect(deployment.status).toBe('pending');
    });

    it('should throw error for non-existent deployment', async () => {
      await expect(
        deploymentTrackingService.getDeployment('non-existent', testUserId)
      ).rejects.toThrow('Deployment not found');
    });

    it('should throw error for unauthorized access', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User',
      });

      await expect(
        deploymentTrackingService.getDeployment(testDeploymentId, otherUser.id)
      ).rejects.toThrow('Access denied');
    });
  });

  describe('getRepositoryDeployments', () => {
    beforeEach(async () => {
      // Create additional test deployments
      await prisma.deployment.createMany({
        data: [
          {
            repositoryId: testRepositoryId,
            pipelineId: testPipelineId,
            commit: 'def456ghi789',
            status: 'SUCCESS',
            startedAt: new Date(Date.now() - 86400000), // 1 day ago
            completedAt: new Date(Date.now() - 86400000 + 300000), // 5 minutes later
          },
          {
            repositoryId: testRepositoryId,
            pipelineId: testPipelineId,
            commit: 'ghi789jkl012',
            status: 'FAILED',
            startedAt: new Date(Date.now() - 172800000), // 2 days ago
            completedAt: new Date(Date.now() - 172800000 + 600000), // 10 minutes later
          },
        ],
      });
    });

    it('should get deployments for repository', async () => {
      const result = await deploymentTrackingService.getRepositoryDeployments(
        testRepositoryId,
        testUserId
      );

      expect(result.deployments).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should filter deployments by status', async () => {
      const result = await deploymentTrackingService.getRepositoryDeployments(
        testRepositoryId,
        testUserId,
        { status: 'success' }
      );

      expect(result.deployments).toHaveLength(1);
      expect(result.deployments[0].status).toBe('success');
    });

    it('should paginate deployments', async () => {
      const result = await deploymentTrackingService.getRepositoryDeployments(
        testRepositoryId,
        testUserId,
        { limit: 2, offset: 0 }
      );

      expect(result.deployments).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should filter deployments by date range', async () => {
      const startDate = new Date(Date.now() - 86400000 - 3600000); // 1 day and 1 hour ago
      const endDate = new Date(Date.now() - 86400000 + 3600000); // 1 day ago plus 1 hour

      const result = await deploymentTrackingService.getRepositoryDeployments(
        testRepositoryId,
        testUserId,
        { startDate, endDate }
      );

      expect(result.deployments).toHaveLength(1);
      expect(result.deployments[0].status).toBe('success');
    });
  });

  describe('updateDeploymentStatus', () => {
    it('should update deployment status', async () => {
      const mockEmit = vi.spyOn(deploymentTrackingService, 'emit');

      await deploymentTrackingService.updateDeploymentStatus(testDeploymentId, 'running');

      const deployment = await prisma.deployment.findUnique({
        where: { id: testDeploymentId },
      });

      expect(deployment?.status).toBe('RUNNING');
      expect(mockEmit).toHaveBeenCalledWith('statusUpdate', expect.objectContaining({
        deploymentId: testDeploymentId,
        status: 'running',
      }));
    });

    it('should set completion time for completed deployments', async () => {
      await deploymentTrackingService.updateDeploymentStatus(testDeploymentId, 'success');

      const deployment = await prisma.deployment.findUnique({
        where: { id: testDeploymentId },
      });

      expect(deployment?.status).toBe('SUCCESS');
      expect(deployment?.completedAt).toBeDefined();
    });

    it('should update logs when provided', async () => {
      const logs = [
        {
          id: 'log1',
          timestamp: new Date(),
          level: 'info' as const,
          message: 'Deployment started',
        },
      ];

      await deploymentTrackingService.updateDeploymentStatus(testDeploymentId, 'running', {
        logs,
      });

      const deployment = await prisma.deployment.findUnique({
        where: { id: testDeploymentId },
      });

      expect(deployment?.logs).toEqual(logs);
    });
  });

  describe('addDeploymentLog', () => {
    it('should add log entry to deployment', async () => {
      const mockEmit = vi.spyOn(deploymentTrackingService, 'emit');

      await deploymentTrackingService.addDeploymentLog(testDeploymentId, {
        level: 'info',
        message: 'Test log message',
        stage: 'build',
      });

      const deployment = await prisma.deployment.findUnique({
        where: { id: testDeploymentId },
      });

      const logs = deployment?.logs as any[];
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test log message');
      expect(logs[0].level).toBe('info');
      expect(logs[0].stage).toBe('build');

      expect(mockEmit).toHaveBeenCalledWith('logUpdate', expect.objectContaining({
        deploymentId: testDeploymentId,
        log: expect.objectContaining({
          message: 'Test log message',
        }),
      }));
    });

    it('should append to existing logs', async () => {
      // Add first log
      await deploymentTrackingService.addDeploymentLog(testDeploymentId, {
        level: 'info',
        message: 'First log',
      });

      // Add second log
      await deploymentTrackingService.addDeploymentLog(testDeploymentId, {
        level: 'warn',
        message: 'Second log',
      });

      const deployment = await prisma.deployment.findUnique({
        where: { id: testDeploymentId },
      });

      const logs = deployment?.logs as any[];
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('First log');
      expect(logs[1].message).toBe('Second log');
    });
  });

  describe('getDeploymentLogs', () => {
    beforeEach(async () => {
      // Add test logs
      const logs = [
        {
          id: 'log1',
          timestamp: new Date(),
          level: 'info',
          message: 'Build started',
          stage: 'build',
        },
        {
          id: 'log2',
          timestamp: new Date(),
          level: 'error',
          message: 'Build failed',
          stage: 'build',
        },
        {
          id: 'log3',
          timestamp: new Date(),
          level: 'info',
          message: 'Test started',
          stage: 'test',
        },
      ];

      await prisma.deployment.update({
        where: { id: testDeploymentId },
        data: { logs },
      });
    });

    it('should get all deployment logs', async () => {
      const result = await deploymentTrackingService.getDeploymentLogs(
        testDeploymentId,
        testUserId
      );

      expect(result.logs).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should filter logs by level', async () => {
      const result = await deploymentTrackingService.getDeploymentLogs(
        testDeploymentId,
        testUserId,
        { level: 'error' }
      );

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].level).toBe('error');
    });

    it('should filter logs by stage', async () => {
      const result = await deploymentTrackingService.getDeploymentLogs(
        testDeploymentId,
        testUserId,
        { stage: 'build' }
      );

      expect(result.logs).toHaveLength(2);
      expect(result.logs.every(log => log.stage === 'build')).toBe(true);
    });

    it('should paginate logs', async () => {
      const result = await deploymentTrackingService.getDeploymentLogs(
        testDeploymentId,
        testUserId,
        { limit: 2, offset: 1 }
      );

      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(3);
    });
  });

  describe('rollbackDeployment', () => {
    let successfulDeploymentId: string;

    beforeEach(async () => {
      // Create a successful deployment to rollback from
      const successfulDeployment = await prisma.deployment.create({
        data: {
          repositoryId: testRepositoryId,
          pipelineId: testPipelineId,
          commit: 'success123',
          status: 'SUCCESS',
          startedAt: new Date(Date.now() - 86400000),
          completedAt: new Date(Date.now() - 86400000 + 300000),
        },
      });
      successfulDeploymentId = successfulDeployment.id;

      // Update the test deployment to be failed
      await prisma.deployment.update({
        where: { id: testDeploymentId },
        data: { status: 'FAILED', completedAt: new Date() },
      });

      // Mock pipeline service
      vi.mocked(pipelineService.executePipeline).mockResolvedValue({
        id: 'rollback-deployment-id',
        repositoryId: testRepositoryId,
        pipelineId: testPipelineId,
        commit: 'success123',
        status: 'pending',
        logs: [],
        startedAt: new Date(),
      });
    });

    it('should rollback to target commit', async () => {
      const rollbackDeployment = await deploymentTrackingService.rollbackDeployment(
        testDeploymentId,
        testUserId,
        { targetCommit: 'success123' }
      );

      expect(rollbackDeployment.commit).toBe('success123');
      expect(rollbackDeployment.status).toBe('pending');
      expect(vi.mocked(pipelineService.executePipeline)).toHaveBeenCalledWith(
        testPipelineId,
        testUserId,
        'success123'
      );
    });

    it('should rollback to target deployment', async () => {
      const rollbackDeployment = await deploymentTrackingService.rollbackDeployment(
        testDeploymentId,
        testUserId,
        { targetDeploymentId: successfulDeploymentId }
      );

      expect(rollbackDeployment.commit).toBe('success123');
      expect(vi.mocked(pipelineService.executePipeline)).toHaveBeenCalledWith(
        testPipelineId,
        testUserId,
        'success123'
      );
    });

    it('should rollback to last successful deployment if no target specified', async () => {
      const rollbackDeployment = await deploymentTrackingService.rollbackDeployment(
        testDeploymentId,
        testUserId
      );

      expect(rollbackDeployment.commit).toBe('success123');
    });

    it('should throw error for non-completed deployments', async () => {
      await prisma.deployment.update({
        where: { id: testDeploymentId },
        data: { status: 'RUNNING', completedAt: null },
      });

      await expect(
        deploymentTrackingService.rollbackDeployment(testDeploymentId, testUserId)
      ).rejects.toThrow('Can only rollback completed deployments');
    });

    it('should throw error if no previous successful deployment found', async () => {
      // Delete the successful deployment
      await prisma.deployment.delete({
        where: { id: successfulDeploymentId },
      });

      await expect(
        deploymentTrackingService.rollbackDeployment(testDeploymentId, testUserId)
      ).rejects.toThrow('No previous successful deployment found for rollback');
    });
  });

  describe('cancelDeployment', () => {
    beforeEach(async () => {
      await prisma.deployment.update({
        where: { id: testDeploymentId },
        data: { status: 'RUNNING' },
      });
    });

    it('should cancel running deployment', async () => {
      const mockEmit = vi.spyOn(deploymentTrackingService, 'emit');

      await deploymentTrackingService.cancelDeployment(testDeploymentId, testUserId, 'User requested');

      const deployment = await prisma.deployment.findUnique({
        where: { id: testDeploymentId },
      });

      expect(deployment?.status).toBe('CANCELED');
      expect(deployment?.completedAt).toBeDefined();

      expect(mockEmit).toHaveBeenCalledWith('cancelPipeline', expect.objectContaining({
        deploymentId: testDeploymentId,
        pipelineId: testPipelineId,
      }));
    });

    it('should throw error for non-cancellable deployments', async () => {
      await prisma.deployment.update({
        where: { id: testDeploymentId },
        data: { status: 'SUCCESS' },
      });

      await expect(
        deploymentTrackingService.cancelDeployment(testDeploymentId, testUserId)
      ).rejects.toThrow('Can only cancel pending or running deployments');
    });
  });

  describe('getDeploymentAnalytics', () => {
    beforeEach(async () => {
      // Create test deployments for analytics
      const now = new Date();
      await prisma.deployment.createMany({
        data: [
          {
            repositoryId: testRepositoryId,
            pipelineId: testPipelineId,
            commit: 'commit1',
            status: 'SUCCESS',
            startedAt: new Date(now.getTime() - 86400000 * 5), // 5 days ago
            completedAt: new Date(now.getTime() - 86400000 * 5 + 300000), // 5 minutes later
          },
          {
            repositoryId: testRepositoryId,
            pipelineId: testPipelineId,
            commit: 'commit2',
            status: 'FAILED',
            startedAt: new Date(now.getTime() - 86400000 * 3), // 3 days ago
            completedAt: new Date(now.getTime() - 86400000 * 3 + 600000), // 10 minutes later
          },
          {
            repositoryId: testRepositoryId,
            pipelineId: testPipelineId,
            commit: 'commit3',
            status: 'SUCCESS',
            startedAt: new Date(now.getTime() - 86400000 * 1), // 1 day ago
            completedAt: new Date(now.getTime() - 86400000 * 1 + 180000), // 3 minutes later
          },
        ],
      });
    });

    it('should get deployment analytics for repository', async () => {
      const analytics = await deploymentTrackingService.getDeploymentAnalytics(
        testRepositoryId,
        testUserId,
        'week'
      );

      expect(analytics.repositoryId).toBe(testRepositoryId);
      expect(analytics.period).toBe('week');
      expect(analytics.metrics.totalDeployments).toBe(4); // Including the original test deployment
      expect(analytics.metrics.successfulDeployments).toBe(2);
      expect(analytics.metrics.failedDeployments).toBe(1);
      expect(analytics.metrics.successRate).toBe(50); // 2 out of 4
      expect(analytics.metrics.deploymentsByStatus).toHaveProperty('success');
      expect(analytics.metrics.deploymentsByStatus).toHaveProperty('failed');
      expect(analytics.metrics.deploymentsByDay).toBeDefined();
      expect(analytics.trends).toBeDefined();
    });

    it('should calculate average deployment time correctly', async () => {
      const analytics = await deploymentTrackingService.getDeploymentAnalytics(
        testRepositoryId,
        testUserId,
        'week'
      );

      // Should calculate average from completed deployments only
      expect(analytics.metrics.averageDeploymentTime).toBeGreaterThan(0);
    });

    it('should group deployments by day', async () => {
      const analytics = await deploymentTrackingService.getDeploymentAnalytics(
        testRepositoryId,
        testUserId,
        'week'
      );

      expect(analytics.metrics.deploymentsByDay).toBeInstanceOf(Array);
      expect(analytics.metrics.deploymentsByDay.length).toBeGreaterThan(0);
      
      const dayWithDeployments = analytics.metrics.deploymentsByDay.find(day => day.count > 0);
      expect(dayWithDeployments).toBeDefined();
      expect(dayWithDeployments?.successCount).toBeGreaterThanOrEqual(0);
      expect(dayWithDeployments?.failureCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRecoveryOptions', () => {
    let successfulDeploymentId: string;

    beforeEach(async () => {
      // Create successful deployments for recovery options
      const deployment1 = await prisma.deployment.create({
        data: {
          repositoryId: testRepositoryId,
          pipelineId: testPipelineId,
          commit: 'recovery1',
          status: 'SUCCESS',
          startedAt: new Date(Date.now() - 86400000 * 2),
          completedAt: new Date(Date.now() - 86400000 * 2 + 300000),
        },
      });
      successfulDeploymentId = deployment1.id;

      await prisma.deployment.create({
        data: {
          repositoryId: testRepositoryId,
          pipelineId: testPipelineId,
          commit: 'recovery2',
          status: 'SUCCESS',
          startedAt: new Date(Date.now() - 86400000 * 1),
          completedAt: new Date(Date.now() - 86400000 * 1 + 300000),
        },
      });

      // Update test deployment to failed
      await prisma.deployment.update({
        where: { id: testDeploymentId },
        data: { status: 'FAILED', completedAt: new Date() },
      });
    });

    it('should get recovery options for failed deployment', async () => {
      const options = await deploymentTrackingService.getRecoveryOptions(
        testDeploymentId,
        testUserId
      );

      expect(options.canRollback).toBe(true);
      expect(options.canRetry).toBe(true);
      expect(options.rollbackTargets).toHaveLength(2);
      expect(options.suggestedActions).toContain('Review deployment logs for error details');
      expect(options.suggestedActions).toContain('Retry deployment with the same configuration');
      expect(options.suggestedActions).toContain('Rollback to a previous successful deployment');
    });

    it('should provide rollback targets with correct information', async () => {
      const options = await deploymentTrackingService.getRecoveryOptions(
        testDeploymentId,
        testUserId
      );

      const rollbackTarget = options.rollbackTargets[0];
      expect(rollbackTarget.commit).toBe('recovery2'); // Most recent successful
      expect(rollbackTarget.description).toContain('recovery'); // commit truncated to 8 chars
      expect(rollbackTarget.timestamp).toBeDefined();
    });

    it('should indicate no rollback available if no successful deployments', async () => {
      // Delete successful deployments
      await prisma.deployment.deleteMany({
        where: {
          repositoryId: testRepositoryId,
          status: 'SUCCESS',
        },
      });

      const options = await deploymentTrackingService.getRecoveryOptions(
        testDeploymentId,
        testUserId
      );

      expect(options.canRollback).toBe(false);
      expect(options.rollbackTargets).toHaveLength(0);
    });
  });

  describe('getDeploymentHealthMetrics', () => {
    beforeEach(async () => {
      const now = new Date();
      
      // Create deployments for health metrics
      await prisma.deployment.createMany({
        data: [
          {
            repositoryId: testRepositoryId,
            pipelineId: testPipelineId,
            commit: 'health1',
            status: 'RUNNING',
            startedAt: new Date(now.getTime() - 3600000), // 1 hour ago
          },
          {
            repositoryId: testRepositoryId,
            pipelineId: testPipelineId,
            commit: 'health2',
            status: 'PENDING',
            startedAt: new Date(now.getTime() - 1800000), // 30 minutes ago
          },
          {
            repositoryId: testRepositoryId,
            pipelineId: testPipelineId,
            commit: 'health3',
            status: 'FAILED',
            startedAt: new Date(now.getTime() - 7200000), // 2 hours ago
            completedAt: new Date(now.getTime() - 7200000 + 600000), // 10 minutes later
            logs: [
              {
                id: 'error1',
                timestamp: new Date(),
                level: 'error',
                message: 'Build failed due to compilation error',
              },
            ],
          },
          {
            repositoryId: testRepositoryId,
            pipelineId: testPipelineId,
            commit: 'health4',
            status: 'SUCCESS',
            startedAt: new Date(now.getTime() - 10800000), // 3 hours ago
            completedAt: new Date(now.getTime() - 10800000 + 300000), // 5 minutes later
          },
        ],
      });
    });

    it('should get deployment health metrics', async () => {
      const healthMetrics = await deploymentTrackingService.getDeploymentHealthMetrics(testUserId);

      expect(healthMetrics.activeDeployments).toBe(3); // RUNNING + 2 PENDING (1 from health describe, 1 global)
      expect(healthMetrics.queuedDeployments).toBe(2); // 2 PENDING
      expect(healthMetrics.failureRate).toBeGreaterThan(0);
      expect(healthMetrics.averageDeploymentTime).toBeGreaterThan(0);
      expect(healthMetrics.recentFailures).toHaveLength(1);
      expect(healthMetrics.recentFailures[0].error).toBe('Build failed due to compilation error');
    });

    it('should calculate failure rate correctly', async () => {
      const healthMetrics = await deploymentTrackingService.getDeploymentHealthMetrics(testUserId);

      // Should be 50% (1 failed out of 2 completed in last 24 hours)
      expect(healthMetrics.failureRate).toBe(50);
    });
  });

  describe('getDeploymentTrends', () => {
    beforeEach(async () => {
      const now = new Date();
      
      // Create deployments over multiple days for trend analysis
      await prisma.deployment.createMany({
        data: [
          // Day 1 - 2 successful
          {
            repositoryId: testRepositoryId,
            pipelineId: testPipelineId,
            commit: 'trend1',
            status: 'SUCCESS',
            startedAt: new Date(now.getTime() - 86400000 * 5),
            completedAt: new Date(now.getTime() - 86400000 * 5 + 300000),
          },
          {
            repositoryId: testRepositoryId,
            pipelineId: testPipelineId,
            commit: 'trend2',
            status: 'SUCCESS',
            startedAt: new Date(now.getTime() - 86400000 * 5 + 3600000),
            completedAt: new Date(now.getTime() - 86400000 * 5 + 3600000 + 240000),
          },
          // Day 2 - 1 failed
          {
            repositoryId: testRepositoryId,
            pipelineId: testPipelineId,
            commit: 'trend3',
            status: 'FAILED',
            startedAt: new Date(now.getTime() - 86400000 * 3),
            completedAt: new Date(now.getTime() - 86400000 * 3 + 600000),
            logs: [
              {
                id: 'error1',
                timestamp: new Date(),
                level: 'error',
                message: 'Network timeout during deployment',
              },
            ],
          },
          // Day 3 - 1 successful
          {
            repositoryId: testRepositoryId,
            pipelineId: testPipelineId,
            commit: 'trend4',
            status: 'SUCCESS',
            startedAt: new Date(now.getTime() - 86400000 * 1),
            completedAt: new Date(now.getTime() - 86400000 * 1 + 180000),
          },
        ],
      });
    });

    it('should get deployment trends', async () => {
      const trends = await deploymentTrackingService.getDeploymentTrends(testUserId, 7);

      expect(trends.deploymentFrequency).toBeInstanceOf(Array);
      expect(trends.performanceMetrics).toBeInstanceOf(Array);
      expect(trends.topFailureReasons).toBeInstanceOf(Array);

      // Check that we have data for the days
      const daysWithDeployments = trends.deploymentFrequency.filter(day => day.count > 0);
      expect(daysWithDeployments.length).toBeGreaterThan(0);

      // Check performance metrics
      const metricsWithData = trends.performanceMetrics.filter(metric => metric.averageTime > 0);
      expect(metricsWithData.length).toBeGreaterThan(0);

      // Check failure reasons
      if (trends.topFailureReasons.length > 0) {
        expect(trends.topFailureReasons[0].reason).toBeDefined();
        expect(trends.topFailureReasons[0].count).toBeGreaterThan(0);
        expect(trends.topFailureReasons[0].percentage).toBeGreaterThan(0);
      }
    });

    it('should categorize failure reasons correctly', async () => {
      const trends = await deploymentTrackingService.getDeploymentTrends(testUserId, 7);

      const timeoutFailure = trends.topFailureReasons.find(reason => reason.reason === 'Timeout');
      expect(timeoutFailure).toBeDefined();
      expect(timeoutFailure?.count).toBe(1);
    });

    it('should calculate success rates by day', async () => {
      const trends = await deploymentTrackingService.getDeploymentTrends(testUserId, 7);

      const performanceData = trends.performanceMetrics.filter(metric => metric.successRate > 0);
      expect(performanceData.length).toBeGreaterThan(0);

      // Find day with 100% success rate (days with only successful deployments)
      const perfectDay = performanceData.find(metric => metric.successRate === 100);
      expect(perfectDay).toBeDefined();
    });
  });
});