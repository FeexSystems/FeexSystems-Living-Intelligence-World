 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { io, } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';

class TeamWebSocketClient {constructor() { TeamWebSocketClient.prototype.__init.call(this);TeamWebSocketClient.prototype.__init2.call(this); }
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
      path: '/socket.io/teams',
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

  subscribeToTeam(teamId) {
    if (_optionalChain([this, 'access', _3 => _3.socket, 'optionalAccess', _4 => _4.connected])) {
      this.socket.emit('subscribe:team', { teamId });
    } else if (this.socket) {
      this.socket.once('connect', () => {
        _optionalChain([this, 'access', _5 => _5.socket, 'optionalAccess', _6 => _6.emit, 'call', _7 => _7('subscribe:team', { teamId })]);
      });
    }
  }

  unsubscribeFromTeam(teamId) {
    if (_optionalChain([this, 'access', _8 => _8.socket, 'optionalAccess', _9 => _9.connected])) {
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
    return _optionalChain([this, 'access', _10 => _10.socket, 'optionalAccess', _11 => _11.connected]) || false;
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
