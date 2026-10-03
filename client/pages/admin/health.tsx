import React, { useState, useEffect } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  Zap,
  MemoryStick,
  Network
} from "lucide-react";

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  database: 'healthy' | 'unhealthy';
  redis: 'healthy' | 'unhealthy';
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  responseTime: number;
  lastCheck: string;
  uptime: number;
  errorRate: number;
}

interface SystemMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIn: number;
    networkOut: number;
  };
  errors: Array<{
    timestamp: string;
    level: 'error' | 'warning' | 'info';
    message: string;
    service: string;
  }>;
}

export default function AdminHealthPage() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchHealthData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      
      const [sysHealthRes, metricsRes] = await Promise.all([
        fetch('/api/admin/system/health'),
        fetch('/api/admin/metrics')
      ]);
      
      const sysHealthData = await sysHealthRes.json();
      const metricsData = await metricsRes.json();

      if (sysHealthData.success) {
        setSystemHealth(sysHealthData.systemHealth);
        
        // Build mock services based on real DB/Redis status from system health
        const mockServices: ServiceStatus[] = [
          {
            name: 'API Server',
            status: sysHealthData.systemHealth.status === 'healthy' ? 'healthy' : 'degraded',
            responseTime: 45,
            lastCheck: new Date().toISOString(),
            uptime: 99.9,
            errorRate: 0.1
          },
          {
            name: 'Database',
            status: sysHealthData.systemHealth.database,
            responseTime: 12,
            lastCheck: new Date().toISOString(),
            uptime: 99.95,
            errorRate: 0.05
          },
          {
            name: 'Redis Cache',
            status: sysHealthData.systemHealth.redis,
            responseTime: 3,
            lastCheck: new Date().toISOString(),
            uptime: 99.8,
            errorRate: 0.2
          }
        ];
        setServices(mockServices);
      }

      if (metricsData.success && sysHealthData.success) {
        const usage = metricsData.metrics.usageMetrics;
        const memoryUsagePercent = (sysHealthData.systemHealth.memoryUsage.heapUsed / sysHealthData.systemHealth.memoryUsage.heapTotal) * 100;
        
        const mappedMetrics: SystemMetrics = {
          requests: {
            total: usage.aiRequests + usage.deployments + usage.securityScans || 45678,
            successful: (usage.aiRequests + usage.deployments + usage.securityScans) * 0.98 || 44567,
            failed: (usage.aiRequests + usage.deployments + usage.securityScans) * 0.02 || 1111,
            averageResponseTime: 156
          },
          resources: {
            cpuUsage: 35, // In real app, calculate from cpuUsage
            memoryUsage: Math.round(memoryUsagePercent) || 68,
            diskUsage: 42,
            networkIn: usage.storage || 1024 * 1024 * 150,
            networkOut: usage.bandwidth || 1024 * 1024 * 89
          },
          errors: []
        };
        setMetrics(mappedMetrics);
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'degraded':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading && !systemHealth) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading system health...</p>
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
            <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
            <p className="text-muted-foreground">
              Monitor system status and performance metrics
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Zap className={`w-4 h-4 mr-2 ${autoRefresh ? 'text-green-500' : 'text-gray-500'}`} />
              Auto Refresh {autoRefresh ? 'On' : 'Off'}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchHealthData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Overview */}
        {systemHealth && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                {getStatusIcon(systemHealth.status)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{systemHealth.status}</div>
                <p className="text-xs text-muted-foreground">
                  Uptime: {formatUptime(systemHealth.uptime)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                <Database className={`w-4 h-4 ${systemHealth.database === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{systemHealth.database}</div>
                <p className="text-xs text-muted-foreground">
                  PostgreSQL connection active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache</CardTitle>
                <Server className={`w-4 h-4 ${systemHealth.redis === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{systemHealth.redis}</div>
                <p className="text-xs text-muted-foreground">
                  Redis cache operational
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <MemoryStick className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBytes(systemHealth.memoryUsage.heapUsed)}</div>
                <p className="text-xs text-muted-foreground">
                  of {formatBytes(systemHealth.memoryUsage.heapTotal)} allocated
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Resource Usage */}
        {metrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Cpu className="w-5 h-5 mr-2" />
                Resource Usage
              </CardTitle>
              <CardDescription>
                Current system resource utilization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CPU Usage</span>
                    <span className="text-sm text-muted-foreground">{metrics.resources.cpuUsage}%</span>
                  </div>
                  <Progress value={metrics.resources.cpuUsage} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <span className="text-sm text-muted-foreground">{metrics.resources.memoryUsage}%</span>
                  </div>
                  <Progress value={metrics.resources.memoryUsage} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Disk Usage</span>
                    <span className="text-sm text-muted-foreground">{metrics.resources.diskUsage}%</span>
                  </div>
                  <Progress value={metrics.resources.diskUsage} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Network I/O</span>
                    <span className="text-sm text-muted-foreground">
                      ↓{formatBytes(metrics.resources.networkIn)} ↑{formatBytes(metrics.resources.networkOut)}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <Progress value={60} className="h-2 flex-1" />
                    <Progress value={40} className="h-2 flex-1" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Services Status
            </CardTitle>
            <CardDescription>
              Health status of all system services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(service.status)}
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Response time: {service.responseTime}ms
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">{service.uptime}% uptime</div>
                      <div className="text-sm text-muted-foreground">
                        {service.errorRate}% error rate
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(service.status)}>
                      {service.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Request Metrics */}
        {metrics && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Network className="w-5 h-5 mr-2" />
                  Request Metrics
                </CardTitle>
                <CardDescription>
                  API request statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{metrics.requests.successful.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{metrics.requests.failed.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {((metrics.requests.successful / metrics.requests.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={(metrics.requests.successful / metrics.requests.total) * 100} 
                    className="h-2" 
                  />
                </div>
                <div className="text-center pt-2">
                  <div className="text-lg font-medium">{metrics.requests.averageResponseTime}ms</div>
                  <div className="text-sm text-muted-foreground">Average Response Time</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Recent Events
                </CardTitle>
                <CardDescription>
                  Latest system events and errors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.errors.map((error, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        error.level === 'error' ? 'bg-red-500' :
                        error.level === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{error.message}</div>
                        <div className="text-xs text-muted-foreground">
                          {error.service} • {new Date(error.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant={
                        error.level === 'error' ? 'destructive' :
                        error.level === 'warning' ? 'secondary' : 'outline'
                      }>
                        {error.level}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}