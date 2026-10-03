import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Rocket, 
  MoreHorizontal, 
  Search, 
  Play, 
  Square, 
  RotateCcw, 
  ExternalLink, 
  Clock, 
  GitCommit,
  User,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { Deployment, DeploymentStatus } from '@/shared/api';
import { useToast } from '@/hooks/use-toast';
import { RealtimeStatusIndicator } from '@/components/realtime/RealtimeStatusIndicator';
import { RealtimeProgress } from '@/components/realtime/RealtimeProgress';
import { useDeploymentWebSocket } from '@/hooks/use-deployment-websocket';

export function DeploymentDashboard() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<DeploymentStatus | 'all'>('all');
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const { toast } = useToast();

  const fetchDeployments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/devops/deployments');
      const data = await res.json();
      if (data.success && data.data) {
        // Convert string dates to Date objects
        const parsed = data.data.deployments.map((d: any) => ({
          ...d,
          startedAt: new Date(d.startedAt),
          completedAt: d.completedAt ? new Date(d.completedAt) : undefined,
        }));
        setDeployments(parsed);
      }
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  // Listen to global events for updates
  useEffect(() => {
    const handleStatus = (e: CustomEvent) => {
      setDeployments(prev => prev.map(d => {
        if (d.id === e.detail.deploymentId) {
          return { ...d, status: e.detail.status as DeploymentStatus };
        }
        return d;
      }));
    };
    
    const handleComplete = (e: CustomEvent) => {
      setDeployments(prev => prev.map(d => {
        if (d.id === e.detail.deploymentId) {
          return { ...d, status: e.detail.status as DeploymentStatus, completedAt: new Date(e.detail.timestamp || Date.now()) };
        }
        return d;
      }));
    };

    window.addEventListener('deployment:status', handleStatus as EventListener);
    window.addEventListener('deployment:complete', handleComplete as EventListener);
    
    return () => {
      window.removeEventListener('deployment:status', handleStatus as EventListener);
      window.removeEventListener('deployment:complete', handleComplete as EventListener);
    };
  }, []);

  // WebSocket hook for the currently selected deployment (for logs and progress)
  const activeWsState = useDeploymentWebSocket(selectedDeployment?.id);

  const filteredDeployments = deployments.filter(deployment => {
    const matchesSearch = deployment.commit.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         deployment.repository?.repoUrl.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || deployment.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getRepoName = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  const getCommitHash = (commit: string) => {
    const match = commit.match(/\(([a-f0-9]+)\)$/);
    return match ? match[1] : commit.slice(-7);
  };

  const getCommitMessage = (commit: string) => {
    return commit.replace(/\s*\([a-f0-9]+\)$/, '');
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: DeploymentStatus) => {
    switch (status) {
      case DeploymentStatus.SUCCESS:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case DeploymentStatus.FAILED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case DeploymentStatus.RUNNING:
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case DeploymentStatus.PENDING:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case DeploymentStatus.CANCELED:
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: DeploymentStatus) => {
    switch (status) {
      case DeploymentStatus.SUCCESS:
        return 'default';
      case DeploymentStatus.FAILED:
        return 'destructive';
      case DeploymentStatus.RUNNING:
        return 'secondary';
      case DeploymentStatus.PENDING:
        return 'outline';
      case DeploymentStatus.CANCELED:
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const handleRetryDeployment = (deploymentId: string) => {
    toast({
      title: "Deployment Retried",
      description: "Deployment has been queued for retry.",
    });
  };

  const handleCancelDeployment = (deploymentId: string) => {
    toast({
      title: "Deployment Canceled",
      description: "Deployment has been canceled successfully.",
    });
  };

  const getRunningProgress = (deployment: Deployment) => {
    if (deployment.status !== DeploymentStatus.RUNNING) return 0;
    
    // Mock progress calculation based on time elapsed
    const elapsed = Date.now() - deployment.startedAt.getTime();
    const estimatedTotal = 300000; // 5 minutes
    return Math.min((elapsed / estimatedTotal) * 100, 95);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deployments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as DeploymentStatus | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value={DeploymentStatus.SUCCESS}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Success
              </div>
            </SelectItem>
            <SelectItem value={DeploymentStatus.RUNNING}>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-blue-500" />
                Running
              </div>
            </SelectItem>
            <SelectItem value={DeploymentStatus.FAILED}>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Failed
              </div>
            </SelectItem>
            <SelectItem value={DeploymentStatus.PENDING}>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Pending
              </div>
            </SelectItem>
            <SelectItem value={DeploymentStatus.CANCELED}>
              <div className="flex items-center gap-2">
                <Square className="h-4 w-4 text-gray-500" />
                Canceled
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Button>
          <Rocket className="h-4 w-4 mr-2" />
          New Deployment
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
            <h3 className="text-lg font-medium mb-2">Loading deployments...</h3>
          </CardContent>
        </Card>
      ) : filteredDeployments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No deployments found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery ? 'No deployments match your search criteria.' : 'Trigger your first deployment to get started.'}
            </p>
            {!searchQuery && (
              <Button>
                <Rocket className="h-4 w-4 mr-2" />
                Trigger Deployment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDeployments.map((deployment) => (
            <Card key={deployment.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(deployment.status)}
                      <CardTitle className="text-lg">
                        {getRepoName(deployment.repository?.repoUrl || '')}
                      </CardTitle>
                      <RealtimeStatusIndicator
                        resourceId={deployment.id}
                        resourceType="deployment"
                        showProgress={deployment.status === DeploymentStatus.RUNNING}
                        onClick={() => setSelectedDeployment(deployment)}
                      />
                    </div>
                    
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <GitCommit className="h-3 w-3" />
                        <span className="font-mono text-xs bg-muted px-1 rounded">
                          {getCommitHash(deployment.commit)}
                        </span>
                        {getCommitMessage(deployment.commit)}
                      </div>
                    </CardDescription>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedDeployment(deployment)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Logs
                      </DropdownMenuItem>
                      {deployment.status === DeploymentStatus.FAILED && (
                        <DropdownMenuItem onClick={() => handleRetryDeployment(deployment.id)}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Retry Deployment
                        </DropdownMenuItem>
                      )}
                      {deployment.status === DeploymentStatus.RUNNING && (
                        <DropdownMenuItem 
                          onClick={() => handleCancelDeployment(deployment.id)}
                          className="text-destructive"
                        >
                          <Square className="h-4 w-4 mr-2" />
                          Cancel Deployment
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {deployment.status === DeploymentStatus.RUNNING && (
                  <RealtimeProgress
                    resourceId={deployment.id}
                    resourceType="deployment"
                    title="Deployment Progress"
                    showActions={true}
                    onCancel={() => handleCancelDeployment(deployment.id)}
                    onViewDetails={() => setSelectedDeployment(deployment)}
                    className="border-0 shadow-none p-0"
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Pipeline:</span>
                    <div className="font-medium">{deployment.pipeline?.name || 'Manual'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <div className="font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {deployment.duration ? formatDuration(deployment.duration) : 
                       deployment.status === DeploymentStatus.RUNNING ? 
                       formatDuration(Math.floor((Date.now() - deployment.startedAt.getTime()) / 1000)) : 
                       'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Triggered by:</span>
                    <div className="font-medium flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {deployment.triggeredBy?.split('@')[0] || 'System'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Started:</span>
                    <div className="font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {deployment.startedAt.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedDeployment(deployment)}
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    View Logs
                  </Button>
                  
                  {deployment.status === DeploymentStatus.FAILED && (
                    <Button 
                      size="sm"
                      onClick={() => handleRetryDeployment(deployment.id)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  )}
                  
                  {deployment.status === DeploymentStatus.RUNNING && (
                    <Button 
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelDeployment(deployment.id)}
                    >
                      <Square className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Deployment Logs Dialog */}
      <Dialog open={!!selectedDeployment} onOpenChange={(open) => !open && setSelectedDeployment(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Deployment Logs
            </DialogTitle>
            <DialogDescription>
              {selectedDeployment && (
                <>
                  {getRepoName(selectedDeployment.repository?.repoUrl || '')} - {getCommitMessage(selectedDeployment.commit)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDeployment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(activeWsState.status ? activeWsState.status as DeploymentStatus : selectedDeployment.status)}
                  <Badge variant={getStatusColor(activeWsState.status ? activeWsState.status as DeploymentStatus : selectedDeployment.status)}>
                    {activeWsState.status || selectedDeployment.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Started: {selectedDeployment.startedAt.toLocaleString()}
                </div>
              </div>

              <ScrollArea className="h-96 w-full border rounded-lg p-4 bg-black text-green-400 font-mono text-sm">
                <div className="space-y-1">
                  {/* Render initial logs if any, then live logs */}
                  {[...(selectedDeployment.logs || []), ...activeWsState.logs].map((log, index) => {
                    const timestamp = typeof log.timestamp === 'string' ? new Date(log.timestamp) : log.timestamp;
                    return (
                      <div key={log.id || index} className="flex gap-2">
                        <span className="text-gray-500 shrink-0">
                          {timestamp?.toLocaleTimeString() || ''}
                        </span>
                        <span className={`shrink-0 ${
                          log.level === 'error' ? 'text-red-400' :
                          log.level === 'warn' ? 'text-yellow-400' :
                          log.level === 'info' ? 'text-blue-400' : 'text-green-400'
                        }`}>
                          [{log.level.toUpperCase()}]
                        </span>
                        {log.stage && (
                          <span className="text-purple-400 shrink-0">
                            [{log.stage}]
                          </span>
                        )}
                        <span>{log.message}</span>
                      </div>
                    );
                  })}
                  
                  {(activeWsState.status || selectedDeployment.status) === DeploymentStatus.RUNNING && (
                    <div className="flex gap-2 animate-pulse">
                      <span className="text-gray-500 shrink-0">
                        {new Date().toLocaleTimeString()}
                      </span>
                      <span className="text-blue-400 shrink-0">[INFO]</span>
                      <span>Deployment in progress...</span>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}