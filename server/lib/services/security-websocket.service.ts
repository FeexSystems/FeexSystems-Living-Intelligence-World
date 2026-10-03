import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { securityScanQueueService } from './security-scan-queue.service';

export interface SecurityWebSocketEvents {
  'scan:status': {
    scanId: string;
    status: string;
    timestamp: Date;
  };
  'scan:progress': {
    scanId: string;
    progress: number;
  };
  'scan:completed': {
    scanId: string;
    results: any;
  };
  'scan:failed': {
    scanId: string;
    error: string;
  };
}

export class SecurityWebSocketService {
  private io: SocketIOServer;
  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(server: HttpServer) {
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
      
      console.log(`User ${userId} connected to security WebSocket`);

      // Track connected user
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(socket.id);

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
  private setupEventListeners(): void {
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

export let securityWebSocketService: SecurityWebSocketService;

export function initializeSecurityWebSocket(server: HttpServer): void {
  securityWebSocketService = new SecurityWebSocketService(server);
}
