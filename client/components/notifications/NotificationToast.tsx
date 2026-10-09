import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle, 
  X,
  Shield,
  Rocket,
  Bot,
  CreditCard,
  Users,
  Bell
} from 'lucide-react';
import { useNotificationStore, Notification } from '@/store/notifications';
import { formatDistanceToNow } from 'date-fns';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
  autoHide?: boolean;
  duration?: number;
}

export function NotificationToast({ 
  notification, 
  onDismiss, 
  autoHide = true, 
  duration = 5000 
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!autoHide) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 100));
        if (newProgress <= 0) {
          setIsVisible(false);
          setTimeout(onDismiss, 300); // Allow fade out animation
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [autoHide, duration, onDismiss]);

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getCategoryIcon = () => {
    switch (notification.category) {
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'deployment':
        return <Rocket className="h-4 w-4" />;
      case 'ai':
        return <Bot className="h-4 w-4" />;
      case 'billing':
        return <CreditCard className="h-4 w-4" />;
      case 'team':
        return <Users className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = () => {
    switch (notification.priority) {
      case 'critical':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high':
        return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const handleClick = () => {
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`
        relative max-w-sm w-full bg-background border-l-4 rounded-lg shadow-lg p-4 mb-3
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getPriorityColor()}
        ${notification.actionUrl ? 'cursor-pointer hover:shadow-xl' : ''}
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Progress bar for auto-hide */}
      {autoHide && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-foreground">
              {notification.title}
            </h4>
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              {getCategoryIcon()}
              {notification.category}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge 
                variant={
                  notification.priority === 'critical' ? 'destructive' :
                  notification.priority === 'high' ? 'secondary' : 'outline'
                } 
                className="text-xs"
              >
                {notification.priority}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
              </span>
            </div>
            
            {notification.actionLabel && (
              <Button variant="link" size="sm" className="p-0 h-auto text-xs">
                {notification.actionLabel}
              </Button>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Toast container component
export function NotificationToastContainer() {
  const { notifications } = useNotificationStore();
  const [toastNotifications, setToastNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Show only recent notifications as toasts (last 5 minutes)
    const recentNotifications = notifications.filter(
      (notification) => 
        Date.now() - notification.timestamp.getTime() < 5 * 60 * 1000 &&
        !notification.read
    ).slice(0, 3); // Limit to 3 toasts at a time

    setToastNotifications(recentNotifications);
  }, [notifications]);

  const handleDismiss = (id: string) => {
    setToastNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toastNotifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={() => handleDismiss(notification.id)}
          autoHide={notification.priority !== 'critical'}
          duration={
            notification.priority === 'critical' ? 10000 :
            notification.priority === 'high' ? 7000 : 5000
          }
        />
      ))}
    </div>
  );
}