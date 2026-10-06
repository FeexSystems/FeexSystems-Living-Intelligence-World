 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { Server as SocketIOServer } from 'socket.io';

import jwt from 'jsonwebtoken';
import { deploymentTrackingService } from './deployment-tracking.service';
import { pipelineService } from './pipeline.service';






































export class DeploymentWebSocketService {
  
   __init() {this.connectedUsers = new Map()} // userId -> Set of socketIds
   __init2() {this.deploymentSubscriptions = new Map()} // deploymentId -> Set of socketIds

  constructor(server) {;DeploymentWebSocketService.prototype.__init.call(this);DeploymentWebSocketService.prototype.__init2.call(this);
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
   setupSocketHandlers() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || _optionalChain([socket, 'access', _ => _.handshake, 'access', _2 => _2.headers, 'access', _3 => _3.authorization, 'optionalAccess', _4 => _4.replace, 'call', _5 => _5('Bearer ', '')]);
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET) ;
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
      this.connectedUsers.get(userId).add(socket.id);

      // Handle deployment subscription
      socket.on('subscribe:deployment', async (data) => {
        try {
          const { deploymentId } = data;
          
          // Verify user has access to this deployment
          await deploymentTrackingService.getDeployment(deploymentId, userId);
          
          // Add to deployment subscription
          if (!this.deploymentSubscriptions.has(deploymentId)) {
            this.deploymentSubscriptions.set(deploymentId, new Set());
          }
          this.deploymentSubscriptions.get(deploymentId).add(socket.id);
          
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
        } catch (error) {
          socket.emit('error', {
            type: 'SUBSCRIPTION_ERROR',
            message: 'Failed to subscribe to deployment updates',
            details: error.message,
          });
        }
      });

      // Handle deployment unsubscription
      socket.on('unsubscribe:deployment', (data) => {
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
      socket.on('subscribe:repository', async (data) => {
        try {
          const { repositoryId } = data;
          
          // Verify user has access to this repository
          // This will throw if user doesn't have access
          await deploymentTrackingService.getRepositoryDeployments(repositoryId, userId, { limit: 1 });
          
          // Join repository room
          socket.join(`repository:${repositoryId}`);
          
          console.log(`User ${userId} subscribed to repository ${repositoryId} deployments`);
        } catch (error) {
          socket.emit('error', {
            type: 'SUBSCRIPTION_ERROR',
            message: 'Failed to subscribe to repository deployments',
            details: error.message,
          });
        }
      });

      // Handle repository unsubscription
      socket.on('unsubscribe:repository', (data) => {
        const { repositoryId } = data;
        socket.leave(`repository:${repositoryId}`);
        console.log(`User ${userId} unsubscribed from repository ${repositoryId} deployments`);
      });

      // Handle deployment action requests
      socket.on('deployment:cancel', async (data) => {
        try {
          const { deploymentId, reason } = data;
          await deploymentTrackingService.cancelDeployment(deploymentId, userId, reason);
          
          socket.emit('deployment:action:success', {
            action: 'cancel',
            deploymentId,
            message: 'Deployment canceled successfully',
          });
        } catch (error) {
          socket.emit('deployment:action:error', {
            action: 'cancel',
            deploymentId: data.deploymentId,
            message: error.message,
          });
        }
      });

      socket.on('deployment:rollback', async (data




) => {
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
        } catch (error) {
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
   setupEventListeners() {
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
    userId,
    event,
    data
  ) {
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
    deploymentId,
    event,
    data
  ) {
    this.io.to(`deployment:${deploymentId}`).emit(event, data);
  }

  /**
   * Broadcast repository deployment event to all subscribers
   */
  broadcastToRepository(
    repositoryId,
    event,
    data
  ) {
    this.io.to(`repository:${repositoryId}`).emit(event, data);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get deployment subscribers count
   */
  getDeploymentSubscribersCount(deploymentId) {
    return _optionalChain([this, 'access', _6 => _6.deploymentSubscriptions, 'access', _7 => _7.get, 'call', _8 => _8(deploymentId), 'optionalAccess', _9 => _9.size]) || 0;
  }

  /**
   * Calculate deployment summary from logs and status
   */
   calculateDeploymentSummary(deployment)



 {
    const logs = deployment.logs || [];
    const stageStartLogs = logs.filter((log) => 
      log.message && log.message.includes('Starting stage:')
    );
    const stageCompleteLogs = logs.filter((log) => 
      log.message && log.message.includes('Stage completed successfully:')
    );
    const stageFailedLogs = logs.filter((log) => 
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
  async broadcastHealthMetrics() {
    const connectedUserIds = Array.from(this.connectedUsers.keys());
    
    for (const userId of connectedUserIds) {
      try {
        const healthMetrics = await deploymentTrackingService.getDeploymentHealthMetrics(userId);
        
        await this.notifyUser(userId, 'deployment:health', {
          deploymentId: '', // Not specific to a deployment
          status: 'health_update',
          timestamp: new Date(),
          metadata: { healthMetrics },
        } );
      } catch (error) {
        console.error(`Error broadcasting health metrics to user ${userId}:`, error);
      }
    }
  }

  /**
   * Start periodic health metrics broadcasting
   */
  startHealthMetricsBroadcast(intervalMs = 30000) {
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
    userId,
    alert







  ) {
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
    } );
  }
}

export let deploymentWebSocketService;

export function initializeDeploymentWebSocket(server) {
  deploymentWebSocketService = new DeploymentWebSocketService(server);
}