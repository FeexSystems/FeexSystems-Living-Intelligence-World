import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, AlertTriangle, XCircle, CheckCircle, Eye, RefreshCw, Download, TrendingUp, Activity, Lock } from "lucide-react";

interface SecurityOverview {
  totalScans: number;
  completedScans: number;
  failedScans: number;
  successRate: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  trends: Array<{
    date: string;
    scansCount: number;
    vulnerabilitiesFound: number;
  }>;
}

interface VulnerabilityReport {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  affectedUsers: number;
  discoveredAt: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'IGNORED';
  cveId?: string;
}

interface SecurityEvent {
  id: string;
  type: 'SCAN_COMPLETED' | 'VULNERABILITY_FOUND' | 'SECURITY_BREACH' | 'ACCESS_DENIED';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  userId?: string;
  userEmail?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export default function AdminSecurityPage() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityReport[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    fetchSecurityData();
  }, [selectedTimeframe]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      // In real app, these would be API calls
      // const [overviewRes, vulnerabilitiesRes, eventsRes] = await Promise.all([
      //   fetch(`/api/admin/security/overview?timeframe=${selectedTimeframe}`),
      //   fetch('/api/admin/security/vulnerabilities'),
      //   fetch('/api/admin/security/events')
      // ]);
      
      // Mock data
      const mockOverview: SecurityOverview = {
        totalScans: 1247,
        completedScans: 1198,
        failedScans: 49,
        successRate: 96.1,
        vulnerabilities: {
          critical: 3,
          high: 12,
          medium: 45,
          low: 89,
          info: 156
        },
        trends: [
          { date: '2024-02-05', scansCount: 45, vulnerabilitiesFound: 12 },
          { date: '2024-02-06', scansCount: 52, vulnerabilitiesFound: 8 },
          { date: '2024-02-07', scansCount: 38, vulnerabilitiesFound: 15 },
          { date: '2024-02-08', scansCount: 61, vulnerabilitiesFound: 6 },
          { date: '2024-02-09', scansCount: 47, vulnerabilitiesFound: 11 },
          { date: '2024-02-10', scansCount: 55, vulnerabilitiesFound: 9 },
          { date: '2024-02-11', scansCount: 43, vulnerabilitiesFound: 7 }
        ]
      };

      const mockVulnerabilities: VulnerabilityReport[] = [
        {
          id: '1',
          type: 'SQL_INJECTION',
          severity: 'CRITICAL',
          title: 'SQL Injection vulnerability in user authentication',
          description: 'Potential SQL injection in login endpoint allowing unauthorized access',
          affectedUsers: 1247,
          discoveredAt: '2024-02-10T14:30:00Z',
          status: 'IN_PROGRESS',
          cveId: 'CVE-2024-1234'
        },
        {
          id: '2',
          type: 'XSS',
          severity: 'HIGH',
          title: 'Cross-site scripting in user profile',
          description: 'Stored XSS vulnerability in user profile description field',
          affectedUsers: 89,
          discoveredAt: '2024-02-09T09:15:00Z',
          status: 'OPEN'
        },
        {
          id: '3',
          type: 'WEAK_ENCRYPTION',
          severity: 'MEDIUM',
          title: 'Weak encryption algorithm detected',
          description: 'Usage of deprecated MD5 hashing for password storage',
          affectedUsers: 234,
          discoveredAt: '2024-02-08T16:45:00Z',
          status: 'RESOLVED'
        },
        {
          id: '4',
          type: 'INFORMATION_DISCLOSURE',
          severity: 'LOW',
          title: 'Information disclosure in error messages',
          description: 'Detailed error messages revealing system information',
          affectedUsers: 0,
          discoveredAt: '2024-02-07T11:20:00Z',
          status: 'IGNORED'
        }
      ];

      const mockEvents: SecurityEvent[] = [
        {
          id: '1',
          type: 'VULNERABILITY_FOUND',
          severity: 'HIGH',
          message: 'Critical SQL injection vulnerability discovered',
          timestamp: '2024-02-10T14:30:00Z'
        },
        {
          id: '2',
          type: 'ACCESS_DENIED',
          severity: 'MEDIUM',
          message: 'Multiple failed login attempts detected',
          userId: 'user123',
          userEmail: 'suspicious@example.com',
          timestamp: '2024-02-10T13:45:00Z'
        },
        {
          id: '3',
          type: 'SCAN_COMPLETED',
          severity: 'LOW',
          message: 'Security scan completed successfully',
          timestamp: '2024-02-10T12:00:00Z'
        },
        {
          id: '4',
          type: 'SECURITY_BREACH',
          severity: 'HIGH',
          message: 'Unauthorized access attempt blocked',
          userId: 'user456',
          userEmail: 'attacker@malicious.com',
          timestamp: '2024-02-10T10:30:00Z'
        }
      ];

