import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { securityWebSocketClient } from '@/lib/services/security-websocket-client';
import { SecurityScan, ScanStatus } from '@/shared/api';

export function useSecurityWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Ensure we're connected
    if (!securityWebSocketClient.isConnected) {
      securityWebSocketClient.connect();
    }

    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { scanId, status, timestamp } = customEvent.detail;
      
      queryClient.setQueryData(['security-scans'], (old: any) => {
        if (!old || !old.scans) return old;
        
        return {
          ...old,
          scans: old.scans.map((scan: SecurityScan) => 
            scan.id === scanId 
              ? { 
                  ...scan, 
                  status: status as ScanStatus,
                  ...(status === 'COMPLETED' || status === 'FAILED' ? { completedAt: timestamp } : {}),
                  ...(status === 'RUNNING' && !scan.startedAt ? { startedAt: timestamp } : {})
                } 
              : scan
          )
        };
      });
    };

    const handleProgress = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { scanId, progress } = customEvent.detail;
      
      queryClient.setQueryData(['security-scans'], (old: any) => {
        if (!old || !old.scans) return old;
        
        return {
          ...old,
          scans: old.scans.map((scan: SecurityScan) => 
            scan.id === scanId 
              ? { ...scan, progress, status: ScanStatus.RUNNING } 
              : scan
          )
        };
      });
    };

    const handleCompleted = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { scanId, results } = customEvent.detail;
      
      queryClient.setQueryData(['security-scans'], (old: any) => {
        if (!old || !old.scans) return old;
        
        return {
          ...old,
          scans: old.scans.map((scan: SecurityScan) => 
            scan.id === scanId 
              ? { 
                  ...scan, 
                  status: ScanStatus.COMPLETED,
                  results,
                  completedAt: new Date()
                } 
              : scan
          )
        };
      });
    };

    const handleFailed = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { scanId } = customEvent.detail;
      
      queryClient.setQueryData(['security-scans'], (old: any) => {
        if (!old || !old.scans) return old;
        
        return {
          ...old,
          scans: old.scans.map((scan: SecurityScan) => 
            scan.id === scanId 
              ? { 
                  ...scan, 
                  status: ScanStatus.FAILED,
                  completedAt: new Date(),
                  // We might inject an error message here if the UI supports it
                } 
              : scan
          )
        };
      });
    };

    const handleLog = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { scanId, log } = customEvent.detail;
      
      queryClient.setQueryData(['security-scans'], (old: any) => {
        if (!old || !old.scans) return old;
        
        return {
          ...old,
          scans: old.scans.map((scan: SecurityScan) => 
            scan.id === scanId 
              ? { 
                  ...scan, 
                  logs: [...(scan.logs || []), {
                    ...log,
                    timestamp: new Date(log.timestamp)
                  }]
                } 
              : scan
          )
        };
      });
    };

    window.addEventListener('scan:status', handleStatus);
    window.addEventListener('scan:progress', handleProgress);
    window.addEventListener('scan:completed', handleCompleted);
    window.addEventListener('scan:failed', handleFailed);
    window.addEventListener('scan:log', handleLog);

    return () => {
      window.removeEventListener('scan:status', handleStatus);
      window.removeEventListener('scan:progress', handleProgress);
      window.removeEventListener('scan:completed', handleCompleted);
      window.removeEventListener('scan:failed', handleFailed);
      window.removeEventListener('scan:log', handleLog);
    };
  }, [queryClient]);
}
