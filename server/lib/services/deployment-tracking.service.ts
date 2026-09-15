import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { Deployment, DeploymentLog } from '../types/devops';
import { repositoryService } from './repository.service';
import { pipelineService } from './pipeline.service';

const prisma = new PrismaClient();

export interface DeploymentMetrics {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  averageDeploymentTime: number;
  successRate: number;
  deploymentsByStatus: Record<string, number>;
  deploymentsByDay: Array<{
    date: string;
    count: number;
    successCount: number;
    failureCount: number;
  }>;
}

export interface DeploymentAnalytics {
  repositoryId: string;
  period: 'day' | 'week' | 'month' | 'year';
  metrics: DeploymentMetrics;
  trends: {
    deploymentFrequency: number;
    successRateTrend: number;
    averageTimeTrend: number;
  };
}

export interface RollbackOptions {
  targetCommit?: string;
  targetDeploymentId?: string;
  reason?: string;
  skipValidation?: boolean;
}

export class DeploymentTrackingService extends EventEmitter {
  private deploymentStatusCache = new Map<string, any>();

  /**
   * Get deployment by ID with detailed information
   */
  async getDeployment(deploymentId: string, userId: string): Promise<Deployment> {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        repository: true,
        pipeline: true,
      },
    });

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    // Verify user has access to this deployment
    if (deployment.repository.userId !== userId) {
      throw new Error('Access denied');
    }

    return this.mapDeploymentFromDb(deployment);
  }

  /**
   * Get deployments for a repository with filtering and pagination
   */
  async getRepositoryDeployments(
    repositoryId: string,
    userId: string,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    deployments: Deployment[];
    total: number;
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    // Verify repository belongs to user
    const repositories = await repositoryService.getUserRepositories(userId);
    const repository = repositories.find(repo => repo.id === repositoryId);
    
    if (!repository) {
      throw new Error('Repository not found or access denied');
    }

    const { status, limit = 20, offset = 0, startDate, endDate } = options;

    // Build where clause
    const where: any = { repositoryId };
    
    if (status) {
      where.status = status.toUpperCase();
    }
    
    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) where.startedAt.gte = startDate;
      if (endDate) where.startedAt.lte = endDate;
    }

    // Get total count
    const total = await prisma.deployment.count({ where });

    // Get deployments
    const deployments = await prisma.deployment.findMany({
      where,
      include: {
        repository: true,
        pipeline: true,
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return {
      deployments: deployments.map(this.mapDeploymentFromDb),
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Update deployment status and emit real-time events
   */
  async updateDeploymentStatus(
    deploymentId: string,
    status: 'pending' | 'running' | 'success' | 'failed' | 'canceled',
    metadata?: {
      logs?: DeploymentLog[];
      errorMessage?: string;
      completedAt?: Date;
    }
  ): Promise<void> {
    const updateData: any = {
      status: status.toUpperCase(),
    };

    if (metadata?.logs) {
      updateData.logs = metadata.logs;
    }

    if (metadata?.completedAt || status === 'success' || status === 'failed' || status === 'canceled') {
      updateData.completedAt = metadata?.completedAt || new Date();
    }

    const deployment = await prisma.deployment.update({
      where: { id: deploymentId },
      data: updateData,
      include: {
        repository: true,
        pipeline: true,
      },
    });

    // Update cache
    this.deploymentStatusCache.set(deploymentId, {
      status,
      updatedAt: new Date(),
      logs: metadata?.logs || [],
    });

    // Emit real-time event
    this.emit('statusUpdate', {
      deploymentId,
      status,
      deployment: this.mapDeploymentFromDb(deployment),
      metadata,
    });

    // Update usage metrics if deployment completed
    if (status === 'success' || status === 'failed') {
      await this.updateUsageMetrics(deployment.repository.userId);
    }
  }

  /**
   * Add log entry to deployment and emit real-time event
   */
  async addDeploymentLog(
    deploymentId: string,
    log: {
      level: 'info' | 'warn' | 'error' | 'debug';
      message: string;
      stage?: string;
      timestamp?: Date;
    }
  ): Promise<void> {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    const logEntry: DeploymentLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: log.timestamp || new Date(),
      level: log.level,
      message: log.message,
      stage: log.stage,
    };

    const currentLogs = (deployment.logs as unknown as DeploymentLog[]) || [];
    const updatedLogs = [...currentLogs, logEntry];

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { logs: updatedLogs as any },
    });

    // Update cache
    const cached = this.deploymentStatusCache.get(deploymentId) || {};
    cached.logs = updatedLogs;
    this.deploymentStatusCache.set(deploymentId, cached);

    // Emit real-time log event
    this.emit('logUpdate', {
      deploymentId,
      log: logEntry,
      totalLogs: updatedLogs.length,
    });
  }

  /**
   * Get deployment logs with filtering
   */
  async getDeploymentLogs(
    deploymentId: string,
    userId: string,
    options: {
      level?: 'info' | 'warn' | 'error' | 'debug';
      stage?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    logs: DeploymentLog[];
    total: number;
  }> {
    const deployment = await this.getDeployment(deploymentId, userId);
    let logs = (deployment.logs || []) as DeploymentLog[];

    // Apply filters
    if (options.level) {
      logs = logs.filter(log => log.level === options.level);
    }

    if (options.stage) {
      logs = logs.filter(log => log.stage === options.stage);
    }

    const total = logs.length;

    // Apply pagination
    if (options.offset || options.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || 100;
      logs = logs.slice(offset, offset + limit);
    }

    return { logs, total };
  }

  /**
   * Rollback deployment to a previous state
   */
  async rollbackDeployment(
    deploymentId: string,
    userId: string,
    options: RollbackOptions = {}
  ): Promise<Deployment> {
    const deployment = await this.getDeployment(deploymentId, userId);

    if (deployment.status !== 'success' && deployment.status !== 'failed') {
      throw new Error('Can only rollback completed deployments');
    }

    // Determine target for rollback
    let targetCommit = options.targetCommit;
    
    if (!targetCommit && options.targetDeploymentId) {
      const targetDeployment = await this.getDeployment(options.targetDeploymentId, userId);
      if (targetDeployment.repositoryId !== deployment.repositoryId) {
        throw new Error('Target deployment must be from the same repository');
      }
      targetCommit = targetDeployment.commit;
    }

    if (!targetCommit) {
      // Find the last successful deployment before this one
      const previousDeployment = await prisma.deployment.findFirst({
        where: {
          repositoryId: deployment.repositoryId,
          status: 'SUCCESS',
          startedAt: { lt: deployment.startedAt },
        },
        orderBy: { startedAt: 'desc' },
      });

      if (!previousDeployment) {
        throw new Error('No previous successful deployment found for rollback');
      }

      targetCommit = previousDeployment.commit;
    }

    // Validate target commit if not skipping validation
    if (!options.skipValidation) {
      // Here you would typically validate that the target commit exists
      // and is accessible in the repository
    }

    // Create rollback deployment
    const rollbackDeployment = await prisma.deployment.create({
      data: {
        repositoryId: deployment.repositoryId,
        pipelineId: deployment.pipelineId,
        commit: targetCommit,
        status: 'PENDING',
        logs: [
          {
            id: `${Date.now()}-rollback`,
            timestamp: new Date(),
            level: 'info',
            message: `Rollback initiated from deployment ${deploymentId}${options.reason ? `: ${options.reason}` : ''}`,
          },
        ],
      },
      include: {
        repository: true,
        pipeline: true,
      },
    });

    // If there's a pipeline, execute it for the rollback
    if (deployment.pipelineId) {
      try {
        await pipelineService.executePipeline(deployment.pipelineId, userId, targetCommit);
      } catch (error: any) {
        await this.updateDeploymentStatus(rollbackDeployment.id, 'failed', {
          errorMessage: `Rollback failed: ${error.message}`,
        });
        throw error;
      }
    }

    // Log the rollback action
    await this.addDeploymentLog(deploymentId, {
      level: 'info',
      message: `Rollback deployment created: ${rollbackDeployment.id}`,
    });

    return this.mapDeploymentFromDb(rollbackDeployment);
  }

  /**
   * Get deployment analytics for a repository
   */
  async getDeploymentAnalytics(
    repositoryId: string,
    userId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<DeploymentAnalytics> {
    // Verify repository belongs to user
    const repositories = await repositoryService.getUserRepositories(userId);
    const repository = repositories.find(repo => repo.id === repositoryId);
    
    if (!repository) {
      throw new Error('Repository not found or access denied');
    }

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    // Get deployments for the period
    const deployments = await prisma.deployment.findMany({
      where: {
        repositoryId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    // Calculate metrics
    const totalDeployments = deployments.length;
    const successfulDeployments = deployments.filter(d => d.status === 'SUCCESS').length;
    const failedDeployments = deployments.filter(d => d.status === 'FAILED').length;
    
    const completedDeployments = deployments.filter(d => d.completedAt);
    const averageDeploymentTime = completedDeployments.length > 0
      ? completedDeployments.reduce((sum, d) => {
          const duration = d.completedAt!.getTime() - d.startedAt.getTime();
          return sum + duration;
        }, 0) / completedDeployments.length
      : 0;

    const successRate = totalDeployments > 0 ? (successfulDeployments / totalDeployments) * 100 : 0;

    // Group deployments by status
    const deploymentsByStatus = deployments.reduce((acc, deployment) => {
      const status = deployment.status.toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group deployments by day
    const deploymentsByDay = this.groupDeploymentsByDay(deployments, startDate, endDate);

    // Calculate trends (compare with previous period)
    const previousPeriodStart = new Date(startDate);
    const previousPeriodEnd = new Date(startDate);
    const periodDuration = endDate.getTime() - startDate.getTime();
    previousPeriodStart.setTime(startDate.getTime() - periodDuration);

    const previousDeployments = await prisma.deployment.findMany({
      where: {
        repositoryId,
        startedAt: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
      },
    });

    const previousSuccessRate = previousDeployments.length > 0
      ? (previousDeployments.filter(d => d.status === 'SUCCESS').length / previousDeployments.length) * 100
      : 0;

    const previousCompletedDeployments = previousDeployments.filter(d => d.completedAt);
    const previousAverageTime = previousCompletedDeployments.length > 0
      ? previousCompletedDeployments.reduce((sum, d) => {
          const duration = d.completedAt!.getTime() - d.startedAt.getTime();
          return sum + duration;
        }, 0) / previousCompletedDeployments.length
      : 0;

    const trends = {
      deploymentFrequency: totalDeployments - previousDeployments.length,
      successRateTrend: successRate - previousSuccessRate,
      averageTimeTrend: averageDeploymentTime - previousAverageTime,
    };

    return {
      repositoryId,
      period,
      metrics: {
        totalDeployments,
        successfulDeployments,
        failedDeployments,
        averageDeploymentTime,
        successRate,
        deploymentsByStatus,
        deploymentsByDay,
      },
      trends,
    };
  }

  /**
   * Get deployment status from cache (for real-time updates)
   */
  getDeploymentStatusFromCache(deploymentId: string): any {
    return this.deploymentStatusCache.get(deploymentId);
  }

  /**
   * Get deployment health metrics for monitoring
   */
  async getDeploymentHealthMetrics(userId: string): Promise<{
    activeDeployments: number;
    queuedDeployments: number;
    failureRate: number;
    averageDeploymentTime: number;
    recentFailures: Array<{
      deploymentId: string;
      repositoryId: string;
      error: string;
      timestamp: Date;
    }>;
  }> {
    const repositories = await repositoryService.getUserRepositories(userId);
    const repositoryIds = repositories.map(repo => repo.id);

    // Get active and queued deployments
    const activeDeployments = await prisma.deployment.count({
      where: {
        repositoryId: { in: repositoryIds },
        status: { in: ['PENDING', 'RUNNING'] },
      },
    });

    const queuedDeployments = await prisma.deployment.count({
      where: {
        repositoryId: { in: repositoryIds },
        status: 'PENDING',
      },
    });

    // Calculate failure rate for the last 24 hours
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const recentDeployments = await prisma.deployment.findMany({
      where: {
        repositoryId: { in: repositoryIds },
        startedAt: { gte: last24Hours },
        status: { in: ['SUCCESS', 'FAILED'] },
      },
    });

    const failedDeployments = recentDeployments.filter(d => d.status === 'FAILED');
    const failureRate = recentDeployments.length > 0
      ? (failedDeployments.length / recentDeployments.length) * 100
      : 0;

    // Calculate average deployment time
    const completedDeployments = recentDeployments.filter(d => d.completedAt);
    const averageDeploymentTime = completedDeployments.length > 0
      ? completedDeployments.reduce((sum, d) => {
          const duration = d.completedAt!.getTime() - d.startedAt.getTime();
          return sum + duration;
        }, 0) / completedDeployments.length
      : 0;

    // Get recent failures with error details
    const recentFailures = await prisma.deployment.findMany({
      where: {
        repositoryId: { in: repositoryIds },
        status: 'FAILED',
        startedAt: { gte: last24Hours },
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
    });

    const recentFailuresWithErrors = recentFailures.map(deployment => {
      const logs = (deployment.logs as any[]) || [];
      const errorLog = logs.find(log => log.level === 'error');
      
      return {
        deploymentId: deployment.id,
        repositoryId: deployment.repositoryId,
        error: errorLog?.message || 'Unknown error',
        timestamp: deployment.startedAt,
      };
    });

    return {
      activeDeployments,
      queuedDeployments,
      failureRate,
      averageDeploymentTime,
      recentFailures: recentFailuresWithErrors,
    };
  }

  /**
   * Get deployment performance trends
   */
  async getDeploymentTrends(
    userId: string,
    days: number = 30
  ): Promise<{
    deploymentFrequency: Array<{
      date: string;
      count: number;
      successCount: number;
      failureCount: number;
    }>;
    performanceMetrics: Array<{
      date: string;
      averageTime: number;
      successRate: number;
    }>;
    topFailureReasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
  }> {
    const repositories = await repositoryService.getUserRepositories(userId);
    const repositoryIds = repositories.map(repo => repo.id);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const deployments = await prisma.deployment.findMany({
      where: {
        repositoryId: { in: repositoryIds },
        startedAt: { gte: startDate },
      },
      orderBy: { startedAt: 'asc' },
    });

    // Group deployments by day
    const deploymentsByDay = this.groupDeploymentsByDay(deployments, startDate, new Date());

    // Calculate performance metrics by day
    const performanceMetrics = deploymentsByDay.map(dayData => {
      const dayDeployments = deployments.filter(d => 
        d.startedAt.toISOString().split('T')[0] === dayData.date
      );

      const completedDeployments = dayDeployments.filter(d => d.completedAt);
      const averageTime = completedDeployments.length > 0
        ? completedDeployments.reduce((sum, d) => {
            const duration = d.completedAt!.getTime() - d.startedAt.getTime();
            return sum + duration;
          }, 0) / completedDeployments.length
        : 0;

      const successRate = dayDeployments.length > 0
        ? (dayData.successCount / dayDeployments.length) * 100
        : 0;

      return {
        date: dayData.date,
        averageTime,
        successRate,
      };
    });

    // Analyze failure reasons
    const failedDeployments = deployments.filter(d => d.status === 'FAILED');
    const failureReasons = new Map<string, number>();

    failedDeployments.forEach(deployment => {
      const logs = (deployment.logs as any[]) || [];
      const errorLog = logs.find(log => log.level === 'error');
      const reason = this.categorizeFailureReason(errorLog?.message || 'Unknown error');
      
      failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1);
    });

    const totalFailures = failedDeployments.length;
    const topFailureReasons = Array.from(failureReasons.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: totalFailures > 0 ? (count / totalFailures) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      deploymentFrequency: deploymentsByDay,
      performanceMetrics,
      topFailureReasons,
    };
  }

  /**
   * Categorize failure reasons for analytics
   */
  private categorizeFailureReason(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Timeout';
    } else if (message.includes('network') || message.includes('connection')) {
      return 'Network Error';
    } else if (message.includes('permission') || message.includes('unauthorized')) {
      return 'Permission Error';
    } else if (message.includes('build') || message.includes('compile')) {
      return 'Build Error';
    } else if (message.includes('test') || message.includes('failed test')) {
      return 'Test Failure';
    } else if (message.includes('dependency') || message.includes('package')) {
      return 'Dependency Error';
    } else if (message.includes('memory') || message.includes('out of memory')) {
      return 'Memory Error';
    } else if (message.includes('disk') || message.includes('space')) {
      return 'Disk Space Error';
    } else if (message.includes('docker') || message.includes('container')) {
      return 'Container Error';
    } else {
      return 'Other';
    }
  }

  /**
   * Cancel a running deployment
   */
  async cancelDeployment(deploymentId: string, userId: string, reason?: string): Promise<void> {
    const deployment = await this.getDeployment(deploymentId, userId);

    if (deployment.status !== 'pending' && deployment.status !== 'running') {
      throw new Error('Can only cancel pending or running deployments');
    }

    await this.updateDeploymentStatus(deploymentId, 'canceled', {
      completedAt: new Date(),
    });

    await this.addDeploymentLog(deploymentId, {
      level: 'info',
      message: `Deployment canceled${reason ? `: ${reason}` : ''}`,
    });

    // If this is a pipeline deployment, stop the pipeline execution
    if (deployment.pipelineId) {
      // The pipeline service should handle stopping the execution
      this.emit('cancelPipeline', {
        deploymentId,
        pipelineId: deployment.pipelineId,
      });
    }
  }

  /**
   * Get deployment recovery suggestions
   */
  async getRecoveryOptions(deploymentId: string, userId: string): Promise<{
    canRollback: boolean;
    rollbackTargets: Array<{
      deploymentId: string;
      commit: string;
      timestamp: Date;
      description: string;
    }>;
    canRetry: boolean;
    suggestedActions: string[];
  }> {
    const deployment = await this.getDeployment(deploymentId, userId);

    // Find previous successful deployments for rollback options
    const previousSuccessfulDeployments = await prisma.deployment.findMany({
      where: {
        repositoryId: deployment.repositoryId,
        status: 'SUCCESS',
        startedAt: { lt: deployment.startedAt },
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
    });

    const rollbackTargets = previousSuccessfulDeployments.map(d => ({
      deploymentId: d.id,
      commit: d.commit,
      timestamp: d.startedAt,
      description: `Deployment from ${d.startedAt.toISOString().split('T')[0]} (${d.commit.substring(0, 8)})`,
    }));

    const canRollback = rollbackTargets.length > 0 && 
                       (deployment.status === 'failed' || deployment.status === 'success');
    
    const canRetry = deployment.status === 'failed' && deployment.pipelineId !== null;

    const suggestedActions: string[] = [];
    
    if (deployment.status === 'failed') {
      suggestedActions.push('Review deployment logs for error details');
      if (canRetry) {
        suggestedActions.push('Retry deployment with the same configuration');
      }
      if (canRollback) {
        suggestedActions.push('Rollback to a previous successful deployment');
      }
      suggestedActions.push('Check repository for recent changes that might have caused the failure');
    }

    return {
      canRollback,
      rollbackTargets,
      canRetry,
      suggestedActions,
    };
  }

  /**
   * Group deployments by day for analytics
   */
  private groupDeploymentsByDay(
    deployments: any[],
    startDate: Date,
    endDate: Date
  ): Array<{
    date: string;
    count: number;
    successCount: number;
    failureCount: number;
  }> {
    const dayMap = new Map<string, { count: number; successCount: number; failureCount: number }>();
    
    // Initialize all days in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dayMap.set(dateStr, { count: 0, successCount: 0, failureCount: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count deployments by day
    deployments.forEach(deployment => {
      const dateStr = deployment.startedAt.toISOString().split('T')[0];
      const dayData = dayMap.get(dateStr);
      if (dayData) {
        dayData.count++;
        if (deployment.status === 'SUCCESS') {
          dayData.successCount++;
        } else if (deployment.status === 'FAILED') {
          dayData.failureCount++;
        }
      }
    });

    return Array.from(dayMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  /**
   * Update usage metrics for deployment tracking
   */
  private async updateUsageMetrics(userId: string): Promise<void> {
    const currentPeriod = new Date().toISOString().substring(0, 7); // YYYY-MM format

    await prisma.usageMetrics.upsert({
      where: {
        userId_period: {
          userId,
          period: currentPeriod,
        },
      },
      update: {
        deploymentCount: {
          increment: 1,
        },
      },
      create: {
        userId,
        period: currentPeriod,
        deploymentCount: 1,
      },
    });
  }

  /**
   * Map database deployment to domain model
   */
  private mapDeploymentFromDb(deployment: any): Deployment {
    return {
      id: deployment.id,
      repositoryId: deployment.repositoryId,
      pipelineId: deployment.pipelineId,
      commit: deployment.commit,
      status: deployment.status.toLowerCase() as any,
      logs: deployment.logs as DeploymentLog[],
      startedAt: deployment.startedAt,
      completedAt: deployment.completedAt,
    };
  }
}

export const deploymentTrackingService = new DeploymentTrackingService();