import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Shield, 
  Globe, 
  GitBranch, 
  Network, 
  FileText, 
  Calendar as CalendarIcon,
  Clock,
  Settings,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { SecurityScanType, ComplianceFramework, ScanTarget } from '@/shared/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ScanInitiationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScanInitiationForm({ open, onOpenChange }: ScanInitiationFormProps) {
  const [scanName, setScanName] = useState('');
  const [scanType, setScanType] = useState<SecurityScanType | ''>('');
  const [targetType, setTargetType] = useState<'url' | 'repository' | 'network' | 'file' | ''>('');
  const [targetValue, setTargetValue] = useState('');
  const [complianceFramework, setComplianceFramework] = useState<ComplianceFramework | ''>('');
  const [scanDepth, setScanDepth] = useState<'shallow' | 'medium' | 'deep'>('medium');
  const [includePatterns, setIncludePatterns] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');
  const [customRules, setCustomRules] = useState('');
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled' | 'recurring'>('immediate');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!scanName || !scanType || !targetType || !targetValue) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Security Scan Initiated",
        description: `${scanName} has been queued for execution.`,
      });
      
      // Reset form and close dialog
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Scan Failed",
        description: "Failed to initiate security scan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setScanName('');
    setScanType('');
    setTargetType('');
    setTargetValue('');
    setComplianceFramework('');
    setScanDepth('medium');
    setIncludePatterns('');
    setExcludePatterns('');
    setCustomRules('');
    setScheduleType('immediate');
    setScheduledDate(undefined);
    setRecurringFrequency('weekly');
  };

  const getScanTypeIcon = (type: SecurityScanType) => {
    switch (type) {
      case SecurityScanType.VULNERABILITY:
        return <AlertTriangle className="h-5 w-5" />;
      case SecurityScanType.PENETRATION:
        return <Shield className="h-5 w-5" />;
      case SecurityScanType.COMPLIANCE:
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getTargetTypeIcon = (type: string) => {
    switch (type) {
      case 'url':
        return <Globe className="h-4 w-4" />;
      case 'repository':
        return <GitBranch className="h-4 w-4" />;
      case 'network':
        return <Network className="h-4 w-4" />;
      case 'file':
        return <FileText className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Initiate Security Scan</DialogTitle>
          <DialogDescription>
            Configure and launch a comprehensive security assessment
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="target">Target Configuration</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
            <TabsTrigger value="schedule">Scheduling</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scan-name">Scan Name *</Label>
                <Input
                  id="scan-name"
                  placeholder="Enter scan name"
                  value={scanName}
                  onChange={(e) => setScanName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scan-type">Scan Type *</Label>
                <Select value={scanType} onValueChange={(value) => setScanType(value as SecurityScanType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select scan type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SecurityScanType.VULNERABILITY}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Vulnerability Scan
                      </div>
                    </SelectItem>
                    <SelectItem value={SecurityScanType.PENETRATION}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Penetration Test
                      </div>
                    </SelectItem>
                    <SelectItem value={SecurityScanType.COMPLIANCE}>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Compliance Check
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Scan Type Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    type: SecurityScanType.VULNERABILITY,
                    title: 'Vulnerability Scan',
                    description: 'Identifies security weaknesses and potential exploits in your systems',
                    features: ['OWASP Top 10', 'CVE Database', 'Custom Rules', 'Dependency Check']
                  },
                  {
                    type: SecurityScanType.PENETRATION,
                    title: 'Penetration Test',
                    description: 'Simulates real-world attacks to test your security defenses',
                    features: ['Network Scanning', 'Web App Testing', 'Social Engineering', 'Reporting']
                  },
                  {
                    type: SecurityScanType.COMPLIANCE,
                    title: 'Compliance Check',
                    description: 'Validates adherence to security frameworks and regulations',
                    features: ['PCI DSS', 'SOC 2', 'ISO 27001', 'GDPR']
                  }
                ].map((scan) => (
                  <Card 
                    key={scan.type}
                    className={`cursor-pointer transition-colors ${
                      scanType === scan.type ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setScanType(scan.type)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        {getScanTypeIcon(scan.type)}
                        <CardTitle className="text-base">{scan.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-3">
                        {scan.description}
                      </CardDescription>
                      <div className="space-y-1">
                        {scan.features.map((feature, index) => (
                          <div key={index} className="text-xs text-muted-foreground">
                            • {feature}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="target" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-type">Target Type *</Label>
              <Select value={targetType} onValueChange={(value) => setTargetType(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Web Application URL
                    </div>
                  </SelectItem>
                  <SelectItem value="repository">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      Code Repository
                    </div>
                  </SelectItem>
                  <SelectItem value="network">
                    <div className="flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      Network Range
                    </div>
                  </SelectItem>
                  <SelectItem value="file">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      File Upload
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-value">
                Target {targetType === 'url' ? 'URL' : 
                       targetType === 'repository' ? 'Repository' :
                       targetType === 'network' ? 'Range' : 'Path'} *
              </Label>
              <Input
                id="target-value"
                placeholder={
                  targetType === 'url' ? 'https://example.com' :
                  targetType === 'repository' ? 'https://github.com/user/repo' :
                  targetType === 'network' ? '192.168.1.0/24' :
                  '/path/to/files'
                }
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>

            {targetType && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getTargetTypeIcon(targetType)}
                    Target Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {targetType === 'url' && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        The scan will analyze the web application at the specified URL, including:
                      </p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• Authentication mechanisms</li>
                        <li>• Input validation</li>
                        <li>• Session management</li>
                        <li>• SSL/TLS configuration</li>
                        <li>• Common web vulnerabilities</li>
                      </ul>
                    </div>
                  )}
                  
                  {targetType === 'repository' && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        The scan will analyze the source code repository for:
                      </p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• Hardcoded secrets and credentials</li>
                        <li>• Vulnerable dependencies</li>
                        <li>• Code quality issues</li>
                        <li>• Security anti-patterns</li>
                        <li>• License compliance</li>
                      </ul>
                    </div>
                  )}
                  
                  {targetType === 'network' && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        The scan will perform network reconnaissance including:
                      </p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• Port scanning and service detection</li>
                        <li>• Operating system fingerprinting</li>
                        <li>• Vulnerability assessment</li>
                        <li>• Network topology mapping</li>
                        <li>• Service enumeration</li>
                      </ul>
                    </div>
                  )}
                  
                  {targetType === 'file' && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        The scan will analyze uploaded files for:
                      </p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• Malware and virus signatures</li>
                        <li>• Embedded metadata</li>
                        <li>• File format vulnerabilities</li>
                        <li>• Suspicious content patterns</li>
                        <li>• Data leakage risks</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {scanType === SecurityScanType.COMPLIANCE && (
              <div className="space-y-2">
                <Label htmlFor="compliance-framework">Compliance Framework</Label>
                <Select value={complianceFramework} onValueChange={(value) => setComplianceFramework(value as ComplianceFramework)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select compliance framework" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ComplianceFramework.OWASP_TOP_10}>OWASP Top 10</SelectItem>
                    <SelectItem value={ComplianceFramework.PCI_DSS}>PCI DSS</SelectItem>
                    <SelectItem value={ComplianceFramework.SOC_2}>SOC 2</SelectItem>
                    <SelectItem value={ComplianceFramework.ISO_27001}>ISO 27001</SelectItem>
                    <SelectItem value={ComplianceFramework.NIST}>NIST</SelectItem>
                    <SelectItem value={ComplianceFramework.GDPR}>GDPR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="scan-depth">Scan Depth</Label>
              <Select value={scanDepth} onValueChange={(value) => setScanDepth(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shallow">
                    <div>
                      <div className="font-medium">Shallow</div>
                      <div className="text-xs text-muted-foreground">Quick scan, basic checks</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div>
                      <div className="font-medium">Medium</div>
                      <div className="text-xs text-muted-foreground">Balanced scan, comprehensive coverage</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="deep">
                    <div>
                      <div className="font-medium">Deep</div>
                      <div className="text-xs text-muted-foreground">Thorough scan, maximum coverage</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="include-patterns">Include Patterns</Label>
                <Textarea
                  id="include-patterns"
                  placeholder="*.js, *.ts, /api/*"
                  value={includePatterns}
                  onChange={(e) => setIncludePatterns(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated patterns to include in the scan
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="exclude-patterns">Exclude Patterns</Label>
                <Textarea
                  id="exclude-patterns"
                  placeholder="node_modules/*, *.test.js"
                  value={excludePatterns}
                  onChange={(e) => setExcludePatterns(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated patterns to exclude from the scan
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-rules">Custom Security Rules</Label>
              <Textarea
                id="custom-rules"
                placeholder="Enter custom security rules or configurations"
                value={customRules}
                onChange={(e) => setCustomRules(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Additional security rules or configurations specific to your environment
              </p>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Schedule Type</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { value: 'immediate', label: 'Run Immediately', icon: <Shield className="h-4 w-4" /> },
                    { value: 'scheduled', label: 'Schedule for Later', icon: <CalendarIcon className="h-4 w-4" /> },
                    { value: 'recurring', label: 'Recurring Scan', icon: <Clock className="h-4 w-4" /> }
                  ].map((option) => (
                    <Card 
                      key={option.value}
                      className={`cursor-pointer transition-colors ${
                        scheduleType === option.value ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setScheduleType(option.value as any)}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        {option.icon}
                        <span className="font-medium">{option.label}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {scheduleType === 'scheduled' && (
                <div className="space-y-2">
                  <Label>Scheduled Date & Time</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {scheduleType === 'recurring' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={recurringFrequency} onValueChange={(value) => setRecurringFrequency(value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">
                        <p className="mb-2">Recurring scan will:</p>
                        <ul className="space-y-1 ml-4">
                          <li>• Run automatically based on the selected frequency</li>
                          <li>• Track security improvements over time</li>
                          <li>• Send notifications when new vulnerabilities are found</li>
                          <li>• Generate trend reports and analytics</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !scanName || !scanType || !targetType || !targetValue}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            {scheduleType === 'immediate' ? 'Start Scan' : 
             scheduleType === 'scheduled' ? 'Schedule Scan' : 'Create Recurring Scan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}