import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Github, GitlabIcon as Gitlab, MoreHorizontal, Search, Settings, Trash2, ExternalLink, GitBranch, Clock, Zap } from 'lucide-react';
import { GitProvider, Repository } from '@/shared/api';
import { useToast } from '@/hooks/use-toast';

// Mock data - in real app this would come from API
const mockRepositories: Repository[] = [
  {
    id: '1',
    userId: 'user1',
    provider: GitProvider.GITHUB,
    repoUrl: 'https://github.com/user/frontend-app',
    branch: 'main',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    pipelines: [
      { id: '1', name: 'CI/CD Pipeline', status: 'ACTIVE' } as any,
      { id: '2', name: 'Testing Pipeline', status: 'ACTIVE' } as any
    ],
    deployments: [
      { id: '1', status: 'SUCCESS', startedAt: new Date() } as any,
      { id: '2', status: 'SUCCESS', startedAt: new Date() } as any
    ]
  },
  {
    id: '2',
    userId: 'user1',
    provider: GitProvider.GITLAB,
    repoUrl: 'https://gitlab.com/user/api-service',
    branch: 'develop',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
    pipelines: [
      { id: '3', name: 'Build & Deploy', status: 'ACTIVE' } as any
    ],
    deployments: [
      { id: '3', status: 'RUNNING', startedAt: new Date() } as any
    ]
  },
  {
    id: '3',
    userId: 'user1',
    provider: GitProvider.GITHUB,
    repoUrl: 'https://github.com/user/mobile-app',
    branch: 'main',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-19'),
    pipelines: [],
    deployments: [
      { id: '4', status: 'FAILED', startedAt: new Date() } as any
    ]
  }
];

export function RepositoryList() {
  const [repositories] = useState<Repository[]>(mockRepositories);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<GitProvider | 'all'>('all');
  const { toast } = useToast();

  const filteredRepositories = repositories.filter(repo => {
    const matchesSearch = repo.repoUrl.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = selectedProvider === 'all' || repo.provider === selectedProvider;
    return matchesSearch && matchesProvider;
  });

  const getProviderIcon = (provider: GitProvider) => {
    switch (provider) {
      case GitProvider.GITHUB:
        return <Github className="h-4 w-4" />;
      case GitProvider.GITLAB:
        return <Gitlab className="h-4 w-4" />;
      case GitProvider.BITBUCKET:
        return <div className="h-4 w-4 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">BB</div>;
    }
  };

  const getRepoName = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  const getRepoOwner = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 2];
  };

  const getLastDeploymentStatus = (deployments: any[] = []) => {
    if (deployments.length === 0) return null;
    return deployments[0].status;
  };

  const handleDisconnectRepository = (_repoId: string) => {
    toast({
      title: "Repository Disconnected",
      description: "Repository has been disconnected from your account.",
    });
  };

  const handleConfigureWebhooks = (_repoId: string) => {
    toast({
      title: "Webhooks Configured",
      description: "Repository webhooks have been configured successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {selectedProvider === 'all' ? 'All Providers' : 
               selectedProvider === GitProvider.GITHUB ? 'GitHub' :
               selectedProvider === GitProvider.GITLAB ? 'GitLab' : 'Bitbucket'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSelectedProvider('all')}>
              All Providers
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedProvider(GitProvider.GITHUB)}>
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedProvider(GitProvider.GITLAB)}>
              <Gitlab className="h-4 w-4 mr-2" />
              GitLab
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedProvider(GitProvider.BITBUCKET)}>
              <div className="h-4 w-4 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold mr-2">BB</div>
              Bitbucket
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filteredRepositories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No repositories found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery ? 'No repositories match your search criteria.' : 'Connect your first repository to get started with DevOps automation.'}
            </p>
            {!searchQuery && (
              <Button>Connect Repository</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRepositories.map((repo) => (
            <Card key={repo.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getProviderIcon(repo.provider)}
                    <div>
                      <CardTitle className="text-lg">
                        {getRepoName(repo.repoUrl)}
                      </CardTitle>
                      <CardDescription>
                        {getRepoOwner(repo.repoUrl)}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => window.open(repo.repoUrl, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Repository
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleConfigureWebhooks(repo.id)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Webhooks
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDisconnectRepository(repo.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Disconnect
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    {repo.branch}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Updated {new Date(repo.updatedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="font-medium">{repo.pipelines?.length || 0}</span>
                      <span className="text-muted-foreground ml-1">pipelines</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{repo.deployments?.length || 0}</span>
                      <span className="text-muted-foreground ml-1">deployments</span>
                    </div>
                  </div>

                  {getLastDeploymentStatus(repo.deployments) && (
                    <Badge 
                      variant={
                        getLastDeploymentStatus(repo.deployments) === 'SUCCESS' ? 'default' :
                        getLastDeploymentStatus(repo.deployments) === 'RUNNING' ? 'secondary' : 'destructive'
                      }
                    >
                      {getLastDeploymentStatus(repo.deployments)}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Settings className="h-3 w-3 mr-1" />
                    Configure
                  </Button>
                  <Button size="sm" className="flex-1">
                    <Zap className="h-3 w-3 mr-1" />
                    Deploy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}