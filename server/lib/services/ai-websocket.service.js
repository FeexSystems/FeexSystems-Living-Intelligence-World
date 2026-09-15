 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { Server as SocketIOServer, } from 'socket.io';

import jwt from 'jsonwebtoken';
import { aiService } from './ai.service';
import { aiRequestService } from './ai-request.service';










/**
 * AI WebSocket Service - Handles real-time AI response streaming
 */
export class AIWebSocketService {
  
   __init() {this.connectedUsers = new Map()} // userId -> socketIds

  constructor(server) {;AIWebSocketService.prototype.__init.call(this);
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
   setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || _optionalChain([socket, 'access', _ => _.handshake, 'access', _2 => _2.headers, 'access', _3 => _3.authorization, 'optionalAccess', _4 => _4.replace, 'call', _5 => _5('Bearer ', '')]);
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET) ;
        
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
   setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User ${socket.userId} connected to AI WebSocket`);

      // Track connected user
      this.addUserSocket(socket.userId, socket.id);

      // Handle AI request submission with streaming
      socket.on('ai:submit-request', async (data, callback) => {
        try {
          const { serviceId, input, parameters, priority } = data;
          
          // Submit request
          const result = await aiService.submitRequest({
            userId: socket.userId,
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
          this.monitorRequestProgress(socket, result.requestId);

        } catch (error) {
          console.error('Error handling AI request submission:', error);
          callback({ 
            success: false, 
            error: 'Failed to submit request' 
          });
        }
      });

      // Handle request status subscription
      socket.on('ai:subscribe-request', async (requestId, callback) => {
        try {
          // Verify request belongs to user
          const status = await aiService.getRequestStatus(requestId);
          
          if (status.error) {
            callback({ success: false, error: status.error });
            return;
          }

          if (_optionalChain([status, 'access', _6 => _6.request, 'optionalAccess', _7 => _7.userId]) !== socket.userId) {
            callback({ success: false, error: 'Unauthorized' });
            return;
          }

          // Join request-specific room
          socket.join(`request:${requestId}`);
          
          callback({ success: true });

          // Send current status
          socket.emit('ai:request-status', {
            requestId,
            status: _optionalChain([status, 'access', _8 => _8.request, 'optionalAccess', _9 => _9.status]),
            queueStatus: status.queueStatus
          });

          // Monitor progress if still processing
          if (_optionalChain([status, 'access', _10 => _10.request, 'optionalAccess', _11 => _11.status]) === 'pending' || _optionalChain([status, 'access', _12 => _12.request, 'optionalAccess', _13 => _13.status]) === 'processing') {
            this.monitorRequestProgress(socket, requestId);
          }

        } catch (error) {
          console.error('Error subscribing to request:', error);
          callback({ success: false, error: 'Failed to subscribe' });
        }
      });

      // Handle request cancellation
      socket.on('ai:cancel-request', async (requestId, callback) => {
        try {
          const result = await aiService.cancelRequest(requestId, socket.userId);
          
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
        this.removeUserSocket(socket.userId, socket.id);
      });
    });
  }

  /**
   * Monitor request progress and emit updates
   */
   async monitorRequestProgress(socket, requestId) {
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
          status: _optionalChain([status, 'access', _14 => _14.request, 'optionalAccess', _15 => _15.status]),
          queueStatus: status.queueStatus,
          progress: _optionalChain([status, 'access', _16 => _16.queueStatus, 'optionalAccess', _17 => _17.progress])
        });

        // Check if completed or failed
        if (_optionalChain([status, 'access', _18 => _18.request, 'optionalAccess', _19 => _19.status]) === 'completed') {
          // Get the full request with results
          const fullRequest = await aiRequestService.getRequest(requestId);
          
          socket.emit('ai:request-completed', {
            requestId,
            result: _optionalChain([fullRequest, 'optionalAccess', _20 => _20.outputData]),
            metadata: _optionalChain([fullRequest, 'optionalAccess', _21 => _21.metadata]),
            processingTime: _optionalChain([fullRequest, 'optionalAccess', _22 => _22.processingTime]),
            tokensUsed: _optionalChain([fullRequest, 'optionalAccess', _23 => _23.tokensUsed])
          });
          
          return;
        }

        if (_optionalChain([status, 'access', _24 => _24.request, 'optionalAccess', _25 => _25.status]) === 'failed') {
          socket.emit('ai:request-failed', {
            requestId,
            error: _optionalChain([status, 'access', _26 => _26.queueStatus, 'optionalAccess', _27 => _27.error]) || 'Request failed'
          });
          
          return;
        }

        // Continue monitoring if still processing and within limits
        if (attempts < maxAttempts && 
            (_optionalChain([status, 'access', _28 => _28.request, 'optionalAccess', _29 => _29.status]) === 'pending' || _optionalChain([status, 'access', _30 => _30.request, 'optionalAccess', _31 => _31.status]) === 'processing')) {
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
   broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Send message to specific user
   */
   sendToUser(userId, event, data) {
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
   sendToRequestSubscribers(requestId, event, data) {
    this.io.to(`request:${requestId}`).emit(event, data);
  }

  /**
   * Add user socket tracking
   */
   addUserSocket(userId, socketId) {
    const existing = this.connectedUsers.get(userId) || [];
    existing.push(socketId);
    this.connectedUsers.set(userId, existing);
  }

  /**
   * Remove user socket tracking
   */
   removeUserSocket(userId, socketId) {
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
   getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get total connections count
   */
   getTotalConnectionsCount() {
    return Array.from(this.connectedUsers.values()).reduce((total, sockets) => total + sockets.length, 0);
  }
}

// Export singleton instance (will be initialized in server setup)
export let aiWebSocketService;