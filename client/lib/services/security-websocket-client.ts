import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';
import { useNotificationStore } from '@/store/notifications';

class SecurityWebSocketClient {
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
      path: '/socket.io/security',
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
      console.log('Security WebSocket connected');
      this.isConnecting = false;
      // Auto-subscribe to user's scans
      this.subscribeToScans();
    });

    this.socket.on('disconnect', () => {
      console.log('Security WebSocket disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Security WebSocket connection error:', err);
      this.isConnecting = false;
    });

    this.socket.on('scan:status', (data) => {
      window.dispatchEvent(new CustomEvent('scan:status', { detail: data }));
    });

    this.socket.on('scan:progress', (data) => {
      window.dispatchEvent(new CustomEvent('scan:progress', { detail: data }));
    });

    this.socket.on('scan:log', (data) => {
      window.dispatchEvent(new CustomEvent('scan:log', { detail: data }));
    });

    this.socket.on('scan:completed', (data) => {
      window.dispatchEvent(new CustomEvent('scan:completed', { detail: data }));
      
      useNotificationStore.getState().addRealTimeNotification({
        type: 'success',
        title: 'Security Scan Completed',
        message: `Security scan ${data.scanId} has completed successfully.`,
        category: 'security',
        priority: 'medium',
        actionUrl: '/dashboard/security',
        actionLabel: 'View Report'
      });
    });

    this.socket.on('scan:failed', (data) => {
      window.dispatchEvent(new CustomEvent('scan:failed', { detail: data }));
      
      useNotificationStore.getState().addRealTimeNotification({
        type: 'error',
        title: 'Security Scan Failed',
        message: `Security scan ${data.scanId} failed: ${data.error}`,
        category: 'security',
        priority: 'high',
        actionUrl: '/dashboard/security',
        actionLabel: 'View Details'
      });
    });
  }

  subscribeToScans() {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:scans');
    }
  }

  unsubscribeFromScans() {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:scans');
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

export const securityWebSocketClient = new SecurityWebSocketClient();

// Connect immediately if already logged in
if (useAuthStore.getState().isLoggedIn()) {
  securityWebSocketClient.connect();
}

useAuthStore.subscribe((state) => {
  if (state.isLoggedIn()) {
    securityWebSocketClient.connect();
  } else {
    securityWebSocketClient.disconnect();
  }
});
