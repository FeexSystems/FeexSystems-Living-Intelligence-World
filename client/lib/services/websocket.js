 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { io, } from 'socket.io-client';
import { useNotificationStore } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';

























class WebSocketService {constructor() { WebSocketService.prototype.__init.call(this);WebSocketService.prototype.__init2.call(this);WebSocketService.prototype.__init3.call(this);WebSocketService.prototype.__init4.call(this);WebSocketService.prototype.__init5.call(this); }
     __init() {this.socket = null}
     __init2() {this.reconnectAttempts = 0}
     __init3() {this.maxReconnectAttempts = 5}
     __init4() {this.reconnectDelay = 1000}
     __init5() {this.isConnecting = false}

    connect(token) {
        if (_optionalChain([this, 'access', _ => _.socket, 'optionalAccess', _2 => _2.connected]) || this.isConnecting) {
            return;
        }

        this.isConnecting = true;

        const socketUrl = import.meta.env.PROD
            ? window.location.origin
            : (window.location.origin || 'http://localhost:8080');

        this.socket = io(socketUrl, {
            auth: {
                token: token || useAuthStore.getState().token
            },
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true
        });

        this.setupEventListeners();
    }

     setupEventListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('WebSocket connected');
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            useNotificationStore.getState().setConnectionStatus(true);

            // Join user-specific room
            const user = useAuthStore.getState().user;
            if (user) {
                _optionalChain([this, 'access', _3 => _3.socket, 'optionalAccess', _4 => _4.emit, 'call', _5 => _5('join_user_room', user.id)]);
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('WebSocket disconnected:', reason);
            useNotificationStore.getState().setConnectionStatus(false);

            // Attempt to reconnect if not a manual disconnect
            if (reason !== 'io client disconnect') {
                this.handleReconnect();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            this.isConnecting = false;
            useNotificationStore.getState().setConnectionStatus(false);
            this.handleReconnect();
        });

        // Notification events
        this.socket.on('notification', (data) => {
            useNotificationStore.getState().addRealTimeNotification({
                type: data.type || 'info',
                title: data.title,
                message: data.message,
                category: data.category || 'system',
                priority: data.priority || 'medium',
                actionUrl: data.actionUrl,
                actionLabel: data.actionLabel,
                metadata: data.metadata
            });
        });

        // Status update events
        this.socket.on('status_update', (data) => {
            this.handleStatusUpdate(data);
        });

        // Progress update events
        this.socket.on('progress_update', (data) => {
            this.handleProgressUpdate(data);
        });

        // Team activity events
        this.socket.on('team_activity', (data) => {
            useNotificationStore.getState().addRealTimeNotification({
                type: 'info',
                title: 'Team Activity',
                message: data.message,
                category: 'team',
                priority: 'low',
                metadata: data
            });
        });

        // Security alerts
        this.socket.on('security_alert', (data) => {
            useNotificationStore.getState().addRealTimeNotification({
                type: 'error',
                title: 'Security Alert',
                message: data.message,
                category: 'security',
                priority: 'critical',
                actionUrl: data.actionUrl,
                actionLabel: 'View Details',
                metadata: data
            });
        });

        // Deployment events
        this.socket.on('deployment_status', (data) => {
            const notificationType = data.status === 'completed' ? 'success' :
                data.status === 'failed' ? 'error' : 'info';

            useNotificationStore.getState().addRealTimeNotification({
                type: notificationType,
                title: `Deployment ${data.status}`,
                message: `${data.repository} deployment ${data.status}`,
                category: 'deployment',
                priority: data.status === 'failed' ? 'high' : 'medium',
                actionUrl: `/dashboard/devops?deployment=${data.id}`,
                actionLabel: 'View Deployment',
                metadata: data
            });
        });

        // AI request events
        this.socket.on('ai_request_status', (data) => {
            const notificationType = data.status === 'completed' ? 'success' :
                data.status === 'failed' ? 'error' : 'info';

            useNotificationStore.getState().addRealTimeNotification({
                type: notificationType,
                title: `AI Request ${data.status}`,
                message: `Your ${data.service} request has ${data.status}`,
                category: 'ai',
                priority: 'medium',
                actionUrl: `/dashboard/ai?request=${data.id}`,
                actionLabel: 'View Results',
                metadata: data
            });
        });
    }

     handleStatusUpdate(data) {
        // Emit custom events for components to listen to
        window.dispatchEvent(new CustomEvent('status_update', { detail: data }));

        // Show notification for important status changes
        if (data.status === 'completed' || data.status === 'failed') {
            const notificationType = data.status === 'completed' ? 'success' : 'error';
            const priority = data.status === 'failed' ? 'high' : 'medium';

            useNotificationStore.getState().addRealTimeNotification({
                type: notificationType,
                title: `${data.type} ${data.status}`,
                message: data.message || `Your ${data.type} has ${data.status}`,
                category: data.type === 'deployment' ? 'deployment' :
                    data.type === 'scan' ? 'security' : 'ai',
                priority,
                metadata: data
            });
        }
    }

     handleProgressUpdate(data) {
        // Emit custom events for components to listen to
        window.dispatchEvent(new CustomEvent('progress_update', { detail: data }));
    }

     handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            if (!_optionalChain([this, 'access', _6 => _6.socket, 'optionalAccess', _7 => _7.connected])) {
                this.connect();
            }
        }, delay);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        useNotificationStore.getState().setConnectionStatus(false);
    }

    // Send message to server
    emit(event, data) {
        if (_optionalChain([this, 'access', _8 => _8.socket, 'optionalAccess', _9 => _9.connected])) {
            this.socket.emit(event, data);
        } else {
            console.warn('WebSocket not connected, cannot emit event:', event);
        }
    }

    // Join specific rooms
    joinRoom(room) {
        this.emit('join_room', room);
    }

    leaveRoom(room) {
        this.emit('leave_room', room);
    }

    // Subscribe to specific events
    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    get isConnected() {
        return _optionalChain([this, 'access', _10 => _10.socket, 'optionalAccess', _11 => _11.connected]) || false;
    }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// Auto-connect when user is authenticated
useAuthStore.subscribe((state) => {
    if (state.isLoggedIn()) {
        webSocketService.connect();
    } else {
        webSocketService.disconnect();
    }
});

// Connect immediately if already logged in
if (useAuthStore.getState().isLoggedIn()) {
    webSocketService.connect();
}