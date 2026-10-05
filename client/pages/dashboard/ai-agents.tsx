import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  Bot,
  Network,
  Search,
  Send,
  Sparkles,
  Boxes,
  Wrench,
  Loader2,
  Link2,
} from 'lucide-react';
import { KFCPipelineCockpit } from '@/components/dashboard';

type AgentTier = 'OUT_OF_BOX' | 'LOW_CODE' | 'CUSTOM';

interface AnalyticsAgent {
  id: string;
  name: string;
  description: string;
  tier: AgentTier;
  config: Record<string, unknown>;
  mcpTools: string[];
  a2aCapabilities: string[];
  createdAt: string;
}

interface AgentsResponse {
  success: boolean;
  data: { agents: AnalyticsAgent[]; count: number };
}

/** Result shape of POST /api/ai-agents/agents/query */
interface AgentQueryResult {
  answer: string;
  confidence: number;
  provider: string;
  model?: string;
  latencyMs: number;
  evidenceAnchors: Array<{ id: string; [key: string]: unknown }>;
}

const TIER_META: Record<AgentTier, { label: string; icon: typeof Bot; badge: string }> = {
  OUT_OF_BOX: {
    label: 'Out of the box',
    icon: Sparkles,
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  LOW_CODE: {
    label: 'Low code',
    icon: Boxes,
    badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  },
  CUSTOM: {
    label: 'Custom',
    icon: Wrench,
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status} ${response.statusText})`);
  }
  return response.json() as Promise<T>;
}

export default function AIAgentsPage() {
  const [activeTab, setActiveTab] = useState('registry');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<AgentTier | 'ALL'>('ALL');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [queryTier, setQueryTier] = useState<AgentTier>('OUT_OF_BOX');

  const {
    data: agentsData,
    isLoading: agentsLoading,
    error: agentsError,
    refetch: refetchAgents,
  } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: () => fetchJson<AgentsResponse>('/api/ai-agents/agents'),
  });

  const agents = agentsData?.data?.agents ?? [];

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.description.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === 'ALL' || agent.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;

  const queryMutation = useMutation({
    mutationFn: async () => {
      return fetchJson<{ success: boolean; data: AgentQueryResult }>(
        '/api/ai-agents/agents/query',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: selectedAgentId ?? undefined,
            query,
            tier: queryTier,
          }),
        }
      );
    },
  });

  const result = queryMutation.data?.data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
            <p className="text-muted-foreground">
              Agent registry, agent-to-agent mesh, and grounded analytics queries
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchAgents()} disabled={agentsLoading}>
            {agentsLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            Refresh Registry
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="registry" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Registry
            </TabsTrigger>
            <TabsTrigger value="query" className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              Mesh Query
            </TabsTrigger>
            <TabsTrigger value="kfc" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00ff41]" />
              KFC Spec Engine
            </TabsTrigger>
          </TabsList>

          {/* ── Registry ── */}
          <TabsContent value="registry" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agents by name or description"
                aria-label="Search agents"
              />
              <div className="flex gap-2">
                {(['ALL', 'OUT_OF_BOX', 'LOW_CODE', 'CUSTOM'] as const).map((tier) => (
                  <Button
                    key={tier}
                    variant={tierFilter === tier ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTierFilter(tier)}
                  >
                    {tier === 'ALL' ? 'All tiers' : TIER_META[tier].label}
                  </Button>
                ))}
              </div>
            </div>

            {agentsError ? (
              <Card className="border-destructive/50">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <AlertCircle className="w-8 h-8 text-destructive mb-3" />
                  <p className="font-medium">Unable to load the agent registry</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {agentsError instanceof Error ? agentsError.message : 'Unknown error'}
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => refetchAgents()}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : agentsLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading agents…
              </div>
            ) : filteredAgents.length === 0 ? (
              <Card>
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <Bot className="w-8 h-8 text-muted-foreground opacity-50 mb-3" />
                  <p className="font-medium">No agents match your filters</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {agents.length === 0
                      ? 'The registry is empty.'
                      : 'Try a different search term or tier.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredAgents.map((agent) => {
                  const meta = TIER_META[agent.tier] ?? TIER_META.OUT_OF_BOX;
                  const Icon = meta.icon;
                  return (
                    <Card
                      key={agent.id}
                      className="hover:border-primary/50 transition-colors"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{agent.name}</CardTitle>
                              <p className="text-xs text-muted-foreground font-mono">{agent.id}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={meta.badge}>
                            {meta.label}
                          </Badge>
                        </div>
                        <CardDescription className="mt-2">{agent.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">
                            MCP Tools
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {agent.mcpTools.length > 0 ? (
                              agent.mcpTools.map((tool) => (
                                <Badge key={tool} variant="secondary" className="font-mono text-xs">
                                  {tool}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">None declared</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">
                            A2A Capabilities
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {agent.a2aCapabilities.length > 0 ? (
                              agent.a2aCapabilities.map((cap) => (
                                <Badge key={cap} variant="outline" className="text-xs">
                                  <Link2 className="w-3 h-3 mr-1" />
                                  {cap}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">None declared</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setSelectedAgentId(agent.id);
                            setQueryTier(agent.tier);
                            setActiveTab('query');
                          }}
                        >
                          Query this agent
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Mesh Query ── */}
          <TabsContent value="query" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Run a grounded analytics query</CardTitle>
                <CardDescription>
                  The agent retrieves evidence from the World Model before answering. Results
                  carry confidence, latency, and the evidence anchors used.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Which services have the highest failure rate?"
                    aria-label="Analytics query"
                    disabled={queryMutation.isPending}
                  />
                  <Button
                    onClick={() => queryMutation.mutate()}
                    disabled={queryMutation.isPending || query.trim().length === 0}
                  >
                    {queryMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Run Query
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Tier:</span>
                  {(['OUT_OF_BOX', 'LOW_CODE', 'CUSTOM'] as const).map((tier) => (
                    <Button
                      key={tier}
                      variant={queryTier === tier ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setQueryTier(tier)}
                      disabled={queryMutation.isPending}
                    >
                      {TIER_META[tier].label}
                    </Button>
                  ))}
                  {selectedAgent && (
                    <Badge variant="secondary" className="ml-auto">
                      Target: {selectedAgent.name}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {queryMutation.isError && (
              <Card className="border-destructive/50">
                <CardContent className="p-6 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Query failed</p>
                    <p className="text-sm text-muted-foreground">
                      {queryMutation.error instanceof Error
                        ? queryMutation.error.message
                        : 'Unknown error'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {result && (
              <Card>
                <CardHeader>
                  <CardTitle>Agent Response</CardTitle>
                  <CardDescription>
                    Provider: {result.provider}
                    {result.model ? ` · Model: ${result.model}` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.answer}</p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="text-lg font-bold">
                        {Number.isFinite(result.confidence)
                          ? `${(result.confidence * 100).toFixed(0)}%`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Latency</p>
                      <p className="text-lg font-bold">
                        {Number.isFinite(result.latencyMs) ? `${result.latencyMs}ms` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Evidence Anchors</p>
                      <p className="text-lg font-bold">{result.evidenceAnchors?.length ?? 0}</p>
                    </div>
                  </div>

                  {result.evidenceAnchors?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Evidence used
                      </p>
                      <div className="space-y-2">
                        {result.evidenceAnchors.map((anchor, i) => (
                          <div key={anchor.id ?? i} className="p-3 border rounded-lg">
                            <p className="text-xs font-mono text-muted-foreground">
                              {anchor.id ?? `anchor-${i}`}
                            </p>
                            {anchor.url ? (
                              <a
                                href={String(anchor.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm underline underline-offset-4"
                              >
                                {String(anchor.url)}
                              </a>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No source URL recorded for this anchor.
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── KFC Autonomous Spec Pipeline ── */}
          <TabsContent value="kfc" className="space-y-4">
            <KFCPipelineCockpit />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}