import { Server as SocketIOServer } from 'socket.io';


export class WebSocketNotificationService {
  

  constructor(httpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
  }

   setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

   sendNotification(userId, notification) {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

   sendBroadcast(event, data) {
    this.io.emit(event, data);
  }
}

export let websocketNotificationService;