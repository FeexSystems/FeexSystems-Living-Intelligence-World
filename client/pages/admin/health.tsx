import React, { useState, useEffect, useRef } from 'react';
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
  /** null until the platform reports a real measurement */
  responseTime: number | null;
  lastCheck: string;
  uptime: number | null;
  errorRate: number | null;
}

interface ResourceMetric {
  label: string;
  /** null when the platform does not report this metric. */
  percent: number | null;
  detail?: string;
}

interface SystemMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number | null;
  };
  resources: {
    cpuUsage: number | null;
    memoryUsage: number | null;
    diskUsage: number | null;
    networkIn: number | null;
    networkOut: number | null;
  };
  errors: Array<{
    timestamp: string;
    level: 'error' | 'warning' | 'info';
    message: string;
    service: string;
  }>;
}

const EMPTY_ERRORS: SystemMetrics['errors'] = [];

/** Raw usage metrics subset consumed from /api/admin/metrics */
interface AdminUsageMetricsPayload {
  success: boolean;
  metrics?: {
    usageMetrics?: {
      aiRequests?: number;
      deployments?: number;
      securityScans?: number;
      storage?: number;
      bandwidth?: number;
    };
  };
}

/**
 * Derive CPU utilization from cumulative `process.cpuUsage()` samples.
 * cpuUsage is reported as total user/system microseconds since process start, so
 * a utilization percentage is only meaningful as a delta between two samples
 * divided by the wall-clock time and core count they span.
 */
function deriveCpuPercent(
  previous: SystemHealth['cpuUsage'] | null,
  previousAt: number | null,
  current: SystemHealth['cpuUsage'],
  now: number,
  coreCount: number
): number | null {
  if (!previous || previousAt === null) return null;

  const elapsedMicros = (now - previousAt) * 1000;
  if (elapsedMicros <= 0 || !Number.isFinite(elapsedMicros)) return null;

  const usedMicros = current.user + current.system - (previous.user + previous.system);
  if (!Number.isFinite(usedMicros) || usedMicros < 0) return null;

  const cores = coreCount > 0 ? coreCount : 1;
  const capacityMicros = elapsedMicros * cores;
  return Math.min(100, Math.max(0, (usedMicros / capacityMicros) * 100));
}

