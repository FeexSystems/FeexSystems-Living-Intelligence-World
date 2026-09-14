import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  MoreHorizontal, 
  Search, 
  Play,
  Square,
  RotateCcw,
  Download,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Calendar,
  Target,
  Activity,
  FileText
} from 'lucide-react';
import { SecurityScan, SecurityScanType, ScanStatus, VulnerabilitySeverity } from '@/shared/api';
import { useToast } from '@/hooks/use-toast';

export function ScanHistory() {
  const { toast } = useToast();

  const { data: scansData, isLoading, isError } = useQuery({
    queryKey: ['security-scans'],
    queryFn: async () => {
      const response = await fetch('/api/security/scans');
      if (!response.ok) throw new Error('Failed to fetch scans');
      const res = await response.json();
      return res.data;
    }
  });

  const scans: SecurityScan[] = scansData?.scans || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<SecurityScanType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ScanStatus | 'all'>('all');
  const [selectedScan, setSelectedScan] = useState<SecurityScan | null>(null);

  const filteredScans = scans.filter(scan => {
    const matchesSearch = scan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         scan.target.value.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || scan.scanType === selectedType;
    const matchesStatus = selectedStatus === 'all' || scan.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusIcon = (status: ScanStatus) => {
    switch (status) {
      case ScanStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case ScanStatus.RUNNING:
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case ScanStatus.FAILED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case ScanStatus.QUEUED:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case ScanStatus.CANCELED:
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: ScanStatus) => {
    switch (status) {
      case ScanStatus.COMPLETED:
        return 'default';
      case ScanStatus.RUNNING:
        return 'secondary';
      case ScanStatus.FAILED:
        return 'destructive';
      case ScanStatus.QUEUED:
        return 'outline';
      case ScanStatus.CANCELED:
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getScanTypeIcon = (type: SecurityScanType) => {
    switch (type) {
      case SecurityScanType.VULNERABILITY:
        return <AlertTriangle className="h-4 w-4" />;
      case SecurityScanType.PENETRATION:
        return <Shield className="h-4 w-4" />;
      case SecurityScanType.COMPLIANCE:
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'url':
        return <Target className="h-3 w-3" />;
      case 'repository':
        return <FileText className="h-3 w-3" />;
      case 'network':
        return <Activity className="h-3 w-3" />;
      case 'file':
        return <FileText className="h-3 w-3" />;
      default:
        return <Target className="h-3 w-3" />;
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getRunningProgress = (scan: SecurityScan) => {
    if (scan.status !== ScanStatus.RUNNING) return scan.progress || 0;
    
    // Mock progress calculation based on time elapsed
    if (scan.startedAt) {
      const elapsed = Date.now() - scan.startedAt.getTime();
      const estimatedTotal = 30 * 60 * 1000; // 30 minutes
      return Math.min((elapsed / estimatedTotal) * 100, 95);
    }
    return scan.progress || 0;
  };

  const handleRetryScan = (scanId: string) => {
    toast({
      title: "Scan Retried",
      description: "Security scan has been queued for retry.",
    });
  };

  const handleCancelScan = (scanId: string) => {
    toast({
      title: "Scan Canceled",
      description: "Security scan has been canceled successfully.",
    });
  };

  const handleDownloadReport = (scanId: string) => {
    toast({
      title: "Report Downloaded",
      description: "Security scan report has been downloaded.",
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading scan history...</div>;
  }

  if (isError) {
    return <div className="p-8 text-center text-red-500">Failed to load scan history.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search scans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value={SecurityScanType.VULNERABILITY}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Vulnerability
              </div>
            </SelectItem>
            <SelectItem value={SecurityScanType.PENETRATION}>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Penetration
              </div>
            </SelectItem>
            <SelectItem value={SecurityScanType.COMPLIANCE}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Compliance
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as any)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value={ScanStatus.COMPLETED}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Completed
              </div>
            </SelectItem>
            <SelectItem value={ScanStatus.RUNNING}>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-blue-500" />
                Running
              </div>
            </SelectItem>
            <SelectItem value={ScanStatus.FAILED}>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Failed
              </div>
            </SelectItem>
            <SelectItem value={ScanStatus.QUEUED}>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Queued
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Scans List */}
      {filteredScans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No scans found</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery || selectedType !== 'all' || selectedStatus !== 'all' 
                ? 'No scans match your current filters.' 
                : 'Start your first security scan to see results here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredScans.map((scan) => (
            <Card key={scan.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(scan.status)}
                      <CardTitle className="text-lg">{scan.name}</CardTitle>
                      <Badge variant={getStatusColor(scan.status)}>
                        {scan.status}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getScanTypeIcon(scan.scanType)}
                        {scan.scanType}
                      </Badge>
                    </div>
                    
                    <CardDescription className="flex items-center gap-2">
                      {getTargetIcon(scan.target.type)}
                      <span className="capitalize">{scan.target.type}:</span>
                      {scan.target.value}
                    </CardDescription>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedScan(scan)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {scan.status === ScanStatus.COMPLETED && (
                        <DropdownMenuItem onClick={() => handleDownloadReport(scan.id)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download Report
                        </DropdownMenuItem>
                      )}
                      {scan.status === ScanStatus.FAILED && (
                        <DropdownMenuItem onClick={() => handleRetryScan(scan.id)}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Retry Scan
                        </DropdownMenuItem>
                      )}
                      {scan.status === ScanStatus.RUNNING && (
                        <DropdownMenuItem 
                          onClick={() => handleCancelScan(scan.id)}
                          className="text-destructive"
                        >
                          <Square className="h-4 w-4 mr-2" />
                          Cancel Scan
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {scan.status === ScanStatus.RUNNING && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span>{Math.round(getRunningProgress(scan))}%</span>
                    </div>
                    <Progress value={getRunningProgress(scan)} className="h-2" />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Started:</span>
                    <div className="font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {scan.startedAt ? scan.startedAt.toLocaleDateString() : 'Not started'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <div className="font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {scan.results?.scanDuration ? formatDuration(scan.results.scanDuration) :
                       scan.status === ScanStatus.RUNNING && scan.startedAt ? 
                       formatDuration(Math.floor((Date.now() - scan.startedAt.getTime()) / 1000)) : 
                       'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vulnerabilities:</span>
                    <div className="font-medium">
                      {scan.results?.summary.totalVulnerabilities || 0}
                      {scan.results?.summary.criticalCount ? (
                        <span className="text-red-600 ml-1">
                          ({scan.results.summary.criticalCount} critical)
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Coverage:</span>
                    <div className="font-medium">
                      {scan.results?.coverage.endpoints || 0} endpoints
                    </div>
                  </div>
                </div>

                {scan.results?.summary && (
                  <div className="flex items-center gap-2">
                    {scan.results.summary.criticalCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {scan.results.summary.criticalCount} Critical
                      </Badge>
                    )}
                    {scan.results.summary.highCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {scan.results.summary.highCount} High
                      </Badge>
                    )}
                    {scan.results.summary.mediumCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {scan.results.summary.mediumCount} Medium
                      </Badge>
                    )}
                    {scan.results.summary.lowCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {scan.results.summary.lowCount} Low
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedScan(scan)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  
                  {scan.status === ScanStatus.COMPLETED && (
                    <Button 
                      size="sm"
                      onClick={() => handleDownloadReport(scan.id)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download Report
                    </Button>
                  )}
                  
                  {scan.status === ScanStatus.FAILED && (
                    <Button 
                      size="sm"
                      onClick={() => handleRetryScan(scan.id)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  )}
                  
                  {scan.status === ScanStatus.RUNNING && (
                    <Button 
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelScan(scan.id)}
                    >
                      <Square className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Scan Details Dialog */}
      <Dialog open={!!selectedScan} onOpenChange={(open) => !open && setSelectedScan(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedScan && getStatusIcon(selectedScan.status)}
              Scan Details
            </DialogTitle>
            <DialogDescription>
              {selectedScan?.name} - {selectedScan?.scanType} scan
            </DialogDescription>
          </DialogHeader>
          
          {selectedScan && (
            <div className="space-y-6">
              {/* Scan Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Scan Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getStatusColor(selectedScan.status)}>
                        {selectedScan.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getScanTypeIcon(selectedScan.scanType)}
                        {selectedScan.scanType}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Target:</span>
                      <span className="font-medium text-sm">{selectedScan.target.value}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Started:</span>
                      <span className="font-medium text-sm">
                        {selectedScan.startedAt ? selectedScan.startedAt.toLocaleString() : 'Not started'}
                      </span>
                    </div>
                    {selectedScan.completedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Completed:</span>
                        <span className="font-medium text-sm">{selectedScan.completedAt.toLocaleString()}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedScan.results && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Results Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Vulnerabilities:</span>
                        <span className="font-medium">{selectedScan.results.summary.totalVulnerabilities}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Critical:</span>
                        <Badge variant="destructive" className="text-xs">
                          {selectedScan.results.summary.criticalCount}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">High:</span>
                        <Badge variant="secondary" className="text-xs">
                          {selectedScan.results.summary.highCount}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Medium:</span>
                        <Badge variant="outline" className="text-xs">
                          {selectedScan.results.summary.mediumCount}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium text-sm">
                          {formatDuration(selectedScan.results.scanDuration)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Recommendations */}
              {selectedScan.results?.recommendations && selectedScan.results.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedScan.results.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Logs */}
              {selectedScan.logs && selectedScan.logs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Scan Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64 w-full border rounded-lg p-4 bg-black text-green-400 font-mono text-sm">
                      <div className="space-y-1">
                        {selectedScan.logs.map((log, index) => (
                          <div key={index} className="flex gap-2">
                            <span className="text-gray-500 shrink-0">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                            <span className={`shrink-0 ${
                              log.level === 'error' ? 'text-red-400' :
                              log.level === 'warn' ? 'text-yellow-400' :
                              log.level === 'info' ? 'text-blue-400' : 'text-green-400'
                            }`}>
                              [{log.level.toUpperCase()}]
                            </span>
                            <span>{log.message}</span>
                          </div>
                        ))}
                        
                        {selectedScan.status === ScanStatus.RUNNING && (
                          <div className="flex gap-2 animate-pulse">
                            <span className="text-gray-500 shrink-0">
                              {new Date().toLocaleTimeString()}
                            </span>
                            <span className="text-blue-400 shrink-0">[INFO]</span>
                            <span>Scan in progress...</span>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}