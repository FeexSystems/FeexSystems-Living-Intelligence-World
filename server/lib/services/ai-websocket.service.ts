import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { aiService } from './ai.service';
import { aiRequestService } from './ai-request.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * AI WebSocket Service - Handles real-time AI response streaming
 */
export class AIWebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string[]> = new Map(); // userId -> socketIds

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true
      },
      path: '/socket.io'
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // You would typically fetch user from database here
        socket.userId = decoded.userId;
        socket.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role
        };

        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🔌 User ${socket.userId} connected to AI WebSocket`);

      // Track connected user
      this.addUserSocket(socket.userId!, socket.id);

      // Handle AI request submission with streaming
      socket.on('ai:submit-request', async (data, callback) => {
        try {
          const { serviceId, input, parameters, priority } = data;
          
          // Submit request
          const result = await aiService.submitRequest({
            userId: socket.userId!,
            serviceId,
            input,
            parameters,
            priority
          });

          if (!result.success) {
            callback({ success: false, error: result.error });
            return;
          }

          // Acknowledge submission
          callback({ 
            success: true, 
            requestId: result.requestId,
            status: 'submitted'
          });

          // Start monitoring request progress
          this.monitorRequestProgress(socket, result.requestId!);

        } catch (error) {
          console.error('Error handling AI request submission:', error);
          callback({ 
            success: false, 
            error: 'Failed to submit request' 
          });
        }
      });

      // Handle request status subscription
      socket.on('ai:subscribe-request', async (requestId: string, callback) => {
        try {
          // Verify request belongs to user
          const status = await aiService.getRequestStatus(requestId);
          
          if (status.error) {
            callback({ success: false, error: status.error });
            return;
          }

          if (status.request?.userId !== socket.userId) {
            callback({ success: false, error: 'Unauthorized' });
            return;
          }

          // Join request-specific room
          socket.join(`request:${requestId}`);
          
          callback({ success: true });

          // Send current status
          socket.emit('ai:request-status', {
            requestId,
            status: status.request?.status,
            queueStatus: status.queueStatus
          });

          // Monitor progress if still processing
          if (status.request?.status === 'pending' || status.request?.status === 'processing') {
            this.monitorRequestProgress(socket, requestId);
          }

        } catch (error) {
          console.error('Error subscribing to request:', error);
          callback({ success: false, error: 'Failed to subscribe' });
        }
      });

      // Handle request cancellation
      socket.on('ai:cancel-request', async (requestId: string, callback) => {
        try {
          const result = await aiService.cancelRequest(requestId, socket.userId!);
          
          callback(result);

          if (result.success) {
            // Notify all subscribers
            this.io.to(`request:${requestId}`).emit('ai:request-cancelled', {
              requestId,
              message: 'Request cancelled by user'
            });
          }

        } catch (error) {
          console.error('Error cancelling request:', error);
          callback({ success: false, error: 'Failed to cancel request' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 User ${socket.userId} disconnected from AI WebSocket`);
        this.removeUserSocket(socket.userId!, socket.id);
      });
    });
  }

  /**
   * Monitor request progress and emit updates
   */
  private async monitorRequestProgress(socket: AuthenticatedSocket, requestId: string): Promise<void> {
    const maxAttempts = 300; // 5 minutes with 1-second intervals
    let attempts = 0;

    const checkProgress = async () => {
      try {
        attempts++;
        
        const status = await aiService.getRequestStatus(requestId);
        
        if (status.error) {
          socket.emit('ai:request-error', {
            requestId,
            error: status.error
          });
          return;
        }

        // Emit status update
        socket.emit('ai:request-status', {
          requestId,
          status: status.request?.status,
          queueStatus: status.queueStatus,
          progress: status.queueStatus?.progress
        });

        // Check if completed or failed
        if (status.request?.status === 'completed') {
          // Get the full request with results
          const fullRequest: any = await aiRequestService.getRequest(requestId);
          
          socket.emit('ai:request-completed', {
            requestId,
            result: fullRequest?.outputData,
            metadata: fullRequest?.metadata,
            processingTime: fullRequest?.processingTime,
            tokensUsed: fullRequest?.tokensUsed
          });
          
          return;
        }

        if (status.request?.status === 'failed') {
          socket.emit('ai:request-failed', {
            requestId,
            error: status.queueStatus?.error || 'Request failed'
          });
          
          return;
        }

        // Continue monitoring if still processing and within limits
        if (attempts < maxAttempts && 
            (status.request?.status === 'pending' || status.request?.status === 'processing')) {
          setTimeout(checkProgress, 1000);
        } else if (attempts >= maxAttempts) {
          socket.emit('ai:request-timeout', {
            requestId,
            message: 'Request monitoring timeout'
          });
        }

      } catch (error) {
        console.error('Error monitoring request progress:', error);
        socket.emit('ai:request-error', {
          requestId,
          error: 'Failed to monitor request progress'
        });
      }
    };

    // Start monitoring
    setTimeout(checkProgress, 1000);
  }

  /**
   * Broadcast message to all connected users
   */
  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  /**
   * Send message to specific user
   */
  public sendToUser(userId: string, event: string, data: any): void {
    const socketIds = this.connectedUsers.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  /**
   * Send message to request subscribers
   */
  public sendToRequestSubscribers(requestId: string, event: string, data: any): void {
    this.io.to(`request:${requestId}`).emit(event, data);
  }

  /**
   * Add user socket tracking
   */
  private addUserSocket(userId: string, socketId: string): void {
    const existing = this.connectedUsers.get(userId) || [];
    existing.push(socketId);
    this.connectedUsers.set(userId, existing);
  }

  /**
   * Remove user socket tracking
   */
  private removeUserSocket(userId: string, socketId: string): void {
    const existing = this.connectedUsers.get(userId) || [];
    const filtered = existing.filter(id => id !== socketId);
    
    if (filtered.length === 0) {
      this.connectedUsers.delete(userId);
    } else {
      this.connectedUsers.set(userId, filtered);
    }
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get total connections count
   */
  public getTotalConnectionsCount(): number {
    return Array.from(this.connectedUsers.values()).reduce((total, sockets) => total + sockets.length, 0);
  }
}

// Export singleton instance (will be initialized in server setup)
export let aiWebSocketService: AIWebSocketService;

export function initializeAIWebSocket(server: HTTPServer): AIWebSocketService {
  aiWebSocketService = new AIWebSocketService(server);
  return aiWebSocketService;
}