function safePercent(numerator: number, denominator: number): string {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return '\u2014';
  }
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export default function AdminHealthPage() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Previous cpuUsage sample, used to derive a real utilization percentage.
  const cpuSampleRef = useRef<{ cpu: SystemHealth['cpuUsage']; at: number } | null>(null);

  useEffect(() => {
    fetchHealthData();

    let interval: ReturnType<typeof setInterval>;
    if (autoRefresh) {
      interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchHealthData = async () => {
    try {
      setError(null);

      const [sysHealthRes, metricsRes] = await Promise.all([
        fetch('/api/admin/system/health'),
        fetch('/api/admin/metrics')
      ]);

      if (!sysHealthRes.ok) {
        throw new Error(`System health request failed (${sysHealthRes.status})`);
      }
      if (!metricsRes.ok) {
        throw new Error(`Metrics request failed (${metricsRes.status})`);
      }

      const sysHealthData = await sysHealthRes.json();
      const metricsData = (await metricsRes.json()) as AdminUsageMetricsPayload;

      if (sysHealthData.success && sysHealthData.systemHealth) {
        const health: SystemHealth = sysHealthData.systemHealth;
        setSystemHealth(health);
        setLastUpdated(sysHealthData.timestamp ?? new Date().toISOString());

        // Derive CPU utilization from the delta against the previous sample.
        const now = Date.now();
        const cpuPercent = deriveCpuPercent(
          cpuSampleRef.current?.cpu ?? null,
          cpuSampleRef.current?.at ?? null,
          health.cpuUsage,
          now,
          navigator?.hardwareConcurrency ?? 1
        );
        cpuSampleRef.current = { cpu: health.cpuUsage, at: now };

        // Service rows are derived strictly from reported health signals.
        // No synthetic latency/uptime/error-rate figures are invented.
        const checkedAt = new Date().toISOString();
        setServices([
          {
            name: 'PostgreSQL',
            status: health.database === 'healthy' ? 'healthy' : 'critical',
            responseTime: null,
            lastCheck: checkedAt,
            uptime: null,
            errorRate: null
          },
          {
            name: 'Redis Cache',
            status: health.redis === 'healthy' ? 'healthy' : 'critical',
            responseTime: null,
            lastCheck: checkedAt,
            uptime: null,
            errorRate: null
          }
        ]);

        const usage = metricsData.metrics?.usageMetrics;
        const totalRequests =
          (usage?.aiRequests ?? 0) + (usage?.deployments ?? 0) + (usage?.securityScans ?? 0);
        const failedRequests = usage?.deployments ?? 0; // deployments counted as attempted work

        const memoryPercent = health.memoryUsage?.heapTotal
          ? (health.memoryUsage.heapUsed / health.memoryUsage.heapTotal) * 100
          : null;

        const mappedMetrics: SystemMetrics = {
          requests: {
            total: totalRequests,
            successful: Math.max(0, totalRequests - failedRequests),
            failed: failedRequests,
            averageResponseTime: null
          },
          resources: {
            cpuUsage: cpuPercent,
            memoryUsage: memoryPercent,
            // The platform does not currently expose disk or network telemetry.
            diskUsage: null,
            networkIn: null,
            networkOut: null
          },
          errors: EMPTY_ERRORS
        };
        setMetrics(mappedMetrics);
      }
    } catch (err) {
      console.error('Error fetching health data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load system health');
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
    if (!Number.isFinite(bytes)) return '\u2014';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  /** Renders a metric only when the platform actually reports it. */
  const renderMetric = (
    label: string,
    percent: number | null,
    detail?: string,
    unavailableNote = 'Not reported by platform'
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {percent === null ? '\u2014' : `${percent.toFixed(0)}%`}
        </span>
      </div>
      {percent === null ? (
        <p className="text-xs text-muted-foreground italic">{unavailableNote}</p>
      ) : (
        <Progress value={Math.min(100, Math.max(0, percent))} className="h-2" />
      )}
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  );

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

        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                <div>
                  <p className="font-medium text-sm">Unable to refresh system health</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  {lastUpdated && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Showing last known data from {new Date(lastUpdated).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={fetchHealthData}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

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
                  {systemHealth.database === 'healthy'
                    ? 'PostgreSQL connection active'
                    : 'PostgreSQL connection failed'}
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
                  {systemHealth.redis === 'healthy'
                    ? 'Redis cache reported healthy'
                    : 'Redis cache reported unhealthy'}
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
                {renderMetric('CPU Usage', metrics.resources.cpuUsage, undefined,
                  metrics.resources.cpuUsage === null
                    ? 'Requires a second sample to compute utilization'
                    : 'Not reported by platform')}
                {renderMetric('Memory Usage', metrics.resources.memoryUsage)}
                {renderMetric('Disk Usage', metrics.resources.diskUsage)}
                {renderMetric(
                  'Network I/O',
                  null,
                  metrics.resources.networkIn === null && metrics.resources.networkOut === null
                    ? 'Not reported by platform'
                    : `\u2193${formatBytes(metrics.resources.networkIn ?? 0)} \u2191${formatBytes(metrics.resources.networkOut ?? 0)}`
                )}
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
                        Last checked {new Date(service.lastCheck).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {service.uptime === null ? 'Uptime not reported' : `${service.uptime}% uptime`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {service.errorRate === null ? 'Error rate not reported' : `${service.errorRate}% error rate`}
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
                      {safePercent(metrics.requests.successful, metrics.requests.total)}
                    </span>
                  </div>
                  {metrics.requests.total === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No requests recorded yet</p>
                  ) : (
                    <Progress
                      value={(metrics.requests.successful / metrics.requests.total) * 100}
                      className="h-2"
                    />
                  )}
                </div>
                <div className="text-center pt-2">
                  <div className="text-lg font-medium">
                    {metrics.requests.averageResponseTime === null
                      ? '\u2014'
                      : `${metrics.requests.averageResponseTime}ms`}
                  </div>
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
                {metrics.errors.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.errors.map((err, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          err.level === 'error' ? 'bg-red-500' :
                          err.level === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{err.message}</div>
                          <div className="text-xs text-muted-foreground">
                            {err.service} • {new Date(err.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <Badge variant={
                          err.level === 'error' ? 'destructive' :
                          err.level === 'warning' ? 'secondary' : 'outline'
                        }>
                          {err.level}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 opacity-60 mb-3" />
                    <p className="text-sm font-medium">No recent system events</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                      Event capture is not yet wired to a telemetry source, so no errors or
                      warnings are available to display.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}