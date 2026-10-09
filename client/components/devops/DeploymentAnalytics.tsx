import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Activity,
  Calendar,
  BarChart3,
  PieChart,
  Target
} from 'lucide-react';
import { DeploymentAnalytics as DeploymentAnalyticsType, Deployment, DeploymentStatus } from '@/shared/api';

// Mock analytics data
const mockAnalytics: DeploymentAnalyticsType = {
  totalDeployments: 156,
  successfulDeployments: 147,
  failedDeployments: 9,
  averageDeploymentTime: 285, // seconds
  successRate: 94.2,
  deploymentsThisWeek: 23,
  deploymentsThisMonth: 89,
  recentDeployments: [
    {
      id: '1',
      repositoryId: 'repo1',
      commit: 'feat: add user dashboard',
      status: DeploymentStatus.SUCCESS,
      startedAt: new Date('2024-01-20T10:30:00'),
      completedAt: new Date('2024-01-20T10:35:00'),
      duration: 300
    },
    {
      id: '2',
      repositoryId: 'repo2',
      commit: 'fix: authentication bug',
      status: DeploymentStatus.RUNNING,
      startedAt: new Date('2024-01-20T11:00:00'),
      duration: 180
    },
    {
      id: '3',
      repositoryId: 'repo3',
      commit: 'update: dependencies',
      status: DeploymentStatus.FAILED,
      startedAt: new Date('2024-01-20T09:15:00'),
      completedAt: new Date('2024-01-20T09:20:00'),
      duration: 300
    }
  ] as Deployment[],
  deploymentTrends: [
    { date: '2024-01-14', successful: 8, failed: 1, averageTime: 290 },
    { date: '2024-01-15', successful: 12, failed: 0, averageTime: 275 },
    { date: '2024-01-16', successful: 15, failed: 2, averageTime: 310 },
    { date: '2024-01-17', successful: 9, failed: 1, averageTime: 265 },
    { date: '2024-01-18', successful: 18, failed: 1, averageTime: 295 },
    { date: '2024-01-19', successful: 14, failed: 2, averageTime: 280 },
    { date: '2024-01-20', successful: 11, failed: 1, averageTime: 285 }
  ]
};

export function DeploymentAnalytics() {
  const [analytics] = useState<DeploymentAnalyticsType>(mockAnalytics);
  const [timeRange, setTimeRange] = useState('7d');

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRateVariant = (rate: number) => {
    if (rate >= 95) return 'default';
    if (rate >= 90) return 'secondary';
    return 'destructive';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getRepositoryStats = () => {
    const repoStats = analytics.recentDeployments.reduce((acc, deployment) => {
      const repoId = deployment.repositoryId;
      if (!acc[repoId]) {
        acc[repoId] = { total: 0, successful: 0, failed: 0 };
      }
      acc[repoId].total++;
      if (deployment.status === DeploymentStatus.SUCCESS) {
        acc[repoId].successful++;
      } else if (deployment.status === DeploymentStatus.FAILED) {
        acc[repoId].failed++;
      }
      return acc;
    }, {} as Record<string, { total: number; successful: number; failed: number }>);

    return Object.entries(repoStats).map(([repoId, stats]) => ({
      repoId,
      ...stats,
      successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0
    }));
  };

  const repositoryStats = getRepositoryStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Deployment Analytics</h2>
          <p className="text-muted-foreground">
            Track deployment performance and success rates
          </p>
        </div>
        
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deployments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalDeployments}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getTrendIcon(analytics.deploymentsThisWeek, 18)}
              <span>+{analytics.deploymentsThisWeek} this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSuccessRateColor(analytics.successRate)}`}>
              {analytics.successRate}%
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={analytics.successRate} className="flex-1 h-2" />
              <Badge variant={getSuccessRateVariant(analytics.successRate)} className="text-xs">
                {analytics.successfulDeployments}/{analytics.totalDeployments}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Deploy Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(analytics.averageDeploymentTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              -15s from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.deploymentsThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Deployment Trends
            </CardTitle>
            <CardDescription>
              Daily deployment activity over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.deploymentTrends.map((trend, _index) => (
                <div key={trend.date} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium w-16">
                      {new Date(trend.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-sm">{trend.successful}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-red-500" />
                        <span className="text-sm">{trend.failed}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDuration(trend.averageTime)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Repository Performance
            </CardTitle>
            <CardDescription>
              Success rates by repository
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {repositoryStats.map((repo) => (
                <div key={repo.repoId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Repository {repo.repoId}</div>
                    <Badge variant={getSuccessRateVariant(repo.successRate)}>
                      {repo.successRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={repo.successRate} className="flex-1 h-2" />
                    <div className="text-xs text-muted-foreground w-16">
                      {repo.successful}/{repo.total}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deployments</CardTitle>
          <CardDescription>
            Latest deployment activity across all repositories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.recentDeployments.slice(0, 5).map((deployment) => (
              <div key={deployment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {deployment.status === DeploymentStatus.SUCCESS && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {deployment.status === DeploymentStatus.FAILED && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  {deployment.status === DeploymentStatus.RUNNING && (
                    <Activity className="h-4 w-4 text-blue-500" />
                  )}
                  
                  <div>
                    <div className="font-medium">Repository {deployment.repositoryId}</div>
                    <div className="text-sm text-muted-foreground">
                      {deployment.commit}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Badge variant={
                    deployment.status === DeploymentStatus.SUCCESS ? 'default' :
                    deployment.status === DeploymentStatus.FAILED ? 'destructive' : 'secondary'
                  }>
                    {deployment.status}
                  </Badge>
                  
                  <div className="text-sm text-muted-foreground">
                    {deployment.duration ? formatDuration(deployment.duration) : 'In progress'}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {deployment.startedAt.toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}