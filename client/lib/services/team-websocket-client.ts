import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';

class TeamWebSocketClient {
  private socket: Socket | null = null;
  private isConnecting = false;

  connect() {
    if (this.socket?.connected || this.isConnecting) return;
    this.isConnecting = true;

    const token = useAuthStore.getState().token;
    if (!token) {
      this.isConnecting = false;
      return;
    }

    const socketUrl = import.meta.env.PROD
      ? window.location.origin
      : (window.location.origin || 'http://localhost:8080');

    this.socket = io(socketUrl, {
      path: '/socket.io/teams',
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Team WebSocket connected');
      this.isConnecting = false;
    });

    this.socket.on('disconnect', () => {
      console.log('Team WebSocket disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Team WebSocket connection error:', err);
      this.isConnecting = false;
    });

    this.socket.on('team:activity', (data) => {
      window.dispatchEvent(new CustomEvent('team:activity', { detail: data }));
    });

    this.socket.on('team:presence:joined', (data) => {
      window.dispatchEvent(new CustomEvent('team:presence:joined', { detail: data }));
    });

    this.socket.on('team:presence:left', (data) => {
      window.dispatchEvent(new CustomEvent('team:presence:left', { detail: data }));
    });
  }

  subscribeToTeam(teamId: string) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:team', { teamId });
    } else if (this.socket) {
      this.socket.once('connect', () => {
        this.socket?.emit('subscribe:team', { teamId });
      });
    }
  }

  unsubscribeFromTeam(teamId: string) {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:team', { teamId });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  get isConnected() {
    return this.socket?.connected || false;
  }
}

export const teamWebSocketClient = new TeamWebSocketClient();

// Connect immediately if already logged in
if (useAuthStore.getState().isLoggedIn()) {
  teamWebSocketClient.connect();
}

useAuthStore.subscribe((state) => {
  if (state.isLoggedIn()) {
    teamWebSocketClient.connect();
  } else {
    teamWebSocketClient.disconnect();
  }
});
