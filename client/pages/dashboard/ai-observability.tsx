import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Gauge,
  Loader2,
  RefreshCw,
  ScrollText,
  Send,
  ThumbsUp,
} from 'lucide-react';

interface RecentInteraction {
  id: string;
  agentId: string;
  agentName: string;
  prompt: string;
  confidence?: number;
  qualityScore?: number;
  latencyMs?: number;
  provider?: string;
  /** Number of Evidence Fabric anchors attached to the response. */
  evidenceCount?: number;
  createdAt: string;
}

interface VerificationMetrics {
  groundedInteractions: number;
  groundedRatio: number;
  /** Share of ungrounded, low-confidence responses — review candidates. */
  hallucinationRisk: number;
  avgEvidenceAnchors: number;
}

interface ObservabilityDashboard {
  totalInteractions: number;
  avgConfidence: number;
  avgQualityScore: number;
  avgLatencyMs: number;
  /** Optional — absent on older API responses; UI degrades gracefully. */
  verification?: VerificationMetrics;
  recentInteractions: RecentInteraction[];
}

interface ObservabilityResponse {
  success: boolean;
  data: ObservabilityDashboard;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status} ${response.statusText})`);
  }
  return response.json() as Promise<T>;
}

/** Formats a 0–1 ratio as a percentage, guarding against null and NaN. */
function ratioPercent(value: number | undefined | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(0)}%`;
}

export default function AIObservabilityPage() {
  const [agentFilter, setAgentFilter] = useState('');
  const [evalTarget, setEvalTarget] = useState<RecentInteraction | null>(null);
  const [evaluator, setEvaluator] = useState('human');
  const [feedback, setFeedback] = useState('');

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ai-agent-observability', agentFilter],
    queryFn: () =>
      fetchJson<ObservabilityResponse>(
        `/api/ai-agents/observability/dashboard?limit=100${
          agentFilter ? `&agentId=${encodeURIComponent(agentFilter)}` : ''
        }`
      ),
  });

  const evaluateMutation = useMutation({
    mutationFn: async () => {
      if (!evalTarget) throw new Error('No interaction selected');
      return fetchJson<{ success: boolean }>('/api/ai-agents/observability/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interactionId: evalTarget.id,
          agentId: evalTarget.agentId,
          evaluator,
          feedback: feedback || undefined,
        }),
      });
    },
    onSuccess: () => {
      setEvalTarget(null);
      setFeedback('');
    },
  });

  const stats = data?.data;
  const interactions = stats?.recentInteractions ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[10px] font-bold tracking-tight">Agent Observability</h1>
            <p className="text-muted-foreground">
              Auditable agent behavior — confidence, quality, latency, and evidence
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              placeholder="Filter by agent ID"
              aria-label="Filter by agent ID"
              className="w-52"
            />
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {error ? (
          <Card className="border-destructive/50">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <AlertCircle className="w-8 h-8 text-destructive mb-3" />
              <p className="font-medium">Unable to load observability data</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-white" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Total Interactions</p>
                      <p className="text-[10px] font-bold">
                        {stats?.totalInteractions.toLocaleString() ?? '—'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-[#00ff41]" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Avg. Confidence</p>
                      <p className="text-[10px] font-bold">{ratioPercent(stats?.avgConfidence)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-zinc-300" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Avg. Quality Score</p>
                      <p className="text-[10px] font-bold">{ratioPercent(stats?.avgQualityScore)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-5 h-5 text-white" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Avg. Latency</p>
                      <p className="text-[10px] font-bold">
                        {Number.isFinite(stats?.avgLatencyMs) ? `${Math.round(stats!.avgLatencyMs)}ms` : '—'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Grounded Responses</p>
                      <p className="text-[10px] font-bold">
                        {ratioPercent(stats?.verification?.groundedRatio)}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {stats?.verification
                          ? `${stats.verification.groundedInteractions} with evidence · ${stats.verification.avgEvidenceAnchors.toFixed(1)} avg anchors`
                          : 'not available'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Hallucination Risk</p>
                      <p className="text-[10px] font-bold">
                        {ratioPercent(stats?.verification?.hallucinationRisk)}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        ungrounded &amp; low-confidence
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Interactions</CardTitle>
                <CardDescription>
                  Most recent logged agent exchanges, newest first
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Loading interactions…
                  </div>
                ) : interactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ScrollText className="w-10 h-10 text-muted-foreground opacity-50 mb-3" />
                    <p className="font-medium">No interactions logged yet</p>
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-md">
                      Interactions are recorded when agents execute queries. Run a query from the
                      AI Agents page to generate telemetry.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {interactions.map((item) => (
                      <div key={item.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex flex-wrap items-center gap-2 justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{item.agentName}</Badge>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {item.agentId}
                            </span>
                            {item.provider && (
                              <Badge variant="outline" className="text-[10px]">
                                {item.provider}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <p className="text-[10px]">{item.prompt}</p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Confidence</p>
                            <Progress
                              value={Number.isFinite(item.confidence) ? (item.confidence ?? 0) * 100 : 0}
                              className="h-1.5 mt-1"
                            />
                            <p className="text-[10px] font-medium mt-1">
                              {ratioPercent(item.confidence)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Quality</p>
                            <Progress
                              value={Number.isFinite(item.qualityScore) ? (item.qualityScore ?? 0) * 100 : 0}
                              className="h-1.5 mt-1"
                            />
                            <p className="text-[10px] font-medium mt-1">
                              {ratioPercent(item.qualityScore)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Latency</p>
                            <p className="text-[10px] font-medium mt-1">
                              {Number.isFinite(item.latencyMs) ? `${item.latencyMs}ms` : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Grounding</p>
                            <div className="mt-1">
                              {(item.evidenceCount ?? 0) > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-emerald-500/40 text-emerald-300"
                                >
                                  {(item.evidenceCount ?? 0)} evidence anchor
                                  {(item.evidenceCount ?? 0) === 1 ? '' : 's'}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-rose-500/40 text-rose-300"
                                >
                                  ungrounded
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {evalTarget?.id === item.id ? (
                          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                            <Input
                              value={evaluator}
                              onChange={(e) => setEvaluator(e.target.value)}
                              placeholder="Evaluator"
                              aria-label="Evaluator"
                            />
                            <Input
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              placeholder="Feedback (optional)"
                              aria-label="Evaluation feedback"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => evaluateMutation.mutate()}
                                disabled={evaluateMutation.isPending}
                              >
                                {evaluateMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4 mr-2" />
                                )}
                                Submit Evaluation
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEvalTarget(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEvalTarget(item)}
                          >
                            Evaluate this interaction
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {evaluateMutation.isSuccess && (
              <Card className="border-[#00ff41]/20 bg-emerald-500/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-[#00ff41]" />
                  <p className="text-[10px]">Evaluation recorded successfully.</p>
                </CardContent>
              </Card>
            )}

            {evaluateMutation.isError && (
              <Card className="border-destructive/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <p className="text-[10px]">
                    {evaluateMutation.error instanceof Error
                      ? evaluateMutation.error.message
                      : 'Failed to record evaluation'}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}