import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { deploymentTrackingService } from './deployment-tracking.service';
import { pipelineService } from './pipeline.service';

export interface DeploymentWebSocketEvents {
  'deployment:status': {
    deploymentId: string;
    status: string;
    timestamp: Date;
    metadata?: any;
  };
  'deployment:log': {
    deploymentId: string;
    log: {
      id: string;
      timestamp: Date;
      level: string;
      message: string;
      stage?: string;
    };
  };
  'deployment:progress': {
    deploymentId: string;
    stage: string;
    progress: number;
    message: string;
  };
  'deployment:complete': {
    deploymentId: string;
    status: 'success' | 'failed' | 'canceled';
    duration: number;
    summary: {
      totalStages: number;
      completedStages: number;
      failedStages: number;
    };
  };
  'deployment:health': any;
  'deployment:alert': any;
}

export class DeploymentWebSocketService {
  private io: SocketIOServer;
  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private deploymentSubscriptions = new Map<string, Set<string>>(); // deploymentId -> Set of socketIds

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/socket.io/deployments',
    });

    this.setupSocketHandlers();
    this.setupEventListeners();
  }

  /**
   * Setup Socket.IO connection handlers
   */
  private setupSocketHandlers(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.data.userId = decoded.userId;
        socket.data.user = decoded;
        
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });

    this.io.on('connection', (socket) => {
      const userId = socket.data.userId;
      
      console.log(`User ${userId} connected to deployment WebSocket`);

      // Track connected user
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(socket.id);

      // Handle deployment subscription
      socket.on('subscribe:deployment', async (data: { deploymentId: string }) => {
        try {
          const { deploymentId } = data;
          
          // Verify user has access to this deployment
          await deploymentTrackingService.getDeployment(deploymentId, userId);
          
          // Add to deployment subscription
          if (!this.deploymentSubscriptions.has(deploymentId)) {
            this.deploymentSubscriptions.set(deploymentId, new Set());
          }
          this.deploymentSubscriptions.get(deploymentId)!.add(socket.id);
          
          // Join deployment room
          socket.join(`deployment:${deploymentId}`);
          
          // Send current deployment status
          const cachedStatus = deploymentTrackingService.getDeploymentStatusFromCache(deploymentId);
          if (cachedStatus) {
            socket.emit('deployment:status', {
              deploymentId,
              status: cachedStatus.status,
              timestamp: cachedStatus.updatedAt,
            });
          }
          
          console.log(`User ${userId} subscribed to deployment ${deploymentId}`);
        } catch (error: any) {
          socket.emit('error', {
            type: 'SUBSCRIPTION_ERROR',
            message: 'Failed to subscribe to deployment updates',
            details: error.message,
          });
        }
      });

      // Handle deployment unsubscription
      socket.on('unsubscribe:deployment', (data: { deploymentId: string }) => {
        const { deploymentId } = data;
        
        // Remove from deployment subscription
        const subscribers = this.deploymentSubscriptions.get(deploymentId);
        if (subscribers) {
          subscribers.delete(socket.id);
          if (subscribers.size === 0) {
            this.deploymentSubscriptions.delete(deploymentId);
          }
        }
        
        // Leave deployment room
        socket.leave(`deployment:${deploymentId}`);
        
        console.log(`User ${userId} unsubscribed from deployment ${deploymentId}`);
      });

      // Handle repository deployment subscription (for all deployments in a repo)
      socket.on('subscribe:repository', async (data: { repositoryId: string }) => {
        try {
          const { repositoryId } = data;
          
          // Verify user has access to this repository
          // This will throw if user doesn't have access
          await deploymentTrackingService.getRepositoryDeployments(repositoryId, userId, { limit: 1 });
          
          // Join repository room
          socket.join(`repository:${repositoryId}`);
          
          console.log(`User ${userId} subscribed to repository ${repositoryId} deployments`);
        } catch (error: any) {
          socket.emit('error', {
            type: 'SUBSCRIPTION_ERROR',
            message: 'Failed to subscribe to repository deployments',
            details: error.message,
          });
        }
      });

      // Handle repository unsubscription
      socket.on('unsubscribe:repository', (data: { repositoryId: string }) => {
        const { repositoryId } = data;
        socket.leave(`repository:${repositoryId}`);
        console.log(`User ${userId} unsubscribed from repository ${repositoryId} deployments`);
      });

      // Handle deployment action requests
      socket.on('deployment:cancel', async (data: { deploymentId: string; reason?: string }) => {
        try {
          const { deploymentId, reason } = data;
          await deploymentTrackingService.cancelDeployment(deploymentId, userId, reason);
          
          socket.emit('deployment:action:success', {
            action: 'cancel',
            deploymentId,
            message: 'Deployment canceled successfully',
          });
        } catch (error: any) {
          socket.emit('deployment:action:error', {
            action: 'cancel',
            deploymentId: data.deploymentId,
            message: error.message,
          });
        }
      });

      socket.on('deployment:rollback', async (data: { 
        deploymentId: string; 
        targetCommit?: string; 
        targetDeploymentId?: string;
        reason?: string;
      }) => {
        try {
          const { deploymentId, targetCommit, targetDeploymentId, reason } = data;
          const rollbackDeployment = await deploymentTrackingService.rollbackDeployment(
            deploymentId,
            userId,
            { targetCommit, targetDeploymentId, reason }
          );
          
          socket.emit('deployment:action:success', {
            action: 'rollback',
            deploymentId,
            rollbackDeploymentId: rollbackDeployment.id,
            message: 'Rollback deployment created successfully',
          });
        } catch (error: any) {
          socket.emit('deployment:action:error', {
            action: 'rollback',
            deploymentId: data.deploymentId,
            message: error.message,
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected from deployment WebSocket`);
        
        // Remove from connected users
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.connectedUsers.delete(userId);
          }
        }
        
        // Remove from all deployment subscriptions
        this.deploymentSubscriptions.forEach((subscribers, deploymentId) => {
          subscribers.delete(socket.id);
          if (subscribers.size === 0) {
            this.deploymentSubscriptions.delete(deploymentId);
          }
        });
      });
    });
  }

  /**
   * Setup event listeners for deployment tracking service
   */
  private setupEventListeners(): void {
    // Listen for deployment status updates
    deploymentTrackingService.on('statusUpdate', (data) => {
      const { deploymentId, status, deployment, metadata } = data;
      
      // Emit to deployment subscribers
      this.io.to(`deployment:${deploymentId}`).emit('deployment:status', {
        deploymentId,
        status,
        timestamp: new Date(),
        metadata,
      });
      
      // Emit to repository subscribers
      this.io.to(`repository:${deployment.repositoryId}`).emit('deployment:status', {
        deploymentId,
        status,
        timestamp: new Date(),
        repositoryId: deployment.repositoryId,
        metadata,
      });

      // If deployment completed, send completion event
      if (status === 'success' || status === 'failed' || status === 'canceled') {
        const duration = deployment.completedAt && deployment.startedAt
          ? deployment.completedAt.getTime() - deployment.startedAt.getTime()
          : 0;

        this.io.to(`deployment:${deploymentId}`).emit('deployment:complete', {
          deploymentId,
          status,
          duration,
          summary: this.calculateDeploymentSummary(deployment),
        });
      }
    });

    // Listen for deployment log updates
    deploymentTrackingService.on('logUpdate', (data) => {
      const { deploymentId, log } = data;
      
      this.io.to(`deployment:${deploymentId}`).emit('deployment:log', {
        deploymentId,
        log,
      });
    });

    // Listen for pipeline events to provide progress updates
    pipelineService.on('log', (data) => {
      const { deploymentId, log } = data;
      
      this.io.to(`deployment:${deploymentId}`).emit('deployment:log', {
        deploymentId,
        log,
      });
    });

    pipelineService.on('stageStart', (data) => {
      const { deploymentId, stage, totalStages, currentStage } = data;
      const progress = Math.round((currentStage / totalStages) * 100);
      
      this.io.to(`deployment:${deploymentId}`).emit('deployment:progress', {
        deploymentId,
        stage: stage.name,
        progress,
        message: `Starting stage: ${stage.name}`,
      });
    });

    pipelineService.on('stageComplete', (data) => {
      const { deploymentId, stage, totalStages, currentStage } = data;
      const progress = Math.round(((currentStage + 1) / totalStages) * 100);
      
      this.io.to(`deployment:${deploymentId}`).emit('deployment:progress', {
        deploymentId,
        stage: stage.name,
        progress,
        message: `Completed stage: ${stage.name}`,
      });
    });

    pipelineService.on('complete', (data) => {
      const { deploymentId, status } = data;
      
      this.io.to(`deployment:${deploymentId}`).emit('deployment:complete', {
        deploymentId,
        status: status.toLowerCase(),
        duration: 0, // Will be calculated by the status update handler
        summary: {
          totalStages: 0,
          completedStages: 0,
          failedStages: 0,
        },
      });
    });
  }

  /**
   * Send deployment notification to specific user
   */
  async notifyUser(
    userId: string,
    event: keyof DeploymentWebSocketEvents,
    data: DeploymentWebSocketEvents[keyof DeploymentWebSocketEvents]
  ): Promise<void> {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  /**
   * Broadcast deployment event to all subscribers
   */
  broadcastToDeployment(
    deploymentId: string,
    event: keyof DeploymentWebSocketEvents,
    data: DeploymentWebSocketEvents[keyof DeploymentWebSocketEvents]
  ): void {
    this.io.to(`deployment:${deploymentId}`).emit(event, data);
  }

  /**
   * Broadcast repository deployment event to all subscribers
   */
  broadcastToRepository(
    repositoryId: string,
    event: keyof DeploymentWebSocketEvents,
    data: DeploymentWebSocketEvents[keyof DeploymentWebSocketEvents]
  ): void {
    this.io.to(`repository:${repositoryId}`).emit(event, data);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get deployment subscribers count
   */
  getDeploymentSubscribersCount(deploymentId: string): number {
    return this.deploymentSubscriptions.get(deploymentId)?.size || 0;
  }

  /**
   * Calculate deployment summary from logs and status
   */
  private calculateDeploymentSummary(deployment: any): {
    totalStages: number;
    completedStages: number;
    failedStages: number;
  } {
    const logs = deployment.logs || [];
    const stageStartLogs = logs.filter((log: any) => 
      log.message && log.message.includes('Starting stage:')
    );
    const stageCompleteLogs = logs.filter((log: any) => 
      log.message && log.message.includes('Stage completed successfully:')
    );
    const stageFailedLogs = logs.filter((log: any) => 
      log.level === 'error' && log.message && log.message.includes('Stage failed:')
    );

    return {
      totalStages: stageStartLogs.length,
      completedStages: stageCompleteLogs.length,
      failedStages: stageFailedLogs.length,
    };
  }

  /**
   * Broadcast system health metrics to all connected users
   */
  async broadcastHealthMetrics(): Promise<void> {
    const connectedUserIds = Array.from(this.connectedUsers.keys());
    
    for (const userId of connectedUserIds) {
      try {
        const healthMetrics = await deploymentTrackingService.getDeploymentHealthMetrics(userId);
        
        await this.notifyUser(userId, 'deployment:health', {
          deploymentId: '', // Not specific to a deployment
          status: 'health_update',
          timestamp: new Date(),
          metadata: { healthMetrics },
        } as any);
      } catch (error) {
        console.error(`Error broadcasting health metrics to user ${userId}:`, error);
      }
    }
  }

  /**
   * Start periodic health metrics broadcasting
   */
  startHealthMetricsBroadcast(intervalMs: number = 30000): void {
    setInterval(() => {
      this.broadcastHealthMetrics().catch(error => {
        console.error('Error in health metrics broadcast:', error);
      });
    }, intervalMs);
  }

  /**
   * Send deployment alert to user
   */
  async sendDeploymentAlert(
    userId: string,
    alert: {
      type: 'failure' | 'success' | 'timeout' | 'rollback';
      deploymentId: string;
      repositoryId: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      metadata?: any;
    }
  ): Promise<void> {
    await this.notifyUser(userId, 'deployment:alert', {
      deploymentId: alert.deploymentId,
      status: alert.type,
      timestamp: new Date(),
      metadata: {
        alert: {
          ...alert,
          timestamp: new Date(),
        },
      },
    } as any);
  }
}

export let deploymentWebSocketService: DeploymentWebSocketService;

export function initializeDeploymentWebSocket(server: HttpServer): void {
  deploymentWebSocketService = new DeploymentWebSocketService(server);
}