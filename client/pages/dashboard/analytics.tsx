import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  Bot,
  Shield,
  Code,
  Zap,
  Globe,
  Clock,
  Eye,
  Target,
  PieChart,
  LineChart
} from "lucide-react";

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("7d");

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  // Enhanced mock data
  const keyMetrics = [
    { label: 'Total Users', value: '1,234', change: '+12%', trend: 'up', icon: Users, color: 'text-white' },
    { label: 'AI Requests', value: '45,678', change: '+8%', trend: 'up', icon: Bot, color: 'text-white' },
    { label: 'Deployments', value: '892', change: '+15%', trend: 'up', icon: Code, color: 'text-[#00ff41]' },
    { label: 'Revenue', value: '$12,345', change: '+23%', trend: 'up', icon: DollarSign, color: 'text-[#00ff41]' }
  ];

  const usageByService = [
    { name: 'AI Chat & Code Review', usage: 35, requests: 15987, color: 'bg-purple-500' },
    { name: 'Security Scanning', usage: 25, requests: 11420, color: 'bg-zinc-900/800' },
    { name: 'DevOps Deployments', usage: 20, requests: 9136, color: 'bg-white/20' },
    { name: 'Analytics & Reporting', usage: 12, requests: 5481, color: 'bg-[#00ff41]/80' },
    { name: 'Team Collaboration', usage: 8, requests: 3654, color: 'bg-zinc-700' }
  ];

  const performanceMetrics = [
    { metric: 'API Response Time', value: '45ms', target: '<100ms', status: 'good' },
    { metric: 'Uptime', value: '99.98%', target: '99.9%', status: 'excellent' },
    { metric: 'Error Rate', value: '0.12%', target: '<1%', status: 'good' },
    { metric: 'Throughput', value: '1.2M req/day', target: '>500K', status: 'excellent' }
  ];

  const weeklyData = [
    { day: 'Mon', aiRequests: 6540, deployments: 12, security: 8, users: 145 },
    { day: 'Tue', aiRequests: 7820, deployments: 18, security: 12, users: 156 },
    { day: 'Wed', aiRequests: 9100, deployments: 22, security: 15, users: 178 },
    { day: 'Thu', aiRequests: 8450, deployments: 19, security: 11, users: 165 },
    { day: 'Fri', aiRequests: 9876, deployments: 25, security: 18, users: 189 },
    { day: 'Sat', aiRequests: 4230, deployments: 8, security: 5, users: 78 },
    { day: 'Sun', aiRequests: 3662, deployments: 5, security: 3, users: 56 }
  ];

  const topUsers = [
    { rank: 1, name: 'Engineering Team', requests: 12450, usage: '28%' },
    { rank: 2, name: 'DevOps Team', requests: 8920, usage: '20%' },
    { rank: 3, name: 'Security Team', requests: 6780, usage: '15%' },
    { rank: 4, name: 'Data Science', requests: 5430, usage: '12%' },
    { rank: 5, name: 'Product Team', requests: 4210, usage: '9%' }
  ];

  const recentInsights = [
    { title: 'AI usage increased 23% this week', description: 'Code review and chat features driving growth', type: 'positive' },
    { title: 'Peak usage hours: 9AM-11AM PST', description: 'Consider scaling resources during this window', type: 'info' },
    { title: 'Security scans detected 12 new issues', description: '8 critical vulnerabilities need attention', type: 'warning' },
    { title: 'Deployment success rate: 98.5%', description: 'Up from 96.2% last month', type: 'positive' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-[#00ff41] bg-green-100 dark:bg-green-900/30';
      case 'good': return 'text-white bg-white/5 dark:bg-white/5';
      case 'warning': return 'text-zinc-300 bg-zinc-800/50 dark:bg-zinc-800/50';
      default: return 'text-gray-500 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50 dark:bg-zinc-800/50';
      case 'info': return 'border-l-blue-500 bg-blue-50 dark:bg-white/5';
      default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[10px] font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your platform usage, performance metrics, and insights
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] font-medium">Time Period:</span>
          <div className="flex gap-1">
            {[
              { value: "24h", label: "24 Hours" },
              { value: "7d", label: "7 Days" },
              { value: "30d", label: "30 Days" },
              { value: "90d", label: "90 Days" },
              { value: "1y", label: "1 Year" }
            ].map((period) => (
              <Button
                key={period.value}
                variant={selectedPeriod === period.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedPeriod(period.value)}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {keyMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-muted ${metric.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant={metric.trend === 'up' ? 'default' : 'destructive'} className="text-[10px]">
                      {metric.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {metric.change}
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-bold">{metric.value}</p>
                    <p className="text-[10px] text-muted-foreground">{metric.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Weekly Activity Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5" />
                    Weekly Activity
                  </CardTitle>
                  <CardDescription>Platform activity over the past 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between gap-4">
                    {weeklyData.map((day) => (
                      <div key={day.day} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex flex-col-reverse gap-1" style={{ height: '200px' }}>
                          <div
                            className="w-full bg-purple-500/80 rounded-b transition-all hover:bg-purple-500"
                            style={{ height: `${(day.aiRequests / 10000) * 100}%` }}
                            title={`${day.aiRequests.toLocaleString()} AI requests`}
                          />
                        </div>
                        <span className="text-[10px] font-medium mt-2">{day.day}</span>
                        <span className="text-[10px] text-muted-foreground">{day.aiRequests.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Usage by Service */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Usage by Service
                  </CardTitle>
                  <CardDescription>Distribution of requests across services</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {usageByService.map((service) => (
                    <div key={service.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium">{service.name}</span>
                        <span className="text-[10px] text-muted-foreground">{service.requests.toLocaleString()} req</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={service.usage} className="flex-1 h-2" />
                        <span className="text-[10px] font-medium w-12 text-right">{service.usage}%</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription>System health and performance indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {performanceMetrics.map((item) => (
                    <div key={item.metric} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{item.metric}</p>
                        <p className="text-[10px] text-muted-foreground">Target: {item.target}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold">{item.value}</p>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Detailed Usage Breakdown</CardTitle>
                  <CardDescription>Comprehensive view of resource consumption</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {usageByService.map((service, i) => (
                      <div key={service.name} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${service.color}`} />
                            <span className="font-medium">{service.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{service.requests.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">requests</p>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${service.color}`}
                            style={{ width: `${service.usage * 2}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usage Limits</CardTitle>
                  <CardDescription>Current consumption vs limits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span>API Calls</span>
                      <span>45,678 / 100,000</span>
                    </div>
                    <Progress value={45.678} className="h-3" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span>Storage</span>
                      <span>45.2 GB / 100 GB</span>
                    </div>
                    <Progress value={45.2} className="h-3" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span>Deployments</span>
                      <span>892 / 2,000</span>
                    </div>
                    <Progress value={44.6} className="h-3" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span>Team Members</span>
                      <span>8 / 25</span>
                    </div>
                    <Progress value={32} className="h-3" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Response Times</CardTitle>
                  <CardDescription>API response time distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { endpoint: '/api/ai/chat', avg: '42ms', p95: '89ms', p99: '156ms' },
                      { endpoint: '/api/security/scan', avg: '1.2s', p95: '3.4s', p99: '5.2s' },
                      { endpoint: '/api/devops/deploy', avg: '234ms', p95: '890ms', p99: '1.5s' },
                      { endpoint: '/api/analytics', avg: '78ms', p95: '234ms', p99: '456ms' }
                    ].map((item) => (
                      <div key={item.endpoint} className="flex items-center justify-between p-3 border rounded-lg">
                        <code className="text-[10px]">{item.endpoint}</code>
                        <div className="flex gap-4 text-[10px]">
                          <span>avg: <strong>{item.avg}</strong></span>
                          <span>p95: <strong>{item.p95}</strong></span>
                          <span>p99: <strong>{item.p99}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error Rates</CardTitle>
                  <CardDescription>Error distribution by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { type: '4xx Client Errors', count: 234, percentage: 0.08 },
                      { type: '5xx Server Errors', count: 12, percentage: 0.004 },
                      { type: 'Timeout Errors', count: 45, percentage: 0.015 },
                      { type: 'Rate Limit Errors', count: 89, percentage: 0.03 }
                    ].map((error) => (
                      <div key={error.type} className="flex items-center justify-between p-3 border rounded-lg">
                        <span>{error.type}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">{error.count} errors</span>
                          <Badge variant={error.percentage > 0.05 ? 'destructive' : 'secondary'}>
                            {error.percentage}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Users by Activity</CardTitle>
                <CardDescription>Most active teams and users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topUsers.map((user) => (
                    <div key={user.rank} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                        {user.rank}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-[10px] text-muted-foreground">{user.requests.toLocaleString()} requests</p>
                      </div>
                      <Badge variant="outline">{user.usage} of total</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Insights</CardTitle>
                <CardDescription>Automated analysis and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentInsights.map((insight, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg border-l-4 ${getInsightColor(insight.type)}`}
                    >
                      <p className="font-medium">{insight.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}