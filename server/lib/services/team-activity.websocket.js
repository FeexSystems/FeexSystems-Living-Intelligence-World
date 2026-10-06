 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { Server as SocketIOServer } from 'socket.io';

import jwt from 'jsonwebtoken';
import { teamActivityEmitter } from './team-activity-emitter.js';

export class TeamActivityWebSocketService {
  
   __init() {this.connectedUsers = new Map()} // userId -> Set of socketIds

  constructor(server) {;TeamActivityWebSocketService.prototype.__init.call(this);
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/socket.io/teams',
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
      
      console.log(`User ${userId} connected to team activity WebSocket`);

      // Track connected user
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId).add(socket.id);

      // Handle subscription to a team's activity feed
      socket.on('subscribe:team', ({ teamId }) => {
        socket.join(`team:${teamId}`);
        console.log(`User ${userId} subscribed to team ${teamId}`);
        // Notify others that a user joined (for presence)
        socket.to(`team:${teamId}`).emit('team:presence:joined', { userId, teamId });
      });

      socket.on('unsubscribe:team', ({ teamId }) => {
        socket.leave(`team:${teamId}`);
        console.log(`User ${userId} unsubscribed from team ${teamId}`);
        // Notify others that a user left (for presence)
        socket.to(`team:${teamId}`).emit('team:presence:left', { userId, teamId });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected from team activity WebSocket`);
        
        // Find which rooms the user was in to emit presence updates
        // Note: socket.rooms might only contain socket.id during disconnect in some socket.io versions,
        // but we can rely on standard room leaving mechanics if needed, or track it per user.
        
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
   * Setup event listeners for team activity events
   */
   setupEventListeners() {
    teamActivityEmitter.on('activityLogged', (log) => {
      const { teamId, userId, action, resource, resourceId, metadata, timestamp } = log;
      this.io.to(`team:${teamId}`).emit('team:activity', {
        id: log.id,
        teamId,
        userId,
        action,
        resource,
        resourceId,
        metadata,
        timestamp,
      });
    });
  }
}

export let teamActivityWebSocketService;

export function initializeTeamActivityWebSocket(server) {
  teamActivityWebSocketService = new TeamActivityWebSocketService(server);
}
