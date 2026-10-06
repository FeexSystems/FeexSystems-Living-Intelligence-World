 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { io, } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';
import { useNotificationStore } from '@/store/notifications';










class DeploymentWebSocketClient {constructor() { DeploymentWebSocketClient.prototype.__init.call(this);DeploymentWebSocketClient.prototype.__init2.call(this); }
   __init() {this.socket = null}
   __init2() {this.isConnecting = false}

  connect() {
    if (_optionalChain([this, 'access', _ => _.socket, 'optionalAccess', _2 => _2.connected]) || this.isConnecting) return;
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

   setupListeners() {
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

  subscribeToDeployment(deploymentId) {
    if (_optionalChain([this, 'access', _3 => _3.socket, 'optionalAccess', _4 => _4.connected])) {
      this.socket.emit('subscribe:deployment', { deploymentId });
    }
  }

  unsubscribeFromDeployment(deploymentId) {
    if (_optionalChain([this, 'access', _5 => _5.socket, 'optionalAccess', _6 => _6.connected])) {
      this.socket.emit('unsubscribe:deployment', { deploymentId });
    }
  }
  
  subscribeToRepository(repositoryId) {
    if (_optionalChain([this, 'access', _7 => _7.socket, 'optionalAccess', _8 => _8.connected])) {
      this.socket.emit('subscribe:repository', { repositoryId });
    }
  }
  
  unsubscribeFromRepository(repositoryId) {
    if (_optionalChain([this, 'access', _9 => _9.socket, 'optionalAccess', _10 => _10.connected])) {
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
    return _optionalChain([this, 'access', _11 => _11.socket, 'optionalAccess', _12 => _12.connected]) || false;
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
