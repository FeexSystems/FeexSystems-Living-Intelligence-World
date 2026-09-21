import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download,
  FileText,
  Shield,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Info
} from 'lucide-react';
import { ComplianceFramework, ComplianceCheck } from '@/shared/api';
import { useToast } from '@/hooks/use-toast';

export function ComplianceReporting() {
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework>(ComplianceFramework.OWASP_TOP_10);
  const [timeRange, setTimeRange] = useState('30d');
  const { toast } = useToast();

  const { data: complianceData, isLoading, isError } = useQuery({
    queryKey: ['compliance-reports'],
    queryFn: async () => {
      const response = await fetch('/api/security/compliance/reports');
      if (!response.ok) throw new Error('Failed to fetch compliance reports');
      const res = await response.json();
      return res.data;
    }
  });

  const currentData = complianceData ? complianceData[selectedFramework] : null;

  const getStatusIcon = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'not_applicable':
        return <Minus className="h-4 w-4 text-gray-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'pass':
        return 'default';
      case 'fail':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'not_applicable':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const handleDownloadReport = (framework: ComplianceFramework) => {
    toast({
      title: "Report Downloaded",
      description: `${complianceData?.[framework]?.name || framework} compliance report has been downloaded.`,
    });
  };

  const getComplianceStats = () => {
    if (!complianceData) return { total: 0, passed: 0, failed: 0, warnings: 0, notApplicable: 0 };
    const allChecks = Object.values(complianceData).flatMap((data: any) => data.checks || []);
    return {
      total: allChecks.length,
      passed: allChecks.filter(check => check.status === 'pass').length,
      failed: allChecks.filter(check => check.status === 'fail').length,
      warnings: allChecks.filter(check => check.status === 'warning').length,
      notApplicable: allChecks.filter(check => check.status === 'not_applicable').length
    };
  };

  const stats = getComplianceStats();

  if (isLoading) {
    return <div className="p-8 text-center">Loading compliance reports...</div>;
  }

  if (isError) {
    return <div className="p-8 text-center text-red-500">Failed to load compliance reports.</div>;
  }

  if (!complianceData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">+5% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passed Controls</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}% of total controls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Controls</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frameworks</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(complianceData).length}</div>
            <p className="text-xs text-muted-foreground">
              Active compliance frameworks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Framework Selection and Overview */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <Select value={selectedFramework} onValueChange={(value) => setSelectedFramework(value as ComplianceFramework)}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(complianceData).map(([key, data]: [string, any]) => (
              <SelectItem key={key} value={key}>
                {data.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        <Button onClick={() => handleDownloadReport(selectedFramework)}>
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Framework Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {currentData?.name}
                  </CardTitle>
                  <CardDescription>{currentData?.description}</CardDescription>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${getScoreColor(currentData?.overallScore || 0)}`}>
                    {getScoreGrade(currentData?.overallScore || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentData?.overallScore}/100
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Progress value={currentData?.overallScore || 0} className="h-3" />
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(currentData?.trend || 'stable')}
                  <span className="text-sm text-muted-foreground">
                    {currentData?.trend === 'up' ? 'Improving' : 
                     currentData?.trend === 'down' ? 'Declining' : 'Stable'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Last Assessment:</span>
                  <div className="font-medium">{currentData?.lastAssessment ? new Date(currentData.lastAssessment).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Controls:</span>
                  <div className="font-medium">{currentData?.checks?.length || 0}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Pass Rate:</span>
                  <div className="font-medium">
                    {currentData?.checks?.length ? Math.round((currentData.checks.filter((c: ComplianceCheck) => c.status === 'pass').length / currentData.checks.length) * 100) : 0}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Frameworks Summary */}
          <Card>
            <CardHeader>
              <CardTitle>All Frameworks Summary</CardTitle>
              <CardDescription>
                Compliance status across all implemented frameworks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(complianceData).map(([key, data]: [string, any]) => (
                  <div 
                    key={key}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedFramework === key ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedFramework(key as ComplianceFramework)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{data.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={data.overallScore >= 80 ? 'default' : data.overallScore >= 60 ? 'secondary' : 'destructive'}>
                          {data.overallScore}%
                        </Badge>
                        {getTrendIcon(data.trend)}
                      </div>
                    </div>
                    <Progress value={data.overallScore} className="h-2 mb-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{data.checks.filter((c: ComplianceCheck) => c.status === 'pass').length} passed</span>
                      <span>{data.checks.filter((c: ComplianceCheck) => c.status === 'fail').length} failed</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="controls" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{currentData?.name} Controls</CardTitle>
              <CardDescription>
                Detailed compliance control assessment results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentData?.checks?.map((check: ComplianceCheck) => (
                  <div key={check.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(check.status)}
                          <h3 className="font-medium">{check.control}</h3>
                          <Badge variant={getStatusColor(check.status)}>
                            {check.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {check.description}
                        </p>
                      </div>
                    </div>

                    {check.evidence && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium mb-1">Evidence:</h4>
                        <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                          {check.evidence}
                        </p>
                      </div>
                    )}

                    {check.remediation && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Remediation:</h4>
                        <p className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border-l-4 border-yellow-500">
                          {check.remediation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Trends</CardTitle>
              <CardDescription>
                Historical compliance scores and improvement tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(complianceData).map(([key, data]: [string, any]) => (
                  <div key={key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{data.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getScoreColor(data.overallScore)}`}>
                          {data.overallScore}%
                        </span>
                        {getTrendIcon(data.trend)}
                      </div>
                    </div>
                    <Progress value={data.overallScore} className="h-2" />
                    <div className="grid grid-cols-4 gap-4 text-xs">
                      <div className="text-center">
                        <div className="font-medium text-green-600">
                          {data.checks.filter((c: ComplianceCheck) => c.status === 'pass').length}
                        </div>
                        <div className="text-muted-foreground">Passed</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-red-600">
                          {data.checks.filter((c: ComplianceCheck) => c.status === 'fail').length}
                        </div>
                        <div className="text-muted-foreground">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-yellow-600">
                          {data.checks.filter((c: ComplianceCheck) => c.status === 'warning').length}
                        </div>
                        <div className="text-muted-foreground">Warnings</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-600">
                          {data.checks.filter((c: ComplianceCheck) => c.status === 'not_applicable').length}
                        </div>
                        <div className="text-muted-foreground">N/A</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}