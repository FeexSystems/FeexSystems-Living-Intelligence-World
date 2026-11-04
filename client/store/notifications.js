import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';























































const defaultPreferences = {
  inApp: true,
  email: true,
  push: true,
  categories: {
    system: true,
    security: true,
    deployment: true,
    ai: true,
    billing: true,
    team: true,
  },
  priorities: {
    low: true,
    medium: true,
    high: true,
    critical: true,
  },
};

export const useNotificationStore = create()(
  subscribeWithSelector((set, get) => ({
    notifications: [],
    unreadCount: 0,
    preferences: defaultPreferences,
    isConnected: false,

    addNotification: (notification) => {
      const newNotification = {
        ...notification,
        id: crypto.randomUUID(),
        timestamp: new Date(),
        read: false,
      };

      set((state) => ({
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }));

      // Show browser notification if enabled and permission granted
      if (get().preferences.push && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: newNotification.id,
        });
      }
    },

    markAsRead: (id) => {
      set((state) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === id ? { ...notification, read: true } : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    },

    markAllAsRead: () => {
      set((state) => ({
        notifications: state.notifications.map((notification) => ({
          ...notification,
          read: true,
        })),
        unreadCount: 0,
      }));
    },

    removeNotification: (id) => {
      set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        const wasUnread = notification && !notification.read;
        
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
    },

    clearAll: () => {
      set({
        notifications: [],
        unreadCount: 0,
      });
    },

    updatePreferences: (preferences) => {
      set((state) => ({
        preferences: { ...state.preferences, ...preferences },
      }));
    },

    setConnectionStatus: (connected) => {
      set({ isConnected: connected });
    },

    addRealTimeNotification: (notification) => {
      const { preferences } = get();
      
      // Check if notification should be shown based on preferences
      const shouldShow = preferences.inApp &&
                        preferences.categories[notification.category] &&
                        preferences.priorities[notification.priority];

      if (shouldShow) {
        get().addNotification(notification);
      }
    },

    updateNotificationStatus: (id, updates) => {
      set((state) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === id ? { ...notification, ...updates } : notification
        ),
      }));
    },
  }))
);

// Subscribe to notification changes for persistence
useNotificationStore.subscribe(
  (state) => state.preferences,
  (preferences) => {
    localStorage.setItem('notification-preferences', JSON.stringify(preferences));
  }
);

// Load preferences from localStorage on initialization
const savedPreferences = localStorage.getItem('notification-preferences');
if (savedPreferences) {
  try {
    const preferences = JSON.parse(savedPreferences);
    useNotificationStore.getState().updatePreferences(preferences);
  } catch (error) {
    console.error('Failed to load notification preferences:', error);
  }
}

// Request notification permission on first load
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}