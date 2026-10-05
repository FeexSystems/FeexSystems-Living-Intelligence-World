import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Bot,
  Code,
  Shield,
  Users,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Zap,
  Globe,
  Bell,
  Settings,
  ArrowRight,
  Folder,
  Star,
  GitBranch,
  Terminal,
  Play,
  BarChart3,
  Eye,
  Sparkles,
  Network,
  Compass,
  Layers,
  RefreshCw
} from "lucide-react";
import { fetchWorldProjects, fetchWorldMetrics } from "@/lib/worldModelClient";
import { GroundedProjectCard, WorldModelTelemetryFeed } from "@/components/dashboard";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: canonicalProjects = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ["world-model-projects"],
    queryFn: fetchWorldProjects,
  });

  const { data: worldMetrics } = useQuery({
    queryKey: ["world-model-metrics"],
    queryFn: fetchWorldMetrics,
  });

  // Authoritative metrics derived from live World Model
  const metrics = {
    totalProjects: worldMetrics?.nodeCount ?? canonicalProjects.length,
    graphEdges: worldMetrics?.edgeCount ?? 14,
    evidenceAnchors: worldMetrics?.evidenceAnchorCount ?? 42,
    domainCount: worldMetrics?.domainCount ?? 5,
    activeDeployments: 8,
    securityScore: 96
  };

  const projects = [
    {
      id: 1,
      name: 'E-Commerce Platform',
      description: 'Full-stack marketplace application',
      status: 'active',
      language: 'TypeScript',
      lastActivity: '2 hours ago',
      progress: 78,
      starred: true,
      deployments: 24,
      issues: 3
    },
    {
      id: 2,
      name: 'AI Analytics Dashboard',
      description: 'Real-time data visualization',
      status: 'active',
      language: 'Python',
      lastActivity: '5 hours ago',
      progress: 92,
      starred: true,
      deployments: 18,
      issues: 0
    },
    {
      id: 3,
      name: 'Mobile Banking App',
      description: 'Cross-platform fintech solution',
      status: 'review',
      language: 'React Native',
      lastActivity: '1 day ago',
      progress: 65,
      starred: false,
      deployments: 12,
      issues: 7
    },
    {
      id: 4,
      name: 'IoT Sensor Network',
      description: 'Industrial monitoring system',
      status: 'development',
      language: 'Go',
      lastActivity: '3 hours ago',
      progress: 45,
      starred: false,
      deployments: 8,
      issues: 2
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'deployment',
      title: 'Production deployment successful',
      project: 'E-Commerce Platform',
      timestamp: '10 minutes ago',
      status: 'success',
      icon: Code
    },
    {
      id: 2,
      type: 'ai_request',
      title: 'AI Code Review completed',
      project: 'AI Analytics Dashboard',
      timestamp: '45 minutes ago',
      status: 'success',
      icon: Bot
    },
    {
      id: 3,
      type: 'security',
      title: 'Security scan found 2 issues',
      project: 'Mobile Banking App',
      timestamp: '2 hours ago',
      status: 'warning',
      icon: Shield
    },
    {
      id: 4,
      type: 'team',
      title: 'Sarah joined the team',
      project: 'IoT Sensor Network',
      timestamp: '4 hours ago',
      status: 'info',
      icon: Users
    },
    {
      id: 5,
      type: 'build',
      title: 'Pipeline build failed',
      project: 'Mobile Banking App',
      timestamp: '6 hours ago',
      status: 'error',
      icon: Terminal
    }
  ];

  const notifications = [
    { id: 1, title: 'Security update available', message: 'Critical patch for Node.js dependencies', type: 'warning', time: '1h ago' },
    { id: 2, title: 'Usage limit approaching', message: 'API calls at 85% of monthly limit', type: 'info', time: '3h ago' },
    { id: 3, title: 'New team member invite', message: 'John requested to join your project', type: 'action', time: '5h ago' },
    { id: 4, title: 'Deployment completed', message: 'v2.3.1 deployed to production', type: 'success', time: '8h ago' }
  ];

  const upcomingTasks = [
    { id: 1, title: 'Review pull request #142', project: 'E-Commerce Platform', dueDate: 'Today', priority: 'high' },
    { id: 2, title: 'Update security certificates', project: 'Mobile Banking App', dueDate: 'Tomorrow', priority: 'critical' },
    { id: 3, title: 'API endpoint documentation', project: 'AI Analytics Dashboard', dueDate: 'Dec 5', priority: 'medium' },
    { id: 4, title: 'Performance optimization', project: 'IoT Sensor Network', dueDate: 'Dec 7', priority: 'low' }
  ];

  const performanceData = [
    { day: 'Mon', requests: 1240, deployments: 5, scans: 3 },
    { day: 'Tue', requests: 1580, deployments: 8, scans: 2 },
    { day: 'Wed', requests: 2100, deployments: 12, scans: 4 },
    { day: 'Thu', requests: 1890, deployments: 6, scans: 5 },
    { day: 'Fri', requests: 2350, deployments: 9, scans: 3 },
    { day: 'Sat', requests: 980, deployments: 2, scans: 1 },
    { day: 'Sun', requests: 650, deployments: 1, scans: 1 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'warning': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'error': return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30';
      case 'info': return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getProjectStatus = (status: string) => {
    switch (status) {
      case 'active': return { label: 'Active', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
      case 'review': return { label: 'In Review', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
      case 'development': return { label: 'Development', color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' };
      default: return { label: 'Unknown', color: 'bg-muted text-muted-foreground border-border' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 dark:text-red-400 bg-red-500/15 border-red-500/30';
      case 'high': return 'text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/30';
      case 'medium': return 'text-sky-600 dark:text-sky-400 bg-sky-500/15 border-sky-500/30';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome to your FeexSystems dashboard. Here's what's happening with your account.
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm px-3 py-1 border-white/20 text-white">
              <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
              All Systems Operational
            </Badge>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 font-mono">
          <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Folder className="w-8 h-8 text-white" />
                <TrendingUp className="w-4 h-4 text-[#00ff41]" />
              </div>
              <p className="text-2xl font-bold mt-2 text-white">{metrics.totalProjects}</p>
              <p className="text-xs text-muted-foreground">Canonical Nodes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Layers className="w-8 h-8 text-white" />
                <span className="text-xs text-[#00ff41] font-mono">100% SHA</span>
              </div>
              <p className="text-2xl font-bold mt-2 text-white">{metrics.evidenceAnchors}</p>
              <p className="text-xs text-muted-foreground">Evidence Anchors</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Network className="w-8 h-8 text-white" />
                <span className="text-xs text-zinc-300 font-mono">{metrics.domainCount} domains</span>
              </div>
              <p className="text-2xl font-bold mt-2 text-white">{metrics.graphEdges}</p>
              <p className="text-xs text-muted-foreground">Graph Relationships</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Globe className="w-8 h-8 text-white" />
                <span className="text-xs text-emerald-400">SYNCED</span>
              </div>
              <p className="text-2xl font-bold mt-2 text-white">8</p>
              <p className="text-xs text-muted-foreground">Satellites Active</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Play className="w-8 h-8 text-white" />
                <div className="w-2 h-2 bg-[#00ff41] rounded-full animate-pulse" />
              </div>
              <p className="text-2xl font-bold mt-2 text-white">{metrics.activeDeployments}</p>
              <p className="text-xs text-muted-foreground">Pipelines Running</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Shield className="w-8 h-8 text-white" />
                <CheckCircle className="w-4 h-4 text-[#00ff41]" />
              </div>
              <p className="text-2xl font-bold mt-2 text-white">{metrics.securityScore}%</p>
              <p className="text-xs text-muted-foreground">Security Posture</p>
            </CardContent>
          </Card>
        </div>

        {/* Account Status Card */}
        <Card className="border-white/20 bg-white/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-white/10">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Account Status</h3>
                  <p className="text-sm text-muted-foreground">Your account is active and all systems are operational</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 md:items-center">
                <div className="text-right">
                  <p className="text-sm font-medium">Current Plan</p>
                  <p className="text-xl font-bold text-white">Professional</p>
                </div>
                <div className="border-l border-white/10 pl-4 hidden md:block">
                  <p className="text-sm text-muted-foreground">Role</p>
                  <Badge variant="outline" className="border-white/20 text-white">User</Badge>
                </div>
                <div className="border-l border-white/10 pl-4 hidden md:block">
                  <p className="text-sm text-muted-foreground">Monthly Usage</p>
                  <div className="flex items-center gap-2">
                    <Progress value={23.5} className="w-24 h-2" />
                    <span className="text-sm">2,350 / 10,000 API calls</span>
                  </div>
                </div>
                <Button variant="outline" className="ml-4 border-white/20 text-white hover:bg-white hover:text-black">
                  Upgrade Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Dashboard Sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid border border-white/10 bg-black">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Performance Chart */}
              <Card className="lg:col-span-2 border-white/10 bg-black">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-white" />
                    Weekly Performance
                  </CardTitle>
                  <CardDescription>API requests, deployments, and scans over the past week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between gap-2">
                    {performanceData.map((day, i) => (
                      <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col gap-1" style={{ height: '200px' }}>
                          <div
                            className="w-full bg-white rounded-t"
                            style={{ height: `${(day.requests / 2500) * 100}%` }}
                            title={`${day.requests} requests`}
                          />
                          <div
                            className="w-full bg-white/60"
                            style={{ height: `${(day.deployments / 15) * 50}px` }}
                            title={`${day.deployments} deployments`}
                          />
                          <div
                            className="w-full bg-white/30 rounded-b"
                            style={{ height: `${(day.scans / 10) * 30}px` }}
                            title={`${day.scans} scans`}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{day.day}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-white rounded" />
                      <span className="text-sm">API Requests</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-white/60 rounded" />
                      <span className="text-sm">Deployments</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-white/30 rounded" />
                      <span className="text-sm">Scans</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions & Planetary Nav */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#00ff41]" />
                      Living Intelligence Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 font-mono text-xs">
                    <Link to="/world">
                      <Button variant="outline" className="w-full justify-between group border-white/10 hover:border-[#00ff41]/50 text-white">
                        <span className="flex items-center gap-2">
                          <Compass className="w-4 h-4 text-[#00ff41]" />
                          3D Spatial Galaxy
                        </span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                      </Button>
                    </Link>
                    <Link to="/omni">
                      <Button variant="outline" className="w-full justify-between group border-white/10 hover:border-white/30 text-white">
                        <span className="flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-amber-400" />
                          Omni-Command Stage
                        </span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                      </Button>
                    </Link>
                    <Link to="/evidence">
                      <Button variant="outline" className="w-full justify-between group border-white/10 hover:border-white/30 text-white">
                        <span className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-emerald-400" />
                          Evidence Fabric Ledger
                        </span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                      </Button>
                    </Link>
                    <Link to="/dashboard/ai-agents">
                      <Button variant="outline" className="w-full justify-between group border-white/10 hover:border-white/30 text-white">
                        <span className="flex items-center gap-2">
                          <Network className="w-4 h-4 text-sky-400" />
                          KFC Agent Cockpit
                        </span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Telemetry Stream Feed */}
                <WorldModelTelemetryFeed />
              </div>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates across your projects</CardDescription>
                </div>
                <Button variant="ghost" size="sm">View All</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition">
                        <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">{activity.project}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">{activity.timestamp}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab: Grounded in Canonical World Model */}
          <TabsContent value="projects" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold font-mono text-white">Canonical World Model Projects</h2>
                <p className="text-xs text-zinc-300 font-mono mt-0.5">Authoritative repository records anchored in the Evidence Fabric</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchProjects()}
                  className="font-mono text-xs border-white/20 text-white hover:bg-white/10"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Sync Feed
                </Button>
                <Link to="/world">
                  <Button size="sm" className="font-mono text-xs bg-[#00ff41] hover:bg-[#00ff41]/90 text-black font-semibold">
                    <Compass className="w-3.5 h-3.5 mr-1.5" />
                    Explore in 3D
                  </Button>
                </Link>
              </div>
            </div>

            {projectsLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-48 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : canonicalProjects.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {canonicalProjects.map((project) => (
                  <GroundedProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center border border-white/10 rounded-xl bg-black/40 font-mono">
                <Folder className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
                <p className="text-white text-sm">No synchronized repositories found</p>
                <p className="text-xs text-zinc-400 mt-1 mb-4">Trigger a sync with the FeexSystems GitHub organization.</p>
                <Button
                  onClick={() => refetchProjects()}
                  className="font-mono text-xs bg-white text-black hover:bg-zinc-200"
                >
                  Sync Pinned Repositories
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Feed</CardTitle>
                <CardDescription>All recent activity across your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...recentActivity, ...recentActivity].map((activity, i) => {
                    const Icon = activity.icon;
                    return (
                      <div key={`${activity.id}-${i}`} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition">
                        <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">{activity.project}</p>
                        </div>
                        <Badge variant="outline">{activity.type}</Badge>
                        <span className="text-sm text-muted-foreground">{activity.timestamp}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Tasks</CardTitle>
                <CardDescription>Tasks that need your attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition">
                      <input type="checkbox" className="w-5 h-5 rounded border-white" />
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">{task.project}</p>
                      </div>
                      <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                      <span className="text-sm font-medium">{task.dueDate}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Stay updated with important alerts</CardDescription>
                </div>
                <Button variant="ghost" size="sm">Mark all as read</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`flex items-start gap-4 p-4 rounded-lg border ${getStatusColor(notification.type)}`}>
                      <Bell className="w-5 h-5 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{notification.time}</span>
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
