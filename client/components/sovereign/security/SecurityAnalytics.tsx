import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Award
} from 'lucide-react';
import { SecurityAnalytics as SecurityAnalyticsType, VulnerabilitySeverity, ComplianceFramework } from '@/shared/api';

export function SecurityAnalytics() {
  const [timeRange, setTimeRange] = useState('30d');

  const { data: analyticsData, isLoading, isError } = useQuery({
    queryKey: ['security-analytics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/security/dashboard?timeframe=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const res = await response.json();
      return res.data;
    }
  });

  const analytics: SecurityAnalyticsType | undefined = analyticsData;


  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Activity className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: VulnerabilitySeverity) => {
    switch (severity) {
      case VulnerabilitySeverity.CRITICAL:
        return 'destructive';
      case VulnerabilitySeverity.HIGH:
        return 'secondary';
      case VulnerabilitySeverity.MEDIUM:
        return 'outline';
      case VulnerabilitySeverity.LOW:
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getComplianceGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFrameworkName = (framework: ComplianceFramework) => {
    switch (framework) {
      case ComplianceFramework.OWASP_TOP_10:
        return 'OWASP Top 10';
      case ComplianceFramework.PCI_DSS:
        return 'PCI DSS';
      case ComplianceFramework.SOC_2:
        return 'SOC 2';
      case ComplianceFramework.ISO_27001:
        return 'ISO 27001';
      case ComplianceFramework.NIST:
        return 'NIST';
      case ComplianceFramework.GDPR:
        return 'GDPR';
      default:
        return framework;
    }
  };

  const calculateSecurityScore = () => {
    const vulnerabilityWeight: Record<string, number> = {
      [VulnerabilitySeverity.CRITICAL]: 10,
      [VulnerabilitySeverity.HIGH]: 5,
      [VulnerabilitySeverity.MEDIUM]: 2,
      [VulnerabilitySeverity.LOW]: 1,
      [VulnerabilitySeverity.INFO]: 0
    };

    const totalVulnerabilities = analytics?.topVulnerabilities?.reduce((sum: number, vuln: any) => {
      return sum + (vuln.count * vulnerabilityWeight[vuln.severity]);
    }, 0) || 0;

    // Simple scoring algorithm (in real app this would be more sophisticated)
    const baseScore = 100;
    const penalty = Math.min(totalVulnerabilities * 0.5, 50);
    return Math.max(baseScore - penalty, 0);
  };

  const securityScore = calculateSecurityScore();

  if (isLoading) {
    return <div className="p-8 text-center">Loading analytics...</div>;
  }

  if (isError || !analytics) {
    return <div className="p-8 text-center text-red-500">Failed to load analytics.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive security metrics and trend analysis
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
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getComplianceColor(securityScore)}`}>
              {getComplianceGrade(securityScore)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={securityScore} className="flex-1 h-2" />
              <span className="text-xs text-muted-foreground">{Math.round(securityScore)}/100</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalScans}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>+{analytics.scansThisWeek} this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Scan Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(analytics.averageScanTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              -15s from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Time</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.remediationMetrics.averageTimeToResolve}d
            </div>
            <p className="text-xs text-muted-foreground">
              Average time to resolve
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
              Vulnerability Trends
            </CardTitle>
            <CardDescription>
              Daily vulnerability discovery and resolution over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.vulnerabilityTrends.map((trend, index) => (
                <div key={trend.date} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {new Date(trend.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {trend.critical} Critical
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {trend.high} High
                      </Badge>
                      <Badge variant="default" className="text-xs">
                        {trend.resolved} Resolved
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-1 h-2">
                    <div 
                      className="bg-red-500 rounded-sm" 
                      style={{ height: `${Math.max((trend.critical / 10) * 100, 10)}%` }}
                    />
                    <div 
                      className="bg-orange-500 rounded-sm" 
                      style={{ height: `${Math.max((trend.high / 10) * 100, 10)}%` }}
                    />
                    <div 
                      className="bg-yellow-500 rounded-sm" 
                      style={{ height: `${Math.max((trend.medium / 15) * 100, 10)}%` }}
                    />
                    <div 
                      className="bg-blue-500 rounded-sm" 
                      style={{ height: `${Math.max((trend.low / 10) * 100, 10)}%` }}
                    />
                    <div 
                      className="bg-green-500 rounded-sm" 
                      style={{ height: `${Math.max((trend.resolved / 10) * 100, 10)}%` }}
                    />
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
              Top Vulnerabilities
            </CardTitle>
            <CardDescription>
              Most common security issues found in scans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topVulnerabilities.map((vuln, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-sm font-medium">{vuln.title}</div>
                    <Badge variant={getSeverityColor(vuln.severity)} className="text-xs">
                      {vuln.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{vuln.count}</span>
                    {getTrendIcon(vuln.trend)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance and Remediation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Compliance Scores
            </CardTitle>
            <CardDescription>
              Current compliance framework scores and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.complianceScores.map((compliance, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{getFrameworkName(compliance.framework)}</span>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={compliance.score >= 80 ? 'default' : compliance.score >= 60 ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {getComplianceGrade(compliance.score)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{compliance.score}%</span>
                      {getTrendIcon(compliance.trend)}
                    </div>
                  </div>
                  <Progress value={compliance.score} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Remediation Metrics
            </CardTitle>
            <CardDescription>
              Vulnerability remediation performance and progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Average Resolution Time</div>
                  <div className="text-sm text-muted-foreground">Time to fix vulnerabilities</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{analytics.remediationMetrics.averageTimeToResolve}d</div>
                  <div className="text-xs text-muted-foreground">-0.8d from last month</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Resolved This Week</div>
                  <div className="text-sm text-muted-foreground">Vulnerabilities fixed</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{analytics.remediationMetrics.resolvedThisWeek}</div>
                  <div className="text-xs text-muted-foreground">+12% from last week</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Overdue Tasks</div>
                  <div className="text-sm text-muted-foreground">Tasks past due date</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{analytics.remediationMetrics.overdueTasks}</div>
                  <div className="text-xs text-muted-foreground">Require attention</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Security Summary</CardTitle>
          <CardDescription>
            Key security metrics and achievements for this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{analytics.scansThisMonth}</div>
              <div className="text-sm text-muted-foreground">Security Scans</div>
              <div className="text-xs text-muted-foreground mt-1">+23% from last month</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{analytics.remediationMetrics.resolvedThisWeek * 4}</div>
              <div className="text-sm text-muted-foreground">Vulnerabilities Fixed</div>
              <div className="text-xs text-muted-foreground mt-1">+15% from last month</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {Math.round(Object.values(analytics.complianceScores || {}).reduce((sum, s) => sum + Number(s), 0) / (Object.values(analytics.complianceScores || {}).length || 1))}%
              </div>
              <div className="text-sm text-muted-foreground">Avg. Compliance</div>
              <div className="text-xs text-muted-foreground mt-1">+5% from last month</div>
            </div>
            
            <div className="text-center">
              <div className={`text-3xl font-bold ${getComplianceColor(securityScore)}`}>
                {getComplianceGrade(securityScore)}
              </div>
              <div className="text-sm text-muted-foreground">Security Grade</div>
              <div className="text-xs text-muted-foreground mt-1">Improved from B-</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}