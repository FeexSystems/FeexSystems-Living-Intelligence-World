import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, CreditCard, Activity, Shield, Bot, Code, CheckCircle, BarChart3, Settings, Eye } from "lucide-react";

interface SystemMetrics {
  totalUsers: number;
  totalTeams: number;
  totalSubscriptions: number;
  totalAIRequests: number;
  totalDeployments: number;
  totalSecurityScans: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
}

interface UserAnalytics {
  roleDistribution: Array<{ role: string; count: number }>;
  registrationTrends: Array<{ month: string; count: number }>;
  topUsers: {
    aiRequests: Array<{ user: string; count: number }>;
    deployments: Array<{ user: string; count: number }>;
    securityScans: Array<{ user: string; count: number }>;
  };
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [systemHealth, setSystemHealth] = useState<{ status: string; database: string; redis: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'last'>('current');

  useEffect(() => {
    fetchAdminMetrics();
  }, [selectedPeriod]);

  const fetchAdminMetrics = async () => {
    try {
      setLoading(true);

      const [metricsRes, usersRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/users?limit=1')
      ]);

      const metricsData = await metricsRes.json();
      const usersData = await usersRes.json();

      if (metricsData.success) {
        const { userMetrics, subscriptionMetrics, usageMetrics, securityMetrics } = metricsData.metrics;

        const mappedMetrics: SystemMetrics = {
          totalUsers: userMetrics.totalUsers || 0,
          totalTeams: 0, // Teams not explicitly in backend metrics yet
          totalSubscriptions: subscriptionMetrics.totalSubscriptions || 0,
          totalAIRequests: usageMetrics.aiRequests || 0,
          totalDeployments: usageMetrics.deployments || 0,
          totalSecurityScans: securityMetrics.totalScans || 0,
          activeSubscriptions: subscriptionMetrics.activeSubscriptions || 0,
          monthlyRevenue: subscriptionMetrics.revenue.monthly || 0,
          yearlyRevenue: subscriptionMetrics.revenue.yearly || 0,
          criticalVulnerabilities: securityMetrics.criticalVulnerabilities || 0,
          highVulnerabilities: securityMetrics.highVulnerabilities || 0
        };
        setMetrics(mappedMetrics);

        // Surface the live health probe when available; never substitute a static score.
        try {
          const healthRes = await fetch('/api/admin/system/health');
          if (healthRes.ok) {
            const healthData = await healthRes.json();
            if (healthData.success && healthData.systemHealth) {
              setSystemHealth({
                status: healthData.systemHealth.status,
                database: healthData.systemHealth.database,
                redis: healthData.systemHealth.redis
              });
            }
          }
        } catch {
          // Health probe is supplementary; metrics remain the primary source.
        }
      }

      if (usersData.success && usersData.analytics) {
        // Build analytics from users endpoint
        const analytics = usersData.analytics;

        // Convert roleDistribution object to array
        const roleDistArray = Object.entries(analytics.roleDistribution || {}).map(([role, count]) => ({
          role,
          count: count as number
        }));

        const mappedAnalytics: UserAnalytics = {
          roleDistribution: roleDistArray.length > 0 ? roleDistArray : [
            { role: 'USER', count: 0 },
            { role: 'ADMIN', count: 0 },
            { role: 'SUPER_ADMIN', count: 0 }
          ],
          registrationTrends: analytics.registrationTrends?.map((t: any) => ({
            month: new Date(t.date).toLocaleString('default', { month: 'short' }),
            count: t.count
          })) || [],
          topUsers: {
            // Only surface these leaderboards when the API actually returns them.
            // Fabricating rankings here would misrepresent canonical usage data.
            aiRequests: analytics.topUsers?.aiRequests ?? [],
            deployments: analytics.topUsers?.deployments ?? [],
            securityScans: analytics.topUsers?.securityScans ?? []
          }
        };
        setUserAnalytics(mappedAnalytics);
      }
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics || !userAnalytics) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading admin metrics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              System overview and administrative controls
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              <Activity className="w-3 h-3 mr-1" />
              System Status: Healthy
            </Badge>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              System Settings
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center space-x-2">
          <Button
            variant={selectedPeriod === 'current' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('current')}
          >
            Current Period
          </Button>
          <Button
            variant={selectedPeriod === 'last' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('last')}
          >
            Last Period
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                                Aggregated usage metrics are collected from the metrics endpoint
                              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeSubscriptions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                                Active / {metrics.totalSubscriptions.toLocaleString()} total subscriptions
                              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                                Trailing twelve months: ${metrics.yearlyRevenue.toLocaleString()}
                              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {systemHealth?.status === 'healthy' ? 'Healthy' : (systemHealth?.status ?? '\u2014')}
              </div>
              <p className="text-xs text-muted-foreground">
                {systemHealth
                  ? `Database: ${systemHealth.database}, cache: ${systemHealth.redis}`
                  : 'Live health probe not available on this endpoint'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Metrics */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="w-5 h-5 mr-2" />
                AI Service Usage
              </CardTitle>
              <CardDescription>
                AI requests and usage patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total AI Requests</span>
                <span className="text-2xl font-bold">{metrics.totalAIRequests.toLocaleString()}</span>
              </div>
              <div className="pt-2">
                <h4 className="text-sm font-medium mb-2">Period Usage</h4>
                <p className="text-sm text-muted-foreground italic">
                  No period-over-period baseline is currently recorded by the metrics API.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Code className="w-5 h-5 mr-2" />
                DevOps Activity
              </CardTitle>
              <CardDescription>
                Deployments and development activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Deployments</span>
                <span className="text-2xl font-bold">{metrics.totalDeployments.toLocaleString()}</span>
              </div>
              <div className="pt-2">
                <h4 className="text-sm font-medium mb-2">Period Usage</h4>
                <p className="text-sm text-muted-foreground italic">
                  No period-over-period baseline is currently recorded by the metrics API.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security and User Analytics */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Overview
              </CardTitle>
              <CardDescription>
                Security scans and vulnerability management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Security Scans</span>
                <span className="text-2xl font-bold">{metrics.totalSecurityScans.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {metrics.criticalVulnerabilities.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Critical</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {metrics.highVulnerabilities.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">High Risk</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.totalSecurityScans.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Scans</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                User Analytics
              </CardTitle>
              <CardDescription>
                User distribution and trends
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {userAnalytics.roleDistribution.map((role) => (
                  <div key={role.role} className="flex items-center justify-between">
                    <span className="text-sm">{role.role}</span>
                    <div className="flex items-center space-x-2">
                      <Progress
                        value={metrics.totalUsers > 0 ? (role.count / metrics.totalUsers) * 100 : 0} 
                        className="w-20 h-2" 
                      />
                      <span className="text-sm font-medium w-12 text-right">
                        {role.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <h4 className="text-sm font-medium mb-2">Registration Trends</h4>
                <div className="flex items-end space-x-1 h-16">
                  {userAnalytics.registrationTrends.map((trend, index) => (
                    <div key={index} className="flex-1 bg-primary/20 rounded-t">
                      <div 
                        className="bg-primary rounded-t transition-all duration-300"
                        style={{ height: `${(trend.count / 300) * 100}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  {userAnalytics.registrationTrends.map((trend, index) => (
                    <span key={index}>{trend.month}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <Button variant="outline" className="h-auto p-4 flex-col">
                <Users className="w-6 h-6 mb-2" />
                <span className="font-medium">User Management</span>
                <span className="text-xs text-muted-foreground">Manage users and roles</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col">
                <CreditCard className="w-6 h-6 mb-2" />
                <span className="font-medium">Billing Overview</span>
                <span className="text-xs text-muted-foreground">View subscription analytics</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col">
                <Activity className="w-6 h-6 mb-2" />
                <span className="font-medium">System Health</span>
                <span className="text-xs text-muted-foreground">Monitor system status</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col">
                <Eye className="w-6 h-6 mb-2" />
                <span className="font-medium">Audit Logs</span>
                <span className="text-xs text-muted-foreground">View activity logs</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 