      setOverview(mockOverview);
      setVulnerabilities(mockVulnerabilities);
      setSecurityEvents(mockEvents);
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'HIGH':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'MEDIUM':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'LOW':
        return <AlertTriangle className="w-4 h-4 text-blue-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'destructive';
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'secondary';
      case 'LOW':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'default';
      case 'IN_PROGRESS':
        return 'secondary';
      case 'OPEN':
        return 'destructive';
      case 'IGNORED':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getEventSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading && !overview) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading security data...</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Security Monitoring</h1>
            <p className="text-muted-foreground">
              Monitor security scans, vulnerabilities, and security events
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {['24h', '7d', '30d'].map((timeframe) => (
                <Button
                  key={timeframe}
                  variant={selectedTimeframe === timeframe ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeframe(timeframe as any)}
                >
                  {timeframe}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={fetchSecurityData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Security Overview */}
        {overview && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalScans.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3 text-green-500 inline mr-1" />
                  +12% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.successRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {overview.completedScans} completed, {overview.failedScans} failed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{overview.vulnerabilities.critical}</div>
                <p className="text-xs text-muted-foreground">
                  Require immediate attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Vulnerabilities</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.values(overview.vulnerabilities).reduce((a, b) => a + b, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all severity levels
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Vulnerability Breakdown */}
        {overview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Vulnerability Breakdown
              </CardTitle>
              <CardDescription>
                Distribution of vulnerabilities by severity level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                {Object.entries(overview.vulnerabilities).map(([severity, count]) => (
                  <div key={severity} className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      {getSeverityIcon(severity.toUpperCase())}
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground capitalize">{severity}</div>
                    <Progress 
                      value={(count / Object.values(overview.vulnerabilities).reduce((a, b) => a + b, 0)) * 100} 
                      className="h-2 mt-2" 
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vulnerabilities Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              Active Vulnerabilities
            </CardTitle>
            <CardDescription>
              Current security vulnerabilities requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vulnerability</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Affected Users</TableHead>
                  <TableHead>Discovered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vulnerabilities.map((vuln) => (
                  <TableRow key={vuln.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{vuln.title}</div>
                        <div className="text-sm text-muted-foreground">{vuln.type}</div>
                        {vuln.cveId && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {vuln.cveId}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityBadgeVariant(vuln.severity)} className="flex items-center w-fit">
                        {getSeverityIcon(vuln.severity)}
                        <span className="ml-1">{vuln.severity}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(vuln.status)}>
                        {vuln.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{vuln.affectedUsers.toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {new Date(vuln.discoveredAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Security Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Recent Security Events
            </CardTitle>
            <CardDescription>
              Latest security-related events and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityEvents.map((event) => (
                <div key={event.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getEventSeverityColor(event.severity)}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{event.message}</div>
                    <div className="text-xs text-muted-foreground">
                      {event.type.replace('_', ' ')} • {new Date(event.timestamp).toLocaleString()}
                      {event.userEmail && ` • ${event.userEmail}`}
                    </div>
                  </div>
                  <Badge variant={
                    event.severity === 'HIGH' ? 'destructive' :
                    event.severity === 'MEDIUM' ? 'secondary' : 'outline'
                  }>
                    {event.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security Trends */}
        {overview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Security Trends
              </CardTitle>
              <CardDescription>
                Scan activity and vulnerability discovery trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {overview.trends.reduce((sum, day) => sum + day.scansCount, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Scans (7 days)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {overview.trends.reduce((sum, day) => sum + day.vulnerabilitiesFound, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Vulnerabilities Found (7 days)</div>
                  </div>
                </div>
                <div className="flex items-end space-x-1 h-32">
                  {overview.trends.map((trend, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="flex-1 flex flex-col justify-end space-y-1">
                        <div 
                          className="bg-blue-500 rounded-t transition-all duration-300"
                          style={{ height: `${(trend.scansCount / 70) * 100}%`, minHeight: '2px' }}
                          title={`${trend.scansCount} scans`}
                        />
                        <div 
                          className="bg-red-500 rounded-t transition-all duration-300"
                          style={{ height: `${(trend.vulnerabilitiesFound / 20) * 100}%`, minHeight: '2px' }}
                          title={`${trend.vulnerabilitiesFound} vulnerabilities`}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                    Scans
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                    Vulnerabilities
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}