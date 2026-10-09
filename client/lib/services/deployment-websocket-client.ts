import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';
import { useNotificationStore } from '@/store/notifications';
import '@/shared/api';

export interface DeploymentLog {
  id: string;
  timestamp: Date | string;
  level: string;
  message: string;
  stage?: string;
}

class DeploymentWebSocketClient {
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
      path: '/socket.io/deployments',
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
      console.log('Deployment WebSocket connected');
      this.isConnecting = false;
    });

    this.socket.on('disconnect', () => {
      console.log('Deployment WebSocket disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Deployment WebSocket connection error:', err);
      this.isConnecting = false;
    });

    // We can dispatch custom window events or use a store
    this.socket.on('deployment:status', (data) => {
      window.dispatchEvent(new CustomEvent('deployment:status', { detail: data }));
    });

    this.socket.on('deployment:progress', (data) => {
      window.dispatchEvent(new CustomEvent('deployment:progress', { detail: data }));
    });

    this.socket.on('deployment:log', (data) => {
      window.dispatchEvent(new CustomEvent('deployment:log', { detail: data }));
    });

    this.socket.on('deployment:complete', (data) => {
      window.dispatchEvent(new CustomEvent('deployment:complete', { detail: data }));
      
      const isSuccess = data.status === 'success';
      useNotificationStore.getState().addRealTimeNotification({
        type: isSuccess ? 'success' : 'error',
        title: `Deployment ${isSuccess ? 'Completed' : 'Failed'}`,
        message: `Deployment ${data.deploymentId} has ${data.status}`,
        category: 'deployment',
        priority: isSuccess ? 'medium' : 'high',
        actionUrl: `/dashboard/devops?deployment=${data.deploymentId}`,
        actionLabel: 'View Deployment'
      });
    });
  }

  subscribeToDeployment(deploymentId: string) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:deployment', { deploymentId });
    }
  }

  unsubscribeFromDeployment(deploymentId: string) {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:deployment', { deploymentId });
    }
  }
  
  subscribeToRepository(repositoryId: string) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:repository', { repositoryId });
    }
  }
  
  unsubscribeFromRepository(repositoryId: string) {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:repository', { repositoryId });
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

export const deploymentWebSocketClient = new DeploymentWebSocketClient();

// Connect immediately if already logged in
if (useAuthStore.getState().isLoggedIn()) {
  deploymentWebSocketClient.connect();
}

useAuthStore.subscribe((state) => {
  if (state.isLoggedIn()) {
    deploymentWebSocketClient.connect();
  } else {
    deploymentWebSocketClient.disconnect();
  }
});
