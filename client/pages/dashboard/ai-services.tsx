import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Loader2, Layers, Wallet, RefreshCw } from 'lucide-react';
import {
  Brain,
  Plus,
  History,
  BarChart3,
  Settings
} from 'lucide-react';
import { AIServiceCatalog } from '@/components/ai/AIServiceCatalog';
import { AIRequestForm } from '@/components/ai/AIRequestForm';
import { AIResponseDisplay } from '@/components/ai/AIResponseDisplay';
import { AIRequestHistory } from '@/components/ai/AIRequestHistory';
import { AIUsageAnalytics as AIUsageAnalyticsView } from '@/components/ai/AIUsageAnalytics';
import {
  AIService,
  AIRequest,
  CreateAIRequestRequest,
  GetAIServicesResponse,
  CreateAIRequestResponse,
  GetAIRequestsResponse,
  GetAIUsageAnalyticsResponse,
  AIUsageAnalytics
} from '@shared/api';

/** Raw envelope returned by GET /api/ai/analytics/usage */
interface UsageMetricsResponse {
  success: boolean;
  data?: {
    metrics: {
      period: string;
      totalRequests: number;
      completedRequests: number;
      failedRequests: number;
      averageProcessingTime: number;
      totalTokensUsed: number;
      totalCost: number;
      serviceBreakdown: Array<{
        serviceId: string;
        serviceName: string;
        requestCount: number;
        tokensUsed: number;
        cost: number;
      }>;
      hourlyDistribution: Array<{
        hour: number;
        requestCount: number;
        tokensUsed: number;
        cost: number;
      }>;
    };
  };
}

/** Raw envelope returned by GET /api/ai/analytics/performance */
interface PerformanceMetricsResponse {
  success: boolean;
  data?: {
    metrics: {
      averageProcessingTime: number;
      successRate: number;
      errorRate: number;
      throughput: number;
    };
  };
}

/**
 * Guarded percentage. Returns null when the denominator is zero so callers can
 * render an explicit em dash instead of "NaN%".
 */
function safePercent(numerator: number, denominator: number): string | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function safeNumber(value: number, decimals = 1, suffix = ''): string {
  if (!Number.isFinite(value)) return '\u2014';
  return `${value.toFixed(decimals)}${suffix}`;
}

/** GET /api/ai/admin/queue/stats (admin only) */
interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface QueueStatsResponse {
  success: boolean;
  data?: { stats: QueueStats };
}

/** GET /api/ai/analytics/cost */
interface CostAnalysis {
  totalCost: number;
  projectedMonthlyCost: number;
  costByService: Array<{ serviceId: string; cost: number }>;
  costTrend: Array<{ date: string; cost: number }>;
}

interface CostAnalysisResponse {
  success: boolean;
  data?: { analysis: CostAnalysis };
}

