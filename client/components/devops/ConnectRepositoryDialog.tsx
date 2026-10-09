import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Github, GitlabIcon as Gitlab, Loader2, ExternalLink, Key } from 'lucide-react';
import { GitProvider } from '@/shared/api';
import { useToast } from '@/hooks/use-toast';

interface ConnectRepositoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectRepositoryDialog({ open, onOpenChange }: ConnectRepositoryDialogProps) {
  const [step, setStep] = useState<'provider' | 'oauth' | 'manual'>('provider');
  const [provider, setProvider] = useState<GitProvider | ''>('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [accessToken, setAccessToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleProviderSelect = (selectedProvider: GitProvider) => {
    setProvider(selectedProvider);
    setStep('oauth');
  };

  const handleOAuthConnect = async () => {
    setIsConnecting(true);
    try {
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would redirect to OAuth provider
      window.open(`https://github.com/login/oauth/authorize?client_id=your_client_id&scope=repo`, '_blank');
      
      toast({
        title: "OAuth Authorization",
        description: "Please complete the authorization in the new window.",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to initiate OAuth flow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualConnect = async () => {
    if (!repoUrl || !accessToken) {
      toast({
        title: "Missing Information",
        description: "Please provide both repository URL and access token.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Repository Connected",
        description: `Successfully connected to ${repoUrl}`,
      });
      
      // Reset form and close dialog
      setStep('provider');
      setProvider('');
      setRepoUrl('');
      setBranch('main');
      setAccessToken('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect repository. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const resetDialog = () => {
    setStep('provider');
    setProvider('');
    setRepoUrl('');
    setBranch('main');
    setAccessToken('');
  };

  const getProviderIcon = (provider: GitProvider) => {
    switch (provider) {
      case GitProvider.GITHUB:
        return <Github className="h-6 w-6" />;
      case GitProvider.GITLAB:
        return <Gitlab className="h-6 w-6" />;
      case GitProvider.BITBUCKET:
        return <div className="h-6 w-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">BB</div>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Connect Repository</DialogTitle>
          <DialogDescription>
            Connect your Git repository to enable CI/CD pipelines and automated deployments.
          </DialogDescription>
        </DialogHeader>

        {step === 'provider' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  provider: GitProvider.GITHUB,
                  name: 'GitHub',
                  description: 'Connect your GitHub repositories',
                  popular: true
                },
                {
                  provider: GitProvider.GITLAB,
                  name: 'GitLab',
                  description: 'Connect your GitLab repositories',
                  popular: false
                },
                {
                  provider: GitProvider.BITBUCKET,
                  name: 'Bitbucket',
                  description: 'Connect your Bitbucket repositories',
                  popular: false
                }
              ].map((item) => (
                <Card 
                  key={item.provider}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleProviderSelect(item.provider)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getProviderIcon(item.provider)}
                        <div>
                          <CardTitle className="text-base">{item.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {item.description}
                          </CardDescription>
                        </div>
                      </div>
                      {item.popular && (
                        <Badge variant="secondary">Popular</Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setStep('manual')}
              >
                <Key className="h-4 w-4 mr-2" />
                Connect with Access Token
              </Button>
            </div>
          </div>
        )}

        {step === 'oauth' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              {getProviderIcon(provider as GitProvider)}
              <div>
                <h3 className="font-medium">
                  {provider === GitProvider.GITHUB ? 'GitHub' : 
                   provider === GitProvider.GITLAB ? 'GitLab' : 'Bitbucket'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Authorize FeexSystems to access your repositories
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Permissions Required:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Read repository contents and metadata</li>
                  <li>• Create and manage webhooks</li>
                  <li>• Read commit status and pull requests</li>
                  <li>• Write deployment status</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleOAuthConnect}
                  disabled={isConnecting}
                  className="flex-1"
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Authorize with {provider === GitProvider.GITHUB ? 'GitHub' : 
                                  provider === GitProvider.GITLAB ? 'GitLab' : 'Bitbucket'}
                </Button>
                <Button variant="outline" onClick={() => setStep('manual')}>
                  Use Token Instead
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'manual' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider-select">Git Provider</Label>
              <Select value={provider} onValueChange={(value) => setProvider(value as GitProvider)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GitProvider.GITHUB}>
                    <div className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      GitHub
                    </div>
                  </SelectItem>
                  <SelectItem value={GitProvider.GITLAB}>
                    <div className="flex items-center gap-2">
                      <Gitlab className="h-4 w-4" />
                      GitLab
                    </div>
                  </SelectItem>
                  <SelectItem value={GitProvider.BITBUCKET}>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">BB</div>
                      Bitbucket
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repo-url">Repository URL</Label>
              <Input
                id="repo-url"
                placeholder="https://github.com/username/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">Default Branch</Label>
              <Input
                id="branch"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access-token">Access Token</Label>
              <Input
                id="access-token"
                type="password"
                placeholder="Enter your personal access token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your token needs repository access permissions. {' '}
                <button
                  type="button"
                  className="text-primary hover:underline ml-1"
                >
                  Learn how to create one
                </button>
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step !== 'provider' && (
            <Button variant="outline" onClick={() => setStep('provider')}>
              Back
            </Button>
          )}
          
          {step === 'manual' && (
            <Button 
              onClick={handleManualConnect}
              disabled={isConnecting || !repoUrl || !accessToken || !provider}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Connect Repository
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}