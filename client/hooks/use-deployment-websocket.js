import { useEffect, useState, } from 'react';
import { deploymentWebSocketClient, } from '@/lib/services/deployment-websocket-client';










export function useDeploymentWebSocket(deploymentId) {
  const [state, setState] = useState({ logs: [] });

  useEffect(() => {
    if (!deploymentId) return;

    // Connect if not already (safeguard)
    deploymentWebSocketClient.connect();
    
    // Subscribe
    deploymentWebSocketClient.subscribeToDeployment(deploymentId);

    const handleStatus = (e) => {
      if (e.detail.deploymentId === deploymentId) {
        setState(prev => ({ ...prev, status: e.detail.status }));
      }
    };

    const handleProgress = (e) => {
      if (e.detail.deploymentId === deploymentId) {
        setState(prev => ({
          ...prev,
          progress: e.detail.progress,
          stage: e.detail.stage,
          message: e.detail.message
        }));
      }
    };

    const handleLog = (e) => {
      if (e.detail.deploymentId === deploymentId) {
        setState(prev => ({
          ...prev,
          logs: [...prev.logs, e.detail.log]
        }));
      }
    };

    const handleComplete = (e) => {
      if (e.detail.deploymentId === deploymentId) {
        setState(prev => ({ ...prev, status: e.detail.status, completed: true }));
      }
    };

    window.addEventListener('deployment:status', handleStatus );
    window.addEventListener('deployment:progress', handleProgress );
    window.addEventListener('deployment:log', handleLog );
    window.addEventListener('deployment:complete', handleComplete );

    return () => {
      deploymentWebSocketClient.unsubscribeFromDeployment(deploymentId);
      window.removeEventListener('deployment:status', handleStatus );
      window.removeEventListener('deployment:progress', handleProgress );
      window.removeEventListener('deployment:log', handleLog );
      window.removeEventListener('deployment:complete', handleComplete );
    };
  }, [deploymentId]);

  return state;
}