export default function AIServicesPage() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [selectedService, setSelectedService] = useState<AIService | null>(null);
  const [currentRequest, setCurrentRequest] = useState<AIRequest | null>(null);

  const queryClient = useQueryClient();

  // Fetch AI services
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['ai-services'],
    queryFn: async (): Promise<GetAIServicesResponse> => {
      const response = await fetch('/api/ai/services');
      if (!response.ok) throw new Error('Failed to fetch AI services');
      return response.json();
    }
  });

  // Fetch AI requests history
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['ai-requests'],
    queryFn: async (): Promise<GetAIRequestsResponse> => {
      const response = await fetch('/api/ai/requests');
      if (!response.ok) throw new Error('Failed to fetch AI requests');
      return response.json();
    }
  });

  // Fetch usage analytics.
  // NOTE: there is no aggregate `/api/ai/analytics` route. The canonical
  // endpoints are `/analytics/usage` and `/analytics/performance`; this query
  // fans out to both and normalizes them into the shared AIUsageAnalytics shape.
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError
  } = useQuery({
    queryKey: ['ai-analytics'],
    queryFn: async (): Promise<GetAIUsageAnalyticsResponse> => {
      const [usageRes, perfRes] = await Promise.all([
        fetch('/api/ai/analytics/usage?period=month'),
        fetch('/api/ai/analytics/performance?period=month')
      ]);

      if (!usageRes.ok) throw new Error('Failed to fetch AI usage analytics');
      if (!perfRes.ok) throw new Error('Failed to fetch AI performance analytics');

      const usage = (await usageRes.json()) as UsageMetricsResponse;
      const performance = (await perfRes.json()) as PerformanceMetricsResponse;

      if (!usage.success || !usage.data?.metrics) {
        throw new Error('AI usage analytics returned an unsuccessful payload');
      }

      const m = usage.data.metrics;
      const analytics: AIUsageAnalytics = {
        userId: 'current-user',
        period: m.period,
        totalRequests: m.totalRequests ?? 0,
        successfulRequests: m.completedRequests ?? 0,
        failedRequests: m.failedRequests ?? 0,
        totalTokensUsed: m.totalTokensUsed ?? 0,
        totalCost: m.totalCost ?? 0,
        // Prefer the canonical usage rollup; fall back to the performance rollup.
        averageProcessingTime:
          m.averageProcessingTime ?? performance.data?.metrics.averageProcessingTime ?? 0,
        topServices: (m.serviceBreakdown ?? []).map((s) => ({
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          requestCount: s.requestCount ?? 0,
          tokenCount: s.tokensUsed ?? 0,
          cost: s.cost ?? 0
        })),
        dailyUsage: (m.hourlyDistribution ?? []).map((h) => ({
          date: String(h.hour).padStart(2, '0'),
          requests: h.requestCount ?? 0,
          tokens: h.tokensUsed ?? 0,
          cost: h.cost ?? 0
        }))
      };

      return { analytics, success: true };
    }
  });

  // Create AI request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (request: CreateAIRequestRequest): Promise<CreateAIRequestResponse> => {
      const response = await fetch('/api/ai/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      if (!response.ok) throw new Error('Failed to create AI request');
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentRequest(data.request);
      setActiveTab('response');
      queryClient.invalidateQueries({ queryKey: ['ai-requests'] });
      queryClient.invalidateQueries({ queryKey: ['ai-analytics'] });
    }
  });

  // Cost analysis is user-scoped and available to every authenticated user.
  const {
    data: costData,
    isLoading: costLoading,
    error: costError,
    refetch: refetchCost,
  } = useQuery({
    queryKey: ['ai-cost'],
    queryFn: async (): Promise<CostAnalysisResponse> => {
      const response = await fetch('/api/ai/analytics/cost?period=month');
      if (!response.ok) throw new Error('Failed to fetch AI cost analysis');
      return response.json();
    },
  });

  // Queue stats are admin-gated (the route returns 403 for non-admins), so this
  // query is opt-in and only enabled once the operator opens this tab.
  const [queueTabActive, setQueueTabActive] = useState(false);

  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'positive' | 'negative'>>({});

  const {
    data: queueData,
    isLoading: queueLoading,
    error: queueError,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: ['ai-queue-stats'],
    queryFn: async (): Promise<QueueStatsResponse> => {
      const response = await fetch('/api/ai/admin/queue/stats');
      if (!response.ok) throw new Error('Failed to fetch AI queue statistics');
      return response.json();
    },
    enabled: queueTabActive,
    retry: false,
  });

  const handleServiceSelect = (service: AIService) => {
    setSelectedService(service);
    setActiveTab('request');
  };

  const handleRequestSubmit = async (request: CreateAIRequestRequest) => {
    const result = await createRequestMutation.mutateAsync(request);
    return result.request;
  };

  const handleRequestSelect = (request: AIRequest) => {
    setCurrentRequest(request);
    setActiveTab('response');
  };

  // Copy/feedback affordance feedback surfaced to the operator.
