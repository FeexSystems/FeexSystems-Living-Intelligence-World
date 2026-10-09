import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, MoreHorizontal, Search, Play, Pause, Edit, Trash2, Plus, GitBranch, Clock, Zap, Activity } from 'lucide-react';
import { Pipeline, PipelineStatus } from '@/shared/api';
import { useToast } from '@/hooks/use-toast';
import { PipelineEditor } from './PipelineEditor';

// Mock data - in real app this would come from API
const mockPipelines: Pipeline[] = [
  {
    id: '1',
    repositoryId: 'repo1',
    name: 'Frontend CI/CD',
    stages: [
      {
        id: 'build',
        name: 'Build',
        commands: ['npm install', 'npm run build'],
        environment: { NODE_ENV: 'production' },
        dependsOn: [],
        timeout: 300
      },
      {
        id: 'test',
        name: 'Test',
        commands: ['npm run test', 'npm run lint'],
        environment: {},
        dependsOn: ['build'],
        timeout: 180
      },
      {
        id: 'deploy',
        name: 'Deploy',
        commands: ['npm run deploy'],
        environment: { DEPLOY_ENV: 'production' },
        dependsOn: ['test'],
        timeout: 600
      }
    ],
    triggers: [
      {
        type: 'push',
        branches: ['main', 'develop']
      },
      {
        type: 'pull_request',
        branches: ['main']
      }
    ],
    environment: {
      NODE_VERSION: '18',
      DEPLOY_KEY: 'encrypted_key'
    },
    status: PipelineStatus.ACTIVE,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    repository: {
      id: 'repo1',
      repoUrl: 'https://github.com/user/frontend-app',
      provider: 'GITHUB' as any
    } as any
  },
  {
    id: '2',
    repositoryId: 'repo2',
    name: 'API Testing Pipeline',
    stages: [
      {
        id: 'test',
        name: 'Run Tests',
        commands: ['go test ./...', 'go vet ./...'],
        environment: { GO_VERSION: '1.21' },
        dependsOn: [],
        timeout: 240
      }
    ],
    triggers: [
      {
        type: 'push',
        branches: ['main']
      }
    ],
    environment: {
      GO_VERSION: '1.21'
    },
    status: PipelineStatus.PAUSED,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
    repository: {
      id: 'repo2',
      repoUrl: 'https://gitlab.com/user/api-service',
      provider: 'GITLAB' as any
    } as any
  }
];

export function PipelineList() {
  const [pipelines] = useState<Pipeline[]>(mockPipelines);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PipelineStatus | 'all'>('all');
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const filteredPipelines = pipelines.filter(pipeline => {
    const matchesSearch = pipeline.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pipeline.repository?.repoUrl.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || pipeline.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getRepoName = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  const handleTogglePipeline = (_pipelineId: string, currentStatus: PipelineStatus) => {
    const newStatus = currentStatus === PipelineStatus.ACTIVE ? PipelineStatus.PAUSED : PipelineStatus.ACTIVE;
    toast({
      title: `Pipeline ${newStatus === PipelineStatus.ACTIVE ? 'Activated' : 'Paused'}`,
      description: `Pipeline has been ${newStatus === PipelineStatus.ACTIVE ? 'activated' : 'paused'} successfully.`,
    });
  };

  const handleRunPipeline = (_pipelineId: string) => {
    toast({
      title: "Pipeline Started",
      description: "Pipeline execution has been triggered successfully.",
    });
  };

  const handleDeletePipeline = (_pipelineId: string) => {
    toast({
      title: "Pipeline Deleted",
      description: "Pipeline has been deleted successfully.",
      variant: "destructive",
    });
  };

  const getStatusColor = (status: PipelineStatus) => {
    switch (status) {
      case PipelineStatus.ACTIVE:
        return 'default';
      case PipelineStatus.PAUSED:
        return 'secondary';
      case PipelineStatus.DISABLED:
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getTriggerText = (triggers: any[]) => {
    if (triggers.length === 0) return 'Manual only';
    
    const pushTriggers = triggers.filter(t => t.type === 'push');
    const prTriggers = triggers.filter(t => t.type === 'pull_request');
    
    const parts = [];
    if (pushTriggers.length > 0) {
      const branches = pushTriggers.flatMap(t => t.branches || []);
      parts.push(`Push to ${branches.join(', ')}`);
    }
    if (prTriggers.length > 0) {
      parts.push('Pull requests');
    }
    
    return parts.join(', ') || 'Manual only';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pipelines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {selectedStatus === 'all' ? 'All Status' : 
               selectedStatus === PipelineStatus.ACTIVE ? 'Active' :
               selectedStatus === PipelineStatus.PAUSED ? 'Paused' : 'Disabled'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSelectedStatus('all')}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedStatus(PipelineStatus.ACTIVE)}>
              <Activity className="h-4 w-4 mr-2 text-green-500" />
              Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedStatus(PipelineStatus.PAUSED)}>
              <Pause className="h-4 w-4 mr-2 text-yellow-500" />
              Paused
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedStatus(PipelineStatus.DISABLED)}>
              <Settings className="h-4 w-4 mr-2 text-red-500" />
              Disabled
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Pipeline
        </Button>
      </div>

      {filteredPipelines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No pipelines found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery ? 'No pipelines match your search criteria.' : 'Create your first pipeline to automate your deployment process.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Pipeline
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPipelines.map((pipeline) => (
            <Card key={pipeline.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <CardTitle className="text-lg">{pipeline.name}</CardTitle>
                      <Badge variant={getStatusColor(pipeline.status)}>
                        {pipeline.status}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <GitBranch className="h-3 w-3" />
                      {getRepoName(pipeline.repository?.repoUrl || '')}
                    </CardDescription>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRunPipeline(pipeline.id)}>
                        <Play className="h-4 w-4 mr-2" />
                        Run Pipeline
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingPipeline(pipeline)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Pipeline
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleTogglePipeline(pipeline.id, pipeline.status)}
                      >
                        {pipeline.status === PipelineStatus.ACTIVE ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause Pipeline
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Activate Pipeline
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeletePipeline(pipeline.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Pipeline
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Stages:</span>
                    <div className="font-medium">{pipeline.stages.length} stages</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Triggers:</span>
                    <div className="font-medium">{getTriggerText(pipeline.triggers)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last updated:</span>
                    <div className="font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(pipeline.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {pipeline.stages.map((stage) => (
                    <Badge key={stage.id} variant="outline" className="text-xs">
                      {stage.name}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleRunPipeline(pipeline.id)}
                    disabled={pipeline.status === PipelineStatus.DISABLED}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Run Now
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setEditingPipeline(pipeline)}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Pipeline Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Pipeline</DialogTitle>
            <DialogDescription>
              Configure a new CI/CD pipeline for your repository.
            </DialogDescription>
          </DialogHeader>
          <PipelineEditor 
            onSave={() => {
              setCreateDialogOpen(false);
              toast({
                title: "Pipeline Created",
                description: "New pipeline has been created successfully.",
              });
            }}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Pipeline Dialog */}
      <Dialog open={!!editingPipeline} onOpenChange={(open) => !open && setEditingPipeline(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pipeline</DialogTitle>
            <DialogDescription>
              Modify the configuration of your CI/CD pipeline.
            </DialogDescription>
          </DialogHeader>
          {editingPipeline && (
            <PipelineEditor 
              pipeline={editingPipeline}
              onSave={() => {
                setEditingPipeline(null);
                toast({
                  title: "Pipeline Updated",
                  description: "Pipeline configuration has been updated successfully.",
                });
              }}
              onCancel={() => setEditingPipeline(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}