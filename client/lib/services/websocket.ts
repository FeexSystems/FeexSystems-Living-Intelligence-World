import { io, Socket } from 'socket.io-client';
import { useNotificationStore } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';

export interface WebSocketMessage {
    type: 'notification' | 'status_update' | 'progress_update' | 'team_activity';
    data: any;
    timestamp: string;
}

export interface StatusUpdate {
    id: string;
    type: 'deployment' | 'scan' | 'ai_request';
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress?: number;
    message?: string;
    metadata?: Record<string, any>;
}

export interface ProgressUpdate {
    id: string;
    type: 'deployment' | 'scan' | 'ai_request';
    progress: number;
    stage?: string;
    message?: string;
    estimatedTimeRemaining?: number;
}

class WebSocketService {
    private socket: Socket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private isConnecting = false;

    connect(token?: string) {
        if (this.socket?.connected || this.isConnecting) {
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

    private setupEventListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('WebSocket connected');
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            useNotificationStore.getState().setConnectionStatus(true);

            // Join user-specific room
            const user = useAuthStore.getState().user;
            if (user) {
                this.socket?.emit('join_user_room', user.id);
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
        this.socket.on('status_update', (data: StatusUpdate) => {
            this.handleStatusUpdate(data);
        });

        // Progress update events
        this.socket.on('progress_update', (data: ProgressUpdate) => {
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
        this.socket.on('ai:request-status', (data) => {
            this.handleStatusUpdate({
                id: data.requestId,
                type: 'ai_request',
                status: data.status,
                progress: data.progress,
                metadata: data.queueStatus
            });
        });

        this.socket.on('ai:request-completed', (data) => {
            this.handleStatusUpdate({
                id: data.requestId,
                type: 'ai_request',
                status: 'completed',
                metadata: { result: data.result, ...data.metadata }
            });
            useNotificationStore.getState().addRealTimeNotification({
                type: 'success',
                title: `AI Request Completed`,
                message: `Your AI request has completed successfully`,
                category: 'ai',
                priority: 'medium',
                actionUrl: `/dashboard/ai?request=${data.requestId}`,
                actionLabel: 'View Results',
                metadata: data
            });
        });

        this.socket.on('ai:request-failed', (data) => {
            this.handleStatusUpdate({
                id: data.requestId,
                type: 'ai_request',
                status: 'failed',
                message: data.error
            });
            useNotificationStore.getState().addRealTimeNotification({
                type: 'error',
                title: `AI Request Failed`,
                message: data.error || `Your AI request failed`,
                category: 'ai',
                priority: 'high',
                actionUrl: `/dashboard/ai?request=${data.requestId}`,
                actionLabel: 'View Error',
                metadata: data
            });
        });

        this.socket.on('ai:request-token', (data) => {
            window.dispatchEvent(new CustomEvent('ai_request_token', { detail: data }));
        });
    }

    private handleStatusUpdate(data: StatusUpdate) {
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

    private handleProgressUpdate(data: ProgressUpdate) {
        // Emit custom events for components to listen to
        window.dispatchEvent(new CustomEvent('progress_update', { detail: data }));
    }

    private handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            if (!this.socket?.connected) {
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
    emit(event: string, data?: any) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn('WebSocket not connected, cannot emit event:', event);
        }
    }

    // Join specific rooms
    joinRoom(room: string) {
        this.emit('join_room', room);
    }

    leaveRoom(room: string) {
        this.emit('leave_room', room);
    }

    // Subscribe to specific events
    on(event: string, callback: (data: any) => void) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event: string, callback?: (data: any) => void) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    get isConnected() {
        return this.socket?.connected || false;
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