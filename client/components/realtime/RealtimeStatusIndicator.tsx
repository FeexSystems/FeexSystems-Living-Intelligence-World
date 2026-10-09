import 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock, 
  AlertTriangle,
  Wifi,
  WifiOff,
  Pause
} from 'lucide-react';
import { useRealtimeStatus } from '@/hooks/use-realtime-status';
import { webSocketService } from '@/lib/services/websocket';

interface RealtimeStatusIndicatorProps {
  resourceId?: string;
  resourceType?: 'deployment' | 'scan' | 'ai_request';
  showProgress?: boolean;
  showConnectionStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'icon' | 'button';
  onClick?: () => void;
  className?: string;
}

export function RealtimeStatusIndicator({
  resourceId,
  resourceType,
  showProgress = false,
  showConnectionStatus = true,
  size = 'md',
  variant = 'badge',
  onClick,
  className
}: RealtimeStatusIndicatorProps) {
  const { getStatus, isConnected } = useRealtimeStatus({
    resourceId,
    resourceType,
    autoSubscribe: !!resourceId
  });

  const status = resourceId ? getStatus(resourceId) : undefined;

  const getStatusIcon = () => {
    if (!isConnected && showConnectionStatus) {
      return <WifiOff className={`${getIconSize()} text-gray-400`} />;
    }

    if (!status) {
      return <Clock className={`${getIconSize()} text-muted-foreground`} />;
    }
    
    switch (status.status) {
      case 'completed':
        return <CheckCircle className={`${getIconSize()} text-white`} />;
      case 'failed':
        return <XCircle className={`${getIconSize()} text-white/40`} />;
      case 'cancelled':
        return <Pause className={`${getIconSize()} text-white/50`} />;
      case 'running':
        return <Loader2 className={`${getIconSize()} text-white animate-spin`} />;
      case 'pending':
        return <Clock className={`${getIconSize()} text-white/50`} />;
      default:
        return <AlertTriangle className={`${getIconSize()} text-muted-foreground`} />;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-6 w-6';
      default:
        return 'h-4 w-4';
    }
  };

  const getStatusText = () => {
    if (!isConnected && showConnectionStatus) {
      return 'Offline';
    }

    if (!status) {
      return 'Unknown';
    }

    let text = status.status.charAt(0).toUpperCase() + status.status.slice(1);
    
    if (showProgress && typeof status.progress === 'number') {
      text += ` (${Math.round(status.progress)}%)`;
    }
    
    return text;
  };

  const getBadgeVariant = () => {
    if (!isConnected && showConnectionStatus) {
      return 'outline';
    }

    if (!status) {
      return 'outline';
    }
    
    switch (status.status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      case 'running':
        return 'default';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getTooltipContent = () => {
    if (!isConnected && showConnectionStatus) {
      return 'Real-time updates unavailable (offline)';
    }

    if (!status) {
      return 'No status information available';
    }

    let content = `Status: ${status.status}`;
    
    if (status.message) {
      content += `\nMessage: ${status.message}`;
    }
    
    if (status.stage) {
      content += `\nStage: ${status.stage}`;
    }
    
    if (typeof status.progress === 'number') {
      content += `\nProgress: ${Math.round(status.progress)}%`;
    }
    
    if (status.estimatedTimeRemaining) {
      const minutes = Math.round(status.estimatedTimeRemaining / 60);
      content += `\nETA: ${minutes}m`;
    }
    
    return content;
  };

  const renderContent = () => {
    const icon = getStatusIcon();
    const text = getStatusText();

    switch (variant) {
      case 'icon':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`cursor-pointer ${className}`}
                  onClick={onClick}
                  aria-label="Realtime connection status"
                >
                  {icon}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <pre className="text-xs whitespace-pre-wrap">{getTooltipContent()}</pre>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );

      case 'button':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={size === 'md' ? 'default' : size}
                  className={`flex items-center space-x-2 ${className}`}
                  onClick={onClick}
                >
                  {icon}
                  <span className="text-sm">{text}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <pre className="text-xs whitespace-pre-wrap">{getTooltipContent()}</pre>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );

      default: // badge
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={getBadgeVariant()}
                  className={`flex items-center space-x-1 cursor-pointer ${className}`}
                  onClick={onClick}
                >
                  {icon}
                  <span>{text}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <pre className="text-xs whitespace-pre-wrap">{getTooltipContent()}</pre>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
    }
  };

  return renderContent();
}

// Connection status indicator for the header/navigation
export function ConnectionStatusIndicator({ className }: { className?: string }) {
  const isConnected = webSocketService.isConnected;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center space-x-1 ${className}`}>
            {isConnected ? (
              <Wifi className="h-4 w-4 text-white" />
            ) : (
              <WifiOff className="h-4 w-4 text-white/40" />
            )}
            <div 
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-white' : 'bg-white/40'
              }`}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Real-time updates: {isConnected ? 'Connected' : 'Disconnected'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}