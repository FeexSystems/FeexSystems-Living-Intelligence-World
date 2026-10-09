import 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock, 
  AlertTriangle,
  Play,
  Square,
  RotateCcw
} from 'lucide-react';
import { useRealtimeStatus, RealtimeStatus } from '@/hooks/use-realtime-status';
import { formatDistanceToNow } from 'date-fns';

interface RealtimeProgressProps {
  resourceId: string;
  resourceType: 'deployment' | 'scan' | 'ai_request';
  title?: string;
  description?: string;
  showActions?: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export function RealtimeProgress({
  resourceId,
  resourceType,
  title,
  description,
  showActions = false,
  onCancel,
  onRetry,
  onViewDetails,
  className
}: RealtimeProgressProps) {
  const { getStatus, isConnected } = useRealtimeStatus({
    resourceId,
    resourceType
  });

  const status = getStatus(resourceId);

  const getStatusIcon = (status?: RealtimeStatus) => {
    if (!status) return <Clock className="h-4 w-4 text-muted-foreground" />;
    
    switch (status.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-yellow-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status?: RealtimeStatus) => {
    if (!status) return 'outline';
    
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

  const getProgressColor = (status?: RealtimeStatus) => {
    if (!status) return '';
    
    switch (status.status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-yellow-500';
      case 'running':
        return 'bg-blue-500';
      default:
        return '';
    }
  };

  const formatEstimatedTime = (seconds?: number) => {
    if (!seconds) return null;
    
    if (seconds < 60) {
      return `${Math.round(seconds)}s remaining`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m remaining`;
    } else {
      return `${Math.round(seconds / 3600)}h remaining`;
    }
  };

  const getDefaultTitle = () => {
    switch (resourceType) {
      case 'deployment':
        return 'Deployment Progress';
      case 'scan':
        return 'Security Scan Progress';
      case 'ai_request':
        return 'AI Request Progress';
      default:
        return 'Progress';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(status)}
            <CardTitle className="text-base">
              {title || getDefaultTitle()}
            </CardTitle>
            <Badge variant={getStatusBadgeVariant(status)}>
              {status?.status || 'unknown'}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-1">
            {!isConnected && (
              <Badge variant="outline" className="text-xs">
                Offline
              </Badge>
            )}
            
            {showActions && (
              <div className="flex space-x-1">
                {status?.status === 'running' && onCancel && (
                  <Button variant="outline" size="sm" onClick={onCancel}>
                    <Square className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                )}
                
                {status?.status === 'failed' && onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}
                
                {onViewDetails && (
                  <Button variant="outline" size="sm" onClick={onViewDetails}>
                    <Play className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Progress Bar */}
        {status && typeof status.progress === 'number' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(status.progress)}%</span>
            </div>
            <Progress 
              value={status.progress} 
              className={`h-2 ${getProgressColor(status)}`}
            />
          </div>
        )}
        
        {/* Current Stage */}
        {status?.stage && (
          <div className="text-sm">
            <span className="font-medium">Current Stage: </span>
            <span className="text-muted-foreground">{status.stage}</span>
          </div>
        )}
        
        {/* Status Message */}
        {status?.message && (
          <div className="text-sm">
            <span className="font-medium">Status: </span>
            <span className="text-muted-foreground">{status.message}</span>
          </div>
        )}
        
        {/* Estimated Time Remaining */}
        {status?.estimatedTimeRemaining && (
          <div className="text-sm">
            <span className="font-medium">ETA: </span>
            <span className="text-muted-foreground">
              {formatEstimatedTime(status.estimatedTimeRemaining)}
            </span>
          </div>
        )}
        
        {/* Last Updated */}
        {status?.lastUpdated && (
          <div className="text-xs text-muted-foreground">
            Last updated {formatDistanceToNow(status.lastUpdated, { addSuffix: true })}
          </div>
        )}
        
        {/* Connection Status */}
        {!isConnected && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3 w-3" />
            <span>Real-time updates unavailable (offline)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}