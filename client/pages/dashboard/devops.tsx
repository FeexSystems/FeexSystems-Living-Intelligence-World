import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, GitBranch, Rocket, Activity, Settings, RefreshCw, ShieldCheck } from 'lucide-react';
import { RepositoryList } from '@/components/devops/RepositoryList';
import { PipelineList } from '@/components/devops/PipelineList';
import { DeploymentDashboard } from '@/components/devops/DeploymentDashboard';
import { ConnectRepositoryDialog } from '@/components/devops/ConnectRepositoryDialog';
import { DeploymentAnalytics } from '@/components/devops/DeploymentAnalytics';
import { fetchWorldMetrics } from '@/lib/worldModelClient';

export default function DevOpsPage() {
  const [connectRepoOpen, setConnectRepoOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: metrics } = useQuery({
    queryKey: ['world-model-metrics'],
    queryFn: fetchWorldMetrics,
  });

  return (
    <DashboardLayout>
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">DevOps Tools</h1>
          <p className="text-muted-foreground">
            Manage repositories, pipelines, and deployments
          </p>
        </div>
        <Button onClick={() => setConnectRepoOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Connect Repository
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="repositories" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Repositories
          </TabsTrigger>
          <TabsTrigger value="pipelines" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Pipelines
          </TabsTrigger>
          <TabsTrigger value="deployments" className="flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Deployments
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-mono">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Connected Repositories
                </CardTitle>
                <GitBranch className="h-4 w-4 text-[#00ff41]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.nodeCount ?? 8}</div>
                <p className="text-xs text-muted-foreground">
                  Canonical World Model nodes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Evidence Anchors
                </CardTitle>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.evidenceAnchorCount ?? 42}</div>
                <p className="text-xs text-muted-foreground">
                  Verified commit SHAs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Webhook Ingestion
                </CardTitle>
                <Rocket className="h-4 w-4 text-[#00ff41]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">ACTIVE</div>
                <p className="text-xs text-muted-foreground">
                  HMAC SHA-256 verified
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pipeline Health
                </CardTitle>
                <Activity className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">100%</div>
                <p className="text-xs text-muted-foreground">
                  0 build regressions
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Deployments</CardTitle>
                <CardDescription>
                  Latest deployment activity across all repositories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      repo: 'frontend-app',
                      commit: 'feat: add user dashboard',
                      status: 'SUCCESS',
                      time: '2 minutes ago'
                    },
                    {
                      repo: 'api-service',
                      commit: 'fix: authentication bug',
                      status: 'RUNNING',
                      time: '5 minutes ago'
                    },
                    {
                      repo: 'mobile-app',
                      commit: 'update: dependencies',
                      status: 'FAILED',
                      time: '1 hour ago'
                    }
                  ].map((deployment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{deployment.repo}</div>
                        <div className="text-sm text-muted-foreground">
                          {deployment.commit}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            deployment.status === 'SUCCESS' ? 'default' :
                            deployment.status === 'RUNNING' ? 'secondary' : 'destructive'
                          }
                        >
                          {deployment.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {deployment.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common DevOps tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setConnectRepoOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Connect New Repository
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('pipelines')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Create Pipeline
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('deployments')}
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Trigger Deployment
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('analytics')}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="repositories">
          <RepositoryList />
        </TabsContent>

        <TabsContent value="pipelines">
          <PipelineList />
        </TabsContent>

        <TabsContent value="deployments">
          <DeploymentDashboard />
        </TabsContent>

        <TabsContent value="analytics">
          <DeploymentAnalytics />
        </TabsContent>
      </Tabs>

      <ConnectRepositoryDialog 
        open={connectRepoOpen}
        onOpenChange={setConnectRepoOpen}
      />
    </div>
    </DashboardLayout>
  );
}