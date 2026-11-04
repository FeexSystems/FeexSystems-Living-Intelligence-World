import { useEffect, useState, useCallback } from 'react';
import { webSocketService } from '@/lib/services/websocket';
import { useAuthStore } from '@/store/auth';





















export function useTeamActivity(options = {}) {
  const { teamId, limit = 50, autoSubscribe = true } = options;
  const [activities, setActivities] = useState([]);
  const [isConnected, setIsConnected] = useState(webSocketService.isConnected);
  const { user } = useAuthStore();

  const handleTeamActivity = useCallback((data) => {
    // Filter by team ID if specified
    if (teamId && data.teamId !== teamId) {
      return;
    }

    const activity = {
      id: data.id || crypto.randomUUID(),
      teamId: data.teamId,
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      message: data.message,
      timestamp: new Date(data.timestamp || Date.now()),
      metadata: data.metadata
    };

    setActivities(prev => {
      const newActivities = [activity, ...prev];
      // Keep only the most recent activities up to the limit
      return newActivities.slice(0, limit);
    });
  }, [teamId, limit]);

  useEffect(() => {
    if (!autoSubscribe || !user) return;

    // Listen for WebSocket connection status
    const checkConnection = () => {
      setIsConnected(webSocketService.isConnected);
    };

    // Set up WebSocket event listener for team activity
    webSocketService.on('team_activity', handleTeamActivity);
    
    // Check connection status periodically
    const connectionInterval = setInterval(checkConnection, 1000);
    
    // Subscribe to team activity updates
    if (teamId) {
      webSocketService.joinRoom(`team:${teamId}`);
    } else {
      // Subscribe to all teams the user is a member of
      webSocketService.emit('subscribe_user_teams');
    }

    return () => {
      webSocketService.off('team_activity', handleTeamActivity);
      clearInterval(connectionInterval);
      
      // Unsubscribe from team activity updates
      if (teamId) {
        webSocketService.leaveRoom(`team:${teamId}`);
      } else {
        webSocketService.emit('unsubscribe_user_teams');
      }
    };
  }, [autoSubscribe, teamId, user, handleTeamActivity]);

  const addActivity = useCallback((activity) => {
    const newActivity = {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    setActivities(prev => {
      const newActivities = [newActivity, ...prev];
      return newActivities.slice(0, limit);
    });
  }, [limit]);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  const getActivitiesByUser = useCallback((userId) => {
    return activities.filter(activity => activity.userId === userId);
  }, [activities]);

  const getActivitiesByResource = useCallback((resource) => {
    return activities.filter(activity => activity.resource === resource);
  }, [activities]);

  const subscribeToTeam = useCallback((teamId) => {
    webSocketService.joinRoom(`team:${teamId}`);
  }, []);

  const unsubscribeFromTeam = useCallback((teamId) => {
    webSocketService.leaveRoom(`team:${teamId}`);
  }, []);

  return {
    activities,
    isConnected,
    addActivity,
    clearActivities,
    getActivitiesByUser,
    getActivitiesByResource,
    subscribeToTeam,
    unsubscribeFromTeam
  };
}