const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  const handleCopyResponse = async (content: string) => {
    // AIResponseDisplay already performs the clipboard write; this only confirms
    // the outcome to the operator and covers the fallback path if it failed.
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(content);
      setNotice('Response copied to clipboard');
    } catch {
      setNotice('Copy failed — select the response text manually');
    }
  };

  const handleDownloadResponse = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFeedback = (requestId: string, rating: 'positive' | 'negative') => {
    // No feedback persistence endpoint exists yet. Record it for the session so
    // the interaction is not silently swallowed, and state clearly that it is
    // not being stored server-side.
    setFeedbackGiven((prev) => ({ ...prev, [requestId]: rating }));
    setNotice(
      `Recorded ${rating} feedback for ${requestId.slice(0, 8)} (session only — not yet persisted)`
    );
  };

  const services = servicesData?.services || [];
  const requests = requestsData?.requests || [];
  const analytics = analyticsData?.analytics;
  const cost = costData?.data?.analysis;
  const queueStats = queueData?.data?.stats;

  const maxServiceCost =
    cost && cost.costByService.length > 0
      ? Math.max(...cost.costByService.map((s) => s.cost))
      : 0;

  const successRate = analytics ? safePercent(analytics.successfulRequests, analytics.totalRequests) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-[10px] font-bold tracking-tight">AI Services</h1>
          <p className="text-muted-foreground">
            Access powerful AI tools and services for your projects
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-white" />
                <div>
                  <p className="text-[10px] font-medium">Total Requests</p>
                  <p className="text-[10px] font-bold">{analytics.totalRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-[#00ff41]" />
                <div>
                  <p className="text-[10px] font-medium">Success Rate</p>
                  <p className="text-[10px] font-bold">
                    {successRate ?? '\u2014'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 text-white">$</div>
                <div>
                  <p className="text-[10px] font-medium">Total Cost</p>
                  <p className="text-[10px] font-bold">
                    {Number.isFinite(analytics.totalCost) ? `$${analytics.totalCost.toFixed(2)}` : '\u2014'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 text-zinc-300">⚡</div>
                <div>
                  <p className="text-[10px] font-medium">Avg. Time</p>
                  <p className="text-[10px] font-bold">
                    {safeNumber((analytics.averageProcessingTime ?? 0) / 1000, 1, 's')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="catalog" className="flex items-center space-x-2">
            <Brain className="w-4 h-4" />
            <span>Services</span>
          </TabsTrigger>
          <TabsTrigger value="request" className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>New Request</span>
          </TabsTrigger>
          <TabsTrigger value="response" className="flex items-center space-x-2">
            <span>Response</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="w-4 h-4" />
            <span>History</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger
            value="budget"
            className="flex items-center space-x-2"
            onClick={() => setQueueTabActive(true)}
          >
            <Wallet className="w-4 h-4" />
            <span>Cost &amp; Queue</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-6">
          <AIServiceCatalog
            services={services}
            onServiceSelect={handleServiceSelect}
            isLoading={servicesLoading}
          />
        </TabsContent>

        <TabsContent value="request" className="space-y-6">
          {selectedService ? (
            <AIRequestForm
              service={selectedService}
              onSubmit={handleRequestSubmit}
              isLoading={createRequestMutation.isPending}
              templates={[]}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-[10px] font-medium mb-2">Select a Service</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Choose an AI service from the catalog to create a new request
                </p>
                <Button onClick={() => setActiveTab('catalog')}>
                  Browse Services
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="response" className="space-y-6">
          {currentRequest ? (
            <AIResponseDisplay
              request={currentRequest}
              onCopy={handleCopyResponse}
              onDownload={handleDownloadResponse}
              onFeedback={handleFeedback}
              isLoading={createRequestMutation.isPending}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 text-muted-foreground mb-4 opacity-50">📄</div>
                <h3 className="text-[10px] font-medium mb-2">No Response Selected</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Submit a request or select one from your history to view the response
                </p>
                <div className="flex space-x-2">
                  <Button onClick={() => setActiveTab('request')}>
                    New Request
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('history')}>
                    View History
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <AIRequestHistory
            requests={requests}
            onRequestSelect={handleRequestSelect}
            isLoading={requestsLoading}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analyticsError ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-destructive mb-4 opacity-60" />
                <h3 className="text-[10px] font-medium mb-2">Analytics Unavailable</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  {analyticsError instanceof Error
                    ? analyticsError.message
                    : 'Failed to load AI analytics'}
                </p>
                <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['ai-analytics'] })}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : analytics ? (
            <AIUsageAnalyticsView
              analytics={analytics}
              isLoading={analyticsLoading}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-[10px] font-medium mb-2">No Analytics Data</h3>
                <p className="text-muted-foreground text-center">
                  Analytics will appear here once you start using AI services
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          {/* Cost breakdown */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Cost Analysis
                </CardTitle>
                <CardDescription>Spend for the current month, by service</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchCost()} disabled={costLoading}>
                {costLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {costError ? (
                <div className="flex items-center gap-2 text-[10px] text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {costError instanceof Error ? costError.message : 'Failed to load cost analysis'}
                </div>
              ) : costLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading cost analysis…
                </div>
              ) : !cost || cost.costByService.length === 0 ? (
                <p className="text-[10px] text-muted-foreground py-4">
                  No cost data recorded for this period yet.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Spend this period</p>
                      <p className="text-[10px] font-bold">
                        {Number.isFinite(cost.totalCost) ? `$${cost.totalCost.toFixed(2)}` : '\u2014'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Projected monthly</p>
                      <p className="text-[10px] font-bold">
                        {Number.isFinite(cost.projectedMonthlyCost)
                          ? `$${cost.projectedMonthlyCost.toFixed(2)}`
                          : '\u2014'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-medium">Cost by service</p>
                    {cost.costByService.map((entry) => (
                      <div key={entry.serviceId} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="truncate font-mono text-[10px]">{entry.serviceId}</span>
                          <span className="font-medium">
                            {Number.isFinite(entry.cost) ? `$${entry.cost.toFixed(2)}` : '\u2014'}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-2 bg-primary rounded-full"
                            style={{
                              width: `${
                                maxServiceCost > 0 ? (entry.cost / maxServiceCost) * 100 : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Queue depth */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Request Queue
              </CardTitle>
              <CardDescription>Bull queue depth and throughput</CardDescription>
            </CardHeader>
            <CardContent>
              {queueError ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground opacity-50 mb-2" />
                  <p className="font-medium text-[10px]">Queue statistics unavailable</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {queueError instanceof Error
                      ? queueError.message
                      : 'Failed to load queue statistics'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    This view requires an admin account.
                  </p>
                </div>
              ) : queueLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading queue statistics…
                </div>
              ) : !queueStats ? (
                <p className="text-[10px] text-muted-foreground py-4">No queue data reported.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {(
                    [
                      ['Waiting', queueStats.waiting, 'text-zinc-300'],
                      ['Active', queueStats.active, 'text-white'],
                      ['Completed', queueStats.completed, 'text-[#00ff41]'],
                      ['Failed', queueStats.failed, 'text-zinc-400'],
                      ['Delayed', queueStats.delayed, 'text-white'],
                    ] as const
                  ).map(([label, value, colorClass]) => (
                    <div key={label} className="p-3 border rounded-lg">
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className={`text-[10px] font-bold ${colorClass}`}>
                        {Number.isFinite(value) ? value.toLocaleString() : '\u2014'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Budget Alerts
              </CardTitle>
              <CardDescription>Spend thresholds for this account</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[10px] text-muted-foreground">
                The budget alert service currently accepts alert definitions but does not
                persist them, so no stored alerts are available to display. Alerts must be
                tracked once a dedicated store is wired up server-side.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {notice && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg bg-foreground text-background text-[10px] shadow-lg"
          >
            {notice}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}