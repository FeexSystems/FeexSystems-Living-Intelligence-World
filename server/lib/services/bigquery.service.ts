/**
 * FeexSystems — BigQuery Streaming Telemetry Service
 * Ingests high-frequency World Model events, Evidence Fabric verifications,
 * and platform telemetry into Google BigQuery.
 * 
 * Invariant: Non-Blocking Initialization
 * Does not block application bootstrap; buffers in memory and flushes lazily.
 */

export interface WorldModelTelemetryEvent {
  eventType: 'NODE_CLICK' | 'QUERY_NAVIGATOR' | 'TEMPORAL_RECONSTRUCT' | 'ECOSYSTEM_SYNC';
  projectId?: string;
  queryText?: string;
  groundedEntitiesCount?: number;
  clientIp?: string;
  userAgent?: string;
  latencyMs?: number;
}

export interface EvidenceVerificationEvent {
  projectId: string;
  repositoryName: string;
  commitSha: string;
  artifactPath?: string;
  evidenceType: 'GITHUB_COMMIT' | 'WEBHOOK_HMAC' | 'BUILD_ARTIFACT' | 'SPATIAL_TOPOLOGY';
  signatureValid: boolean;
  verifierVersion?: string;
}

export interface PlatformTelemetryEvent {
  serviceName: string;
  endpoint: string;
  statusCode: number;
  durationMs: number;
  tokensUsed?: number;
  cacheHit?: boolean;
}

class BigQueryStreamingService {
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
        const { BigQuery } = await import('@google-cloud/bigquery' as any).catch(() => ({ BigQuery: null }));
        if (BigQuery) {
          this.bigqueryClient = new BigQuery({
            projectId: process.env.GCP_PROJECT_ID || 'feexsystems-prod',
          });
          this.isBigQueryAvailable = true;
        }
      }
    } catch {
      this.isBigQueryAvailable = false;
    }
  }

  /**
   * Log an interactive World Model graph exploration event
   */
  logWorldModelEvent(event: WorldModelTelemetryEvent): void {
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
  logEvidenceVerification(event: EvidenceVerificationEvent): void {
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
  logPlatformTelemetry(event: PlatformTelemetryEvent): void {
    const row = {
      metric_id: `met_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      service_name: event.serviceName,
      endpoint: event.endpoint,
      status_code: event.statusCode,
      duration_ms: event.durationMs,
      tokens_used: event.tokensUsed || null,
      cache_hit: event.cacheHit ?? null,
      environment: process.env.NODE_ENV || 'development',
    };

    this.enqueue('platform_telemetry', row);
  }

  private enqueue(table: string, row: Record<string, any>): void {
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
  private async flush(): Promise<void> {
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
      const byTable = itemsToFlush.reduce<Record<string, any[]>>((acc, item) => {
        const rows = acc[item.table] ?? [];
        rows.push(item.row);
        acc[item.table] = rows;
        return acc;
      }, {});

      for (const [tableName, rows] of Object.entries(byTable)) {
        await this.bigqueryClient
          .dataset('feexsystems_analytics')
          .table(tableName)
          .insert(rows)
          .catch((err: any) => {
            console.warn(`[BigQueryService] Streaming insert warning (${tableName}):`, err?.message || err);
          });
      }
    } catch (error) {
      console.warn('[BigQueryService] Flush failed:', error);
    }
  }
}

export const bigQueryService = new BigQueryStreamingService();
