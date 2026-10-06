 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { Server as SocketIOServer } from 'socket.io';

import jwt from 'jsonwebtoken';
import { securityScanQueueService } from './security-scan-queue.service';





















export class SecurityWebSocketService {
  
   __init() {this.connectedUsers = new Map()} // userId -> Set of socketIds

  constructor(server) {;SecurityWebSocketService.prototype.__init.call(this);
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/socket.io/security',
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
      
      console.log(`User ${userId} connected to security WebSocket`);

      // Track connected user
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId).add(socket.id);

      // Handle subscription to all user scans
      socket.on('subscribe:scans', () => {
        socket.join(`user:${userId}`);
        console.log(`User ${userId} subscribed to their security scans`);
      });

      socket.on('unsubscribe:scans', () => {
        socket.leave(`user:${userId}`);
        console.log(`User ${userId} unsubscribed from their security scans`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected from security WebSocket`);
        
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.connectedUsers.delete(userId);
          }
        }
      });
    });
  }

  /**
   * Setup event listeners for security scan queue service
   */
   setupEventListeners() {
    securityScanQueueService.on('scanCompleted', (data) => {
      const { scanId, userId, results } = data;
      this.io.to(`user:${userId}`).emit('scan:completed', {
        scanId,
        results,
      });
      // also emit status update
      this.io.to(`user:${userId}`).emit('scan:status', {
        scanId,
        status: 'COMPLETED',
        timestamp: new Date(),
      });
    });

    securityScanQueueService.on('scanFailed', (data) => {
      const { scanId, userId, error } = data;
      this.io.to(`user:${userId}`).emit('scan:failed', {
        scanId,
        error,
      });
      // also emit status update
      this.io.to(`user:${userId}`).emit('scan:status', {
        scanId,
        status: 'FAILED',
        timestamp: new Date(),
      });
    });

    securityScanQueueService.on('scanProgress', (data) => {
      const { scanId, userId, progress } = data;
      this.io.to(`user:${userId}`).emit('scan:progress', {
        scanId,
        progress,
      });
      // emit running status to handle transitions
      this.io.to(`user:${userId}`).emit('scan:status', {
        scanId,
        status: 'RUNNING',
        timestamp: new Date(),
      });
    });
  }
}

export let securityWebSocketService;

export function initializeSecurityWebSocket(server) {
  securityWebSocketService = new SecurityWebSocketService(server);
}
