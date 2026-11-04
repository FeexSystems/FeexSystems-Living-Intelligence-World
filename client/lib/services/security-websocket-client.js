 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { io, } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';
import { useNotificationStore } from '@/store/notifications';

class SecurityWebSocketClient {constructor() { SecurityWebSocketClient.prototype.__init.call(this);SecurityWebSocketClient.prototype.__init2.call(this); }
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
      path: '/socket.io/security',
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
    if (_optionalChain([this, 'access', _3 => _3.socket, 'optionalAccess', _4 => _4.connected])) {
      this.socket.emit('subscribe:scans');
    }
  }

  unsubscribeFromScans() {
    if (_optionalChain([this, 'access', _5 => _5.socket, 'optionalAccess', _6 => _6.connected])) {
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
    return _optionalChain([this, 'access', _7 => _7.socket, 'optionalAccess', _8 => _8.connected]) || false;
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
