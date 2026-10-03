import { useEffect, useState, useCallback } from 'react';
import { deploymentWebSocketClient, DeploymentLog } from '@/lib/services/deployment-websocket-client';

export interface DeploymentWebSocketState {
  status?: string;
  progress?: number;
  stage?: string;
  message?: string;
  logs: DeploymentLog[];
  completed?: boolean;
}

export function useDeploymentWebSocket(deploymentId?: string) {
  const [state, setState] = useState<DeploymentWebSocketState>({ logs: [] });

  useEffect(() => {
    if (!deploymentId) return;

    // Connect if not already (safeguard)
    deploymentWebSocketClient.connect();
    
    // Subscribe
    deploymentWebSocketClient.subscribeToDeployment(deploymentId);

    const handleStatus = (e: CustomEvent) => {
      if (e.detail.deploymentId === deploymentId) {
        setState(prev => ({ ...prev, status: e.detail.status }));
      }
    };

    const handleProgress = (e: CustomEvent) => {
      if (e.detail.deploymentId === deploymentId) {
        setState(prev => ({
          ...prev,
          progress: e.detail.progress,
          stage: e.detail.stage,
          message: e.detail.message
        }));
      }
    };

    const handleLog = (e: CustomEvent) => {
      if (e.detail.deploymentId === deploymentId) {
        setState(prev => ({
          ...prev,
          logs: [...prev.logs, e.detail.log]
        }));
      }
    };

    const handleComplete = (e: CustomEvent) => {
      if (e.detail.deploymentId === deploymentId) {
        setState(prev => ({ ...prev, status: e.detail.status, completed: true }));
      }
    };

    window.addEventListener('deployment:status', handleStatus as EventListener);
    window.addEventListener('deployment:progress', handleProgress as EventListener);
    window.addEventListener('deployment:log', handleLog as EventListener);
    window.addEventListener('deployment:complete', handleComplete as EventListener);

    return () => {
      deploymentWebSocketClient.unsubscribeFromDeployment(deploymentId);
      window.removeEventListener('deployment:status', handleStatus as EventListener);
      window.removeEventListener('deployment:progress', handleProgress as EventListener);
      window.removeEventListener('deployment:log', handleLog as EventListener);
      window.removeEventListener('deployment:complete', handleComplete as EventListener);
    };
  }, [deploymentId]);

  return state;
}
