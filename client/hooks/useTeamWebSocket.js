 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { teamWebSocketClient } from '@/lib/services/team-websocket-client';






export function useTeamWebSocket(teamId) {
  const queryClient = useQueryClient();
  const [activeUsers, setActiveUsers] = useState(new Set());

  useEffect(() => {
    if (!teamId) return;

    teamWebSocketClient.connect();
    teamWebSocketClient.subscribeToTeam(teamId);

    const handleActivity = (event) => {
      const customEvent = event ;
      const activity = customEvent.detail;
      
      if (activity.teamId === teamId) {
        // Update the team-activity query cache directly
        queryClient.setQueryData(
          ['team-activity', teamId],
          (oldData) => {
            if (!oldData || !oldData.pages) {
              // If using infinite query, structure is { pages: [...], pageParams: [...] }
              // If regular query, structure is { activities: [...], total: ... }
              
              if (_optionalChain([oldData, 'optionalAccess', _ => _.activities])) {
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

    const handlePresenceJoined = (event) => {
      const customEvent = event ;
      if (customEvent.detail.teamId === teamId) {
        setActiveUsers(prev => {
          const next = new Set(prev);
          next.add(customEvent.detail.userId);
          return next;
        });
      }
    };

    const handlePresenceLeft = (event) => {
      const customEvent = event ;
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
