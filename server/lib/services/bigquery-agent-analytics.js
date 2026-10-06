 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * BigQuery Agent Analytics Extension
 * Streams agent interaction data to BigQuery (parallels BigQuery Agent Analytics plugin).
 *
 * Invariants:
 * - Non-Blocking: Buffers in memory and flushes lazily
 * - Evidence-First: Records evidence used in each interaction
 * - Graceful: Silently drops if BigQuery not configured
 */




























class BigQueryAgentAnalyticsExtension {
   __init() {this.buffer = []}
   __init2() {this.flushTimer = null}
    __init3() {this.maxBufferSize = 50}
    __init4() {this.flushIntervalMs = 5000}
   __init5() {this.isBigQueryAvailable = false}
   __init6() {this.bigqueryClient = null}

  constructor() {;BigQueryAgentAnalyticsExtension.prototype.__init.call(this);BigQueryAgentAnalyticsExtension.prototype.__init2.call(this);BigQueryAgentAnalyticsExtension.prototype.__init3.call(this);BigQueryAgentAnalyticsExtension.prototype.__init4.call(this);BigQueryAgentAnalyticsExtension.prototype.__init5.call(this);BigQueryAgentAnalyticsExtension.prototype.__init6.call(this);
    this.initLazyClient();
  }

   async initLazyClient() {
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT_ID) {
        const pkgName = "@google-cloud/bigquery";
        const { BigQuery } = await import(/* @vite-ignore */ pkgName).catch(() => ({ BigQuery: null }));
        if (BigQuery) {
          this.bigqueryClient = new BigQuery({
            projectId: process.env.GCP_PROJECT_ID || "feexsystems-prod",
          });
          this.isBigQueryAvailable = true;
        }
      }
    } catch (e) {
      this.isBigQueryAvailable = false;
    }
  }

  /**
   * Log agent interaction event (non-blocking)
   */
  logAgentInteraction(event) {
    const row = {
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
  logAgentEvaluation(event) {
    const row = {
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

   enqueue(table, row) {
    this.buffer.push({ table, row });

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.flushIntervalMs);
    }
  }

   async flush() {
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
      const byTable = itemsToFlush.reduce((acc, item) => {
        if (!acc[item.table]) acc[item.table] = [];
        acc[item.table].push(item.row);
        return acc;
      }, {});

      for (const [tableName, rows] of Object.entries(byTable)) {
        await this.bigqueryClient
          .dataset("feexsystems_analytics")
          .table(tableName)
          .insert(rows)
          .catch((err) => {
            console.warn(`[BigQueryAgentAnalytics] Streaming insert warning (${tableName}):`, _optionalChain([err, 'optionalAccess', _ => _.message]) || err);
          });
      }
    } catch (error) {
      console.warn("[BigQueryAgentAnalytics] Flush failed:", error);
    }
  }
}

export const bigQueryAgentAnalyticsExtension = new BigQueryAgentAnalyticsExtension();
