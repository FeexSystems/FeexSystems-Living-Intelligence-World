import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  Compass,
  FileCode,
  Megaphone,
  RefreshCw,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

/**
 * Shape of the Phase 8 intelligence engine responses.
 * Kept local + minimal: these mirror the service return types in
 * server/lib/marketing/{gap,decay,opportunity}-engine.service.ts.
 */
interface GapResult {
  productId: string;
  productName: string;
  projectId: string | null;
  featuresCount: number;
  gapScore: number;
}

interface DecayResult {
  assetId: string;
  daysSinceLastEvent: number;
  decayScore: number;
}

interface OpportunityResult {
  projectId: string;
  eventName: string;
  reason: string;
  priorityScore: number;
}

/** Unwrap the `{ success, data }` envelope returned by the intelligence routes. */
function unwrap<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

export default function MarketingCommandCenter() {
  const [activeTab, setActiveTab] = useState("gaps");

  const gapsQuery = useQuery({
    queryKey: ["marketing-intelligence", "gaps"],
    queryFn: async () => unwrap<GapResult>(await apiClient.get("/marketing/intelligence/gaps")),
  });

  const decayQuery = useQuery({
    queryKey: ["marketing-intelligence", "decay"],
    queryFn: async () =>
      unwrap<DecayResult>(await apiClient.get("/marketing/intelligence/decay?thresholdDays=30")),
  });

  const opportunityQuery = useQuery({
    queryKey: ["marketing-intelligence", "opportunities"],
    queryFn: async () =>
      unwrap<OpportunityResult>(
        await apiClient.get("/marketing/intelligence/opportunities")
      ),
  });

  const refreshAll = () => {
    void gapsQuery.refetch();
    void decayQuery.refetch();
    void opportunityQuery.refetch();
  };

  const isFetching =
    gapsQuery.isFetching || decayQuery.isFetching || opportunityQuery.isFetching;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Marketing Command Center</h1>
            <p className="text-muted-foreground">
              Evidence-grounded marketing intelligence over the World Model
            </p>
          </div>
          <Button onClick={refreshAll} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary strip driven by the three engines */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Content Gaps</CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {gapsQuery.isLoading ? "—" : gapsQuery.data?.length ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Products with features but little or no collateral
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Decaying Assets</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {decayQuery.isLoading ? "—" : decayQuery.data?.length ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Stale for more than 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {opportunityQuery.isLoading ? "—" : opportunityQuery.data?.length ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Fresh GitHub signals worth acting on
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gaps" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> Gaps
            </TabsTrigger>
            <TabsTrigger value="decay" className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Decay
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Opportunities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gaps" className="space-y-4">
            <EngineState
              isLoading={gapsQuery.isLoading}
              isError={gapsQuery.isError}
              error={gapsQuery.error}
              empty={!gapsQuery.isLoading && (gapsQuery.data?.length ?? 0) === 0}
              emptyLabel="No content gaps detected. Every product has coverage."
            />
            {gapsQuery.data?.map((gap) => (
              <Card key={gap.productId}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">{gap.productName}</CardTitle>
                      <CardDescription>
                        {gap.featuresCount} feature
                        {gap.featuresCount === 1 ? "" : "s"} with no marketing assets
                      </CardDescription>
                    </div>
                    <Badge variant={gap.gapScore >= 0.6 ? "destructive" : "secondary"}>
                      Score {gap.gapScore.toFixed(2)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ScoreBar value={gap.gapScore} />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(
                          `/navigator?q=${encodeURIComponent(
                            `Content strategy for ${gap.productName}`
                          )}`,
                          "_self"
                        )
                      }
                    >
                      <Compass className="h-3.5 w-3.5 mr-1.5" /> Query Navigator
                    </Button>
                    {gap.projectId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(
                            `/evidence?projectId=${encodeURIComponent(gap.projectId as string)}`,
                            "_self"
                          )
                        }
                      >
                        <FileCode className="h-3.5 w-3.5 mr-1.5" /> Inspect Evidence
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="decay" className="space-y-4">
            <EngineState
              isLoading={decayQuery.isLoading}
              isError={decayQuery.isError}
              error={decayQuery.error}
              empty={!decayQuery.isLoading && (decayQuery.data?.length ?? 0) === 0}
              emptyLabel="No decaying assets in the 30-day window."
            />
            {decayQuery.data?.map((asset) => (
              <Card key={asset.assetId}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base font-mono text-sm">
                        {asset.assetId}
                      </CardTitle>
                      <CardDescription>
                        {asset.daysSinceLastEvent} days since last event
                      </CardDescription>
                    </div>
                    <Badge variant={asset.decayScore >= 0.6 ? "destructive" : "secondary"}>
                      Decay {asset.decayScore.toFixed(2)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScoreBar value={asset.decayScore} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-4">
            <EngineState
              isLoading={opportunityQuery.isLoading}
              isError={opportunityQuery.isError}
              error={opportunityQuery.error}
              empty={
                !opportunityQuery.isLoading && (opportunityQuery.data?.length ?? 0) === 0
              }
              emptyLabel="No fresh signals matched a product gap in the last 7 days."
            />
            {opportunityQuery.data?.map((opp, i) => (
              <Card key={`${opp.projectId}-${opp.eventName}-${i}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base capitalize">
                        {opp.eventName} signal
                      </CardTitle>
                      <CardDescription className="mt-1">{opp.reason}</CardDescription>
                    </div>
                    <Badge
                      variant={opp.priorityScore >= 0.8 ? "destructive" : "secondary"}
                    >
                      Priority {opp.priorityScore.toFixed(2)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScoreBar value={opp.priorityScore} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

/** Shared loading / error / empty presentation for each engine tab. */
function EngineState({
  isLoading,
  isError,
  error,
  empty,
  emptyLabel,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  empty: boolean;
  emptyLabel: string;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Computing…
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 py-8 text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <span className="text-sm">
            {error instanceof Error ? error.message : "Failed to load intelligence data."}
          </span>
        </CardContent>
      </Card>
    );
  }

  if (empty) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">{emptyLabel}</CardContent>
      </Card>
    );
  }

  return null;
}
