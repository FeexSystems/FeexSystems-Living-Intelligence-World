import { useEffect } from 'react';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  Rocket,
  Shield,
  Bot,
  Users
} from 'lucide-react';
import { useNotificationStore } from '@/store/notifications';

export function RealtimeNotificationToast() {
  const { notifications } = useNotificationStore();

  useEffect(() => {
    // Listen for new notifications and show toasts for high priority ones
    const latestNotification = notifications[0];
    
    if (latestNotification && 
        (latestNotification.priority === 'high' || latestNotification.priority === 'critical') &&
        Date.now() - latestNotification.timestamp.getTime() < 5000) { // Only show for notifications from last 5 seconds
      
      const getIcon = () => {
        switch (latestNotification.type) {
          case 'success':
            return <CheckCircle className="h-4 w-4 text-green-500" />;
          case 'error':
            return <XCircle className="h-4 w-4 text-red-500" />;
          case 'warning':
            return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
          default:
            return <Info className="h-4 w-4 text-blue-500" />;
        }
      };

      const getCategoryIcon = () => {
        switch (latestNotification.category) {
          case 'deployment':
            return <Rocket className="h-3 w-3" />;
          case 'security':
            return <Shield className="h-3 w-3" />;
          case 'ai':
            return <Bot className="h-3 w-3" />;
          case 'team':
            return <Users className="h-3 w-3" />;
          default:
            return null;
        }
      };

      const toastContent = (
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-sm">{latestNotification.title}</span>
              {getCategoryIcon() && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  {getCategoryIcon()}
                  <span>{latestNotification.category}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{latestNotification.message}</p>
            {latestNotification.actionLabel && latestNotification.actionUrl && (
              <button
                onClick={() => window.location.href = latestNotification.actionUrl!}
                className="text-xs text-primary hover:underline mt-1"
              >
                {latestNotification.actionLabel}
              </button>
            )}
          </div>
        </div>
      );

      // Show toast based on notification type
      switch (latestNotification.type) {
        case 'success':
          toast.success(toastContent, {
            duration: 4000,
            position: 'top-right'
          });
          break;
        case 'error':
          toast.error(toastContent, {
            duration: 6000,
            position: 'top-right'
          });
          break;
        case 'warning':
          toast.warning(toastContent, {
            duration: 5000,
            position: 'top-right'
          });
          break;
        default:
          toast.info(toastContent, {
            duration: 4000,
            position: 'top-right'
          });
          break;
      }
    }
  }, [notifications]);

  return null; // This component doesn't render anything visible
}

// Hook to easily add real-time toast notifications
export function useRealtimeToast() {
  const { addRealTimeNotification } = useNotificationStore();

  const showDeploymentToast = (deployment: { id: string; status: string; repository: string }) => {
    const isSuccess = deployment.status === 'completed';
    const isFailed = deployment.status === 'failed';
    
    addRealTimeNotification({
      type: isSuccess ? 'success' : isFailed ? 'error' : 'info',
      title: `Deployment ${deployment.status}`,
      message: `${deployment.repository} deployment ${deployment.status}`,
      category: 'deployment',
      priority: isFailed ? 'high' : 'medium',
      actionUrl: `/dashboard/devops?deployment=${deployment.id}`,
      actionLabel: 'View Details'
    });
  };

  const showSecurityToast = (scan: { id: string; status: string; type: string; vulnerabilities?: number }) => {
    const isCompleted = scan.status === 'completed';
    const isFailed = scan.status === 'failed';
    const hasCriticalVulns = scan.vulnerabilities && scan.vulnerabilities > 0;
    
    addRealTimeNotification({
      type: isCompleted ? (hasCriticalVulns ? 'warning' : 'success') : isFailed ? 'error' : 'info',
      title: `Security scan ${scan.status}`,
      message: isCompleted 
        ? `${scan.type} scan found ${scan.vulnerabilities || 0} vulnerabilities`
        : `${scan.type} scan ${scan.status}`,
      category: 'security',
      priority: hasCriticalVulns ? 'critical' : isFailed ? 'high' : 'medium',
      actionUrl: `/dashboard/security?scan=${scan.id}`,
      actionLabel: 'View Results'
    });
  };

  const showAIToast = (request: { id: string; status: string; service: string }) => {
    const isCompleted = request.status === 'completed';
    const isFailed = request.status === 'failed';
    
    addRealTimeNotification({
      type: isCompleted ? 'success' : isFailed ? 'error' : 'info',
      title: `AI request ${request.status}`,
      message: `Your ${request.service} request has ${request.status}`,
      category: 'ai',
      priority: 'medium',
      actionUrl: `/dashboard/ai?request=${request.id}`,
      actionLabel: 'View Results'
    });
  };

  const showTeamToast = (activity: { action: string; resource: string; user: string }) => {
    addRealTimeNotification({
      type: 'info',
      title: 'Team Activity',
      message: `${activity.user} ${activity.action} ${activity.resource}`,
      category: 'team',
      priority: 'low'
    });
  };

  return {
    showDeploymentToast,
    showSecurityToast,
    showAIToast,
    showTeamToast
  };
}