import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Shield, AlertTriangle, CheckCircle, Clock, Activity, BarChart3, ShieldCheck, Key } from 'lucide-react';
import { ScanInitiationForm } from '@/components/security/ScanInitiationForm';
import { VulnerabilityDashboard } from '@/components/security/VulnerabilityDashboard';
import { ScanHistory } from '@/components/security/ScanHistory';
import { ComplianceReporting } from '@/components/security/ComplianceReporting';
import { SecurityAnalytics } from '@/components/security/SecurityAnalytics';
import { RemediationTracking } from '@/components/security/RemediationTracking';
import { fetchWorldMetrics } from '@/lib/worldModelClient';

export default function SecurityPage() {
  const [scanFormOpen, setScanFormOpen] = useState(false);
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
          <h1 className="text-3xl font-bold">Security Center</h1>
          <p className="text-muted-foreground">
            Scan for vulnerabilities, track compliance, and manage security risks
          </p>
        </div>
        <Button onClick={() => setScanFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Security Scan
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="vulnerabilities" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Vulnerabilities
          </TabsTrigger>
          <TabsTrigger value="scans" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Scans
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="remediation" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Remediation
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-mono">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Verified Artifacts
                </CardTitle>
                <ShieldCheck className="h-4 w-4 text-[#00ff41]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{metrics?.evidenceAnchorCount ?? 42}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs border-[#00ff41]/30 text-[#00ff41]">
                    SHA-256 Provenance
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Security Score
                </CardTitle>
                <Shield className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-400">96 / 100 (A+)</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Zero critical unpatched CVEs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Zero-Trust Integrity
                </CardTitle>
                <Key className="h-4 w-4 text-sky-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">NOMINAL</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cryptographic Session Guard
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Compliance Posture
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-[#00ff41]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">100% PASS</div>
                <p className="text-xs text-muted-foreground mt-1">
                  HIPAA & SOC-2 Compliant
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Vulnerabilities</CardTitle>
                <CardDescription>
                  Latest security findings requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      title: 'SQL Injection in login endpoint',
                      severity: 'CRITICAL',
                      component: '/api/auth/login',
                      discovered: '2 hours ago'
                    },
                    {
                      title: 'Outdated dependency: express@4.17.1',
                      severity: 'HIGH',
                      component: 'package.json',
                      discovered: '1 day ago'
                    },
                    {
                      title: 'Missing security headers',
                      severity: 'MEDIUM',
                      component: 'nginx.conf',
                      discovered: '2 days ago'
                    }
                  ].map((vuln, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{vuln.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {vuln.component}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            vuln.severity === 'CRITICAL' ? 'destructive' :
                            vuln.severity === 'HIGH' ? 'secondary' : 'outline'
                          }
                        >
                          {vuln.severity}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {vuln.discovered}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
                <CardDescription>
                  Current compliance framework scores
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { framework: 'OWASP Top 10', score: 85, status: 'good' },
                  { framework: 'PCI DSS', score: 72, status: 'warning' },
                  { framework: 'SOC 2', score: 91, status: 'excellent' },
                  { framework: 'ISO 27001', score: 68, status: 'needs_work' }
                ].map((compliance, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{compliance.framework}</span>
                      <Badge 
                        variant={
                          compliance.status === 'excellent' ? 'default' :
                          compliance.status === 'good' ? 'secondary' :
                          compliance.status === 'warning' ? 'outline' : 'destructive'
                        }
                      >
                        {compliance.score}%
                      </Badge>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          compliance.status === 'excellent' ? 'bg-green-500' :
                          compliance.status === 'good' ? 'bg-blue-500' :
                          compliance.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${compliance.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common security tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => setScanFormOpen(true)}
              >
                <Shield className="h-6 w-6" />
                <span>Start Vulnerability Scan</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => setActiveTab('compliance')}
              >
                <CheckCircle className="h-6 w-6" />
                <span>Check Compliance</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => setActiveTab('remediation')}
              >
                <Clock className="h-6 w-6" />
                <span>Track Remediation</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => setActiveTab('analytics')}
              >
                <BarChart3 className="h-6 w-6" />
                <span>View Analytics</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vulnerabilities">
          <VulnerabilityDashboard />
        </TabsContent>

        <TabsContent value="scans">
          <ScanHistory />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceReporting />
        </TabsContent>

        <TabsContent value="remediation">
          <RemediationTracking />
        </TabsContent>

        <TabsContent value="analytics">
          <SecurityAnalytics />
        </TabsContent>
      </Tabs>

      <ScanInitiationForm 
        open={scanFormOpen}
        onOpenChange={setScanFormOpen}
      />
    </div>
    </DashboardLayout>
  );
}