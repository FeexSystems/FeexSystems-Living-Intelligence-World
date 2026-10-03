import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { teamWebSocketClient } from '@/lib/services/team-websocket-client';

export interface TeamPresence {
  userId: string;
  teamId: string;
}

export function useTeamWebSocket(teamId?: string) {
  const queryClient = useQueryClient();
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!teamId) return;

    teamWebSocketClient.connect();
    teamWebSocketClient.subscribeToTeam(teamId);

    const handleActivity = (event: Event) => {
      const customEvent = event as CustomEvent;
      const activity = customEvent.detail;
      
      if (activity.teamId === teamId) {
        // Update the team-activity query cache directly
        queryClient.setQueryData(
          ['team-activity', teamId],
          (oldData: any) => {
            if (!oldData || !oldData.pages) {
              // If using infinite query, structure is { pages: [...], pageParams: [...] }
              // If regular query, structure is { activities: [...], total: ... }
              
              if (oldData?.activities) {
                return {
                  ...oldData,
                  activities: [activity, ...oldData.activities].slice(0, 50),
                  total: oldData.total + 1
                };
              }
              return oldData;
            }

            // Infinite query update
            const newPages = [...oldData.pages];
            if (newPages.length > 0) {
              newPages[0] = {
                ...newPages[0],
                activities: [activity, ...newPages[0].activities]
              };
            }
            return {
              ...oldData,
              pages: newPages
            };
          }
        );
      }
    };

    const handlePresenceJoined = (event: Event) => {
      const customEvent = event as CustomEvent<TeamPresence>;
      if (customEvent.detail.teamId === teamId) {
        setActiveUsers(prev => {
          const next = new Set(prev);
          next.add(customEvent.detail.userId);
          return next;
        });
      }
    };

    const handlePresenceLeft = (event: Event) => {
      const customEvent = event as CustomEvent<TeamPresence>;
      if (customEvent.detail.teamId === teamId) {
        setActiveUsers(prev => {
          const next = new Set(prev);
          next.delete(customEvent.detail.userId);
          return next;
        });
      }
    };

    window.addEventListener('team:activity', handleActivity);
    window.addEventListener('team:presence:joined', handlePresenceJoined);
    window.addEventListener('team:presence:left', handlePresenceLeft);

    return () => {
      window.removeEventListener('team:activity', handleActivity);
      window.removeEventListener('team:presence:joined', handlePresenceJoined);
      window.removeEventListener('team:presence:left', handlePresenceLeft);
      teamWebSocketClient.unsubscribeFromTeam(teamId);
    };
  }, [teamId, queryClient]);

  return { activeUsers };
}
