 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * FeexSystems — BigQuery Streaming Telemetry Service
 * Ingests high-frequency World Model events, Evidence Fabric verifications,
 * and platform telemetry into Google BigQuery.
 * 
 * Invariant: Non-Blocking Initialization
 * Does not block application bootstrap; buffers in memory and flushes lazily.
 */






























class BigQueryStreamingService {
   __init() {this.buffer = []}
   __init2() {this.flushTimer = null}
    __init3() {this.maxBufferSize = 50}
    __init4() {this.flushIntervalMs = 5000}
   __init5() {this.isBigQueryAvailable = false}
   __init6() {this.bigqueryClient = null}

  constructor() {;BigQueryStreamingService.prototype.__init.call(this);BigQueryStreamingService.prototype.__init2.call(this);BigQueryStreamingService.prototype.__init3.call(this);BigQueryStreamingService.prototype.__init4.call(this);BigQueryStreamingService.prototype.__init5.call(this);BigQueryStreamingService.prototype.__init6.call(this);
    this.initLazyClient();
  }

   async initLazyClient() {
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT_ID) {
        const { BigQuery } = await import('@google-cloud/bigquery' ).catch(() => ({ BigQuery: null }));
        if (BigQuery) {
          this.bigqueryClient = new BigQuery({
            projectId: process.env.GCP_PROJECT_ID || 'feexsystems-prod',
          });
          this.isBigQueryAvailable = true;
        }
      }
    } catch (e) {
      this.isBigQueryAvailable = false;
    }
  }

  /**
   * Log an interactive World Model graph exploration event
   */
  logWorldModelEvent(event) {
    const row = {
      event_id: `wme_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      event_type: event.eventType,
      project_id: event.projectId || null,
      query_text: event.queryText || null,
      grounded_entities_count: event.groundedEntitiesCount || 0,
      client_ip: event.clientIp || null,
      user_agent: event.userAgent || null,
      latency_ms: event.latencyMs || 0,
    };

    this.enqueue('world_model_events', row);
  }

  /**
   * Log an immutable Evidence Fabric verification event
   */
  logEvidenceVerification(event) {
    const row = {
      verification_id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      verified_at: new Date().toISOString(),
      project_id: event.projectId,
      repository_name: event.repositoryName,
      commit_sha: event.commitSha,
      artifact_path: event.artifactPath || null,
      evidence_type: event.evidenceType,
      signature_valid: event.signatureValid,
      verifier_version: event.verifierVersion || '1.0.0-canonical',
    };

    this.enqueue('evidence_verification_ledger', row);
  }

  /**
   * Log platform performance and AI token telemetry
   */
  logPlatformTelemetry(event) {
    const row = {
      metric_id: `met_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      service_name: event.serviceName,
      endpoint: event.endpoint,
      status_code: event.statusCode,
      duration_ms: event.durationMs,
      tokens_used: event.tokensUsed || null,
      cache_hit: _nullishCoalesce(event.cacheHit, () => ( null)),
      environment: process.env.NODE_ENV || 'development',
    };

    this.enqueue('platform_telemetry', row);
  }

   enqueue(table, row) {
    this.buffer.push({ table, row });

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.flushIntervalMs);
    }
  }

  /**
   * Flush buffered telemetry rows to BigQuery or discard if in local dev without credentials
   */
   async flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0) return;

    const itemsToFlush = [...this.buffer];
    this.buffer = [];

    if (!this.isBigQueryAvailable || !this.bigqueryClient) {
      // In dev or without BigQuery, silently drop to adhere to non-blocking pattern
      return;
    }

    try {
      // Group by table
      const byTable = itemsToFlush.reduce((acc, item) => {
        if (!acc[item.table]) acc[item.table] = [];
        acc[item.table].push(item.row);
        return acc;
      }, {});

      for (const [tableName, rows] of Object.entries(byTable)) {
        await this.bigqueryClient
          .dataset('feexsystems_analytics')
          .table(tableName)
          .insert(rows)
          .catch((err) => {
            console.warn(`[BigQueryService] Streaming insert warning (${tableName}):`, _optionalChain([err, 'optionalAccess', _ => _.message]) || err);
          });
      }
    } catch (error) {
      console.warn('[BigQueryService] Flush failed:', error);
    }
  }
}

export const bigQueryService = new BigQueryStreamingService();
