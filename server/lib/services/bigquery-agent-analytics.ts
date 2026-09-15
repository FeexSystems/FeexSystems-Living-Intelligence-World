/**
 * BigQuery Agent Analytics Extension
 * Streams agent interaction data to BigQuery (parallels BigQuery Agent Analytics plugin).
 *
 * Invariants:
 * - Non-Blocking: Buffers in memory and flushes lazily
 * - Evidence-First: Records evidence used in each interaction
 * - Graceful: Silently drops if BigQuery not configured
 */

export interface AgentInteractionEvent {
  agentId: string;
  agentName: string;
  userId?: string;
  prompt: string;
  response: string;
  provider: string;
  model?: string;
  tokensUsed?: number;
  latencyMs?: number;
  confidence?: number;
  evidenceCount: number;
  qualityScore?: number;
  mcpToolsCalled: string[];
}

export interface AgentEvaluationEvent {
  agentId: string;
  interactionId: string;
  evaluator: string;
  accuracyScore?: number;
  completenessScore?: number;
  helpfulnessScore?: number;
  overallScore?: number;
  groundTruth?: string;
}

class BigQueryAgentAnalyticsExtension {
  private buffer: Array<{ table: string; row: Record<string, any> }> = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly maxBufferSize = 50;
  private readonly flushIntervalMs = 5000;
  private isBigQueryAvailable = false;
  private bigqueryClient: any = null;

  constructor() {
    this.initLazyClient();
  }

  private async initLazyClient() {
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT_ID) {
        const { BigQuery } = await import("@google-cloud/bigquery" as any).catch(() => ({ BigQuery: null }));
        if (BigQuery) {
          this.bigqueryClient = new BigQuery({
            projectId: process.env.GCP_PROJECT_ID || "feexsystems-prod",
          });
          this.isBigQueryAvailable = true;
        }
      }
    } catch {
      this.isBigQueryAvailable = false;
    }
  }

  /**
   * Log agent interaction event (non-blocking)
   */
  logAgentInteraction(event: AgentInteractionEvent): void {
    const row: Record<string, any> = {
      event_id: `agi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      agent_id: event.agentId,
      agent_name: event.agentName,
      user_id: event.userId || null,
      prompt: event.prompt,
      response: event.response,
      provider: event.provider,
      model: event.model || null,
      tokens_used: event.tokensUsed || null,
      latency_ms: event.latencyMs || null,
      confidence: event.confidence || null,
      evidence_count: event.evidenceCount,
      quality_score: event.qualityScore || null,
      mcp_tools_called: event.mcpToolsCalled,
    };

    this.enqueue("agent_interactions", row);
  }

  /**
   * Log agent evaluation event (non-blocking)
   */
  logAgentEvaluation(event: AgentEvaluationEvent): void {
    const row: Record<string, any> = {
      event_id: `age_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      agent_id: event.agentId,
      interaction_id: event.interactionId,
      evaluator: event.evaluator,
      accuracy_score: event.accuracyScore || null,
      completeness_score: event.completenessScore || null,
      helpfulness_score: event.helpfulnessScore || null,
      overall_score: event.overallScore || null,
      ground_truth: event.groundTruth || null,
    };

    this.enqueue("agent_evaluations", row);
  }

  private enqueue(table: string, row: Record<string, any>): void {
    this.buffer.push({ table, row });

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.flushIntervalMs);
    }
  }

  private async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0) return;

    const itemsToFlush = [...this.buffer];
    this.buffer = [];

    if (!this.isBigQueryAvailable || !this.bigqueryClient) {
      return;
    }

    try {
      const byTable = itemsToFlush.reduce<Record<string, any[]>>((acc, item) => {
        if (!acc[item.table]) acc[item.table] = [];
        acc[item.table].push(item.row);
        return acc;
      }, {});

      for (const [tableName, rows] of Object.entries(byTable)) {
        await this.bigqueryClient
          .dataset("feexsystems_analytics")
          .table(tableName)
          .insert(rows)
          .catch((err: any) => {
            console.warn(`[BigQueryAgentAnalytics] Streaming insert warning (${tableName}):`, err?.message || err);
          });
      }
    } catch (error) {
      console.warn("[BigQueryAgentAnalytics] Flush failed:", error);
    }
  }
}

export const bigQueryAgentAnalyticsExtension = new BigQueryAgentAnalyticsExtension();
