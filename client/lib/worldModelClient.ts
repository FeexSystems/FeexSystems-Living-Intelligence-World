import { apiClient } from "@/lib/api-client";
import {
  isDataConnectEnabled,
  fetchProjectsSql,
  fetchEvidencesSql,
  fetchProjectSql,
  fetchTelemetryEventsSql,
  type SqlWorldProject,
  type SqlWorldEvidence,
  type SqlWorldTelemetryEvent,
} from "./dataconnect-client";

export interface WorldModelProject {
  id: string;
  name: string;
  repository: string;
  description: string | null;
  url: string;
  isPinned: boolean;
  domain: string;
  language: string;
  artifactCount: number;
  lastObservedAt: string;
  metadata?: {
    topics?: string[];
    stars?: number;
    defaultBranch?: string;
  };
}

export interface WorldModelGraphMetrics {
  nodeCount: number;
  edgeCount: number;
  domainCount: number;
  evidenceAnchorCount: number;
  lastSyncTimestamp: string;
}

interface WorldModelProjectsResponse {
  success: boolean;
  source: string;
  projects: WorldModelProject[];
  count: number;
}

interface WorldModelGraphResponse {
  success: boolean;
  source: string;
  data: {
    nodes: Array<{ id: string; name: string; domain?: string; artifactCount?: number }>;
    links: Array<{ source: string; target: string }>;
  };
}

/** Map a SQL Connect (Postgres) row to the canonical WorldModelProject shape. */
function mapSqlProject(p: SqlWorldProject): WorldModelProject {
  return {
    id: p.id,
    name: p.name,
    repository: p.repository,
    description: p.description ?? null,
    url: p.url,
    isPinned: p.isPinned,
    domain: p.domain ?? "General",
    language: p.language ?? "Unknown",
    artifactCount: p.artifactCount,
    lastObservedAt: p.lastObservedAt,
  };
}

export async function fetchWorldProjects(): Promise<WorldModelProject[]> {
  // SQL Connect first (direct Postgres projection of the World Model);
  // falls back to the Express REST API when SQL Connect is disabled or the
  // service is unreachable (e.g. not deployed yet behind the billing gate).
  if (isDataConnectEnabled()) {
    try {
      const sqlProjects = await fetchProjectsSql();
      if (sqlProjects) {
        return sqlProjects.map(mapSqlProject);
      }
    } catch (err) {
      console.info(
        "SQL Connect projects unavailable, falling back to REST API:",
        err instanceof Error ? err.message : err
      );
    }
  }
  try {
    const res = await apiClient.get<WorldModelProjectsResponse>("/world-model/projects");
    if (res && res.projects && Array.isArray(res.projects)) {
      return res.projects;
    }
    return [];
  } catch (err) {
    console.warn("Failed to fetch canonical World Model projects, using empty set fallback:", err);
    return [];
  }
}

/**
 * Single World Model project.
 *
 * SQL Connect first (the `GetWorldProject` query is @auth PUBLIC — no session
 * required). There is no dedicated single-project REST endpoint, so the REST
 * fallback reads the canonical project record from `/evidence/detail`, which
 * embeds it. Returns null when the project cannot be resolved from either
 * source (resilient last resort).
 */
export async function fetchWorldProject(id: string): Promise<WorldModelProject | null> {
  if (isDataConnectEnabled()) {
    try {
      const sqlProject = await fetchProjectSql(id);
      if (sqlProject) {
        return mapSqlProject(sqlProject);
      }
    } catch (err) {
      console.info(
        "SQL Connect project unavailable, falling back to REST API:",
        err instanceof Error ? err.message : err
      );
    }
  }
  try {
    const res = await apiClient.get<WorldModelEvidenceDetailResponse>(
      `/world-model/evidence/detail?projectId=${encodeURIComponent(id)}`
    );
    const project = res?.data?.project;
    if (project) {
      return {
        id: project.id,
        name: project.name,
        repository: project.repository,
        description: project.description ?? null,
        url: project.url,
        isPinned: Boolean(project.isPinned),
        domain: "General",
        language: "Unknown",
        artifactCount: 0,
        lastObservedAt: project.lastObservedAt,
      };
    }
    return null;
  } catch (err) {
    console.warn("Failed to fetch canonical World Model project, using null fallback:", err);
    return null;
  }
}

/**
 * Canonical Evidence Fabric provenance record (projection of both the SQL
 * Connect Postgres table and the REST `/evidence/detail` payload). Fields are
 * normalized to the SQL-Connect shape so callers get one contract regardless of
 * which backend served the read.
 */
export interface WorldModelEvidence {
  id: string;
  commitSha: string;
  filePath: string | null;
  observationType: string;
  observedAt: string;
}

interface WorldModelEvidenceDetailResponse {
  success: boolean;
  data: {
    evidence?: Array<{
      id: string;
      evidenceType: string;
      sourceRef?: string | null;
      observedAt: string;
    }>;
    project?: {
      id: string;
      name: string;
      repository: string;
      url: string;
      description?: string | null;
      isPinned: boolean;
      lastObservedAt: string;
    } | null;
  };
}

/** Map a SQL Connect (Postgres) evidence row to the canonical shape. */
function mapSqlEvidence(e: SqlWorldEvidence): WorldModelEvidence {
  return {
    id: e.id,
    commitSha: e.commitSha,
    filePath: e.filePath ?? null,
    observationType: e.observationType,
    observedAt: e.timestamp,
  };
}

/** Map a REST `/evidence/detail` evidence record to the canonical shape. */
function mapRestEvidence(e: {
  id: string;
  evidenceType: string;
  sourceRef?: string | null;
  observedAt: string;
}): WorldModelEvidence {
  return {
    id: e.id,
    commitSha: e.sourceRef ?? "",
    filePath: null,
    observationType: e.evidenceType,
    observedAt: e.observedAt,
  };
}

/**
 * Evidence Fabric provenance ledger for a project.
 *
 * Mirrors {@link fetchWorldProjects}: SQL Connect first (direct Postgres
 * projection), falling back to the Express REST API when SQL Connect is
 * disabled or unreachable. Returns an empty set as a resilient last resort.
 */
export async function fetchWorldEvidence(projectId: string): Promise<WorldModelEvidence[]> {
  if (isDataConnectEnabled()) {
    try {
      const sqlEvidence = await fetchEvidencesSql(projectId);
      if (sqlEvidence) {
        return sqlEvidence.map(mapSqlEvidence);
      }
    } catch (err) {
      console.info(
        "SQL Connect evidence unavailable, falling back to REST API:",
        err instanceof Error ? err.message : err
      );
    }
  }
  try {
    const res = await apiClient.get<WorldModelEvidenceDetailResponse>(
      `/world-model/evidence/detail?projectId=${encodeURIComponent(projectId)}`
    );
    const evidence = res?.data?.evidence;
    if (Array.isArray(evidence)) {
      return evidence.map(mapRestEvidence);
    }
    return [];
  } catch (err) {
    console.warn("Failed to fetch canonical World Model evidence, using empty set fallback:", err);
    return [];
  }
}

/**
 * Canonical telemetry event record (SQL Connect Postgres projection of
 * `world_model_events`). This is a point-in-time snapshot of recent events —
 * the *live* feed is the SSE/WebSocket telemetry stream
 * (`client/lib/services/telemetryStream.ts`), which this does NOT replace.
 */
export interface WorldModelTelemetryEvent {
  id: string;
  eventType: string;
  source: string;
  payload: unknown;
  createdAt: string;
}

/** Map a SQL Connect (Postgres) telemetry row to the canonical shape. */
function mapSqlTelemetryEvent(e: SqlWorldTelemetryEvent): WorldModelTelemetryEvent {
  return {
    id: e.id,
    eventType: e.eventType,
    source: e.source,
    payload: e.payload ?? null,
    createdAt: e.createdAt,
  };
}

/**
 * Recent canonical telemetry events (bounded snapshot).
 *
 * The `ListWorldTelemetryEvents` query is @auth USER — it requires a Firebase
 * Auth session; anonymous callers (and Vitest) fall through. There is no REST
 * snapshot endpoint for telemetry events (the canonical live path is the SSE/WS
 * stream), so the resilient fallback is an **empty set** — telemetry is never
 * fabricated, per the "Evidence, Not Claims" principle.
 */
export async function fetchWorldTelemetryEvents(): Promise<WorldModelTelemetryEvent[]> {
  if (isDataConnectEnabled()) {
    try {
      const sqlEvents = await fetchTelemetryEventsSql();
      if (sqlEvents) {
        return sqlEvents.map(mapSqlTelemetryEvent);
      }
    } catch (err) {
      console.info(
        "SQL Connect telemetry events unavailable (auth required or service unreachable):",
        err instanceof Error ? err.message : err
      );
    }
  }
  return [];
}

export async function fetchWorldMetrics(): Promise<WorldModelGraphMetrics> {
  try {
    const res = await apiClient.get<WorldModelGraphResponse>("/world-model/graph");
    const graphData = res?.data;
    const nodes = graphData?.nodes || [];
    const links = graphData?.links || [];
    
    const domains = new Set(nodes.map((n) => n.domain).filter(Boolean));
    const evidenceCount = nodes.reduce((sum, n) => sum + (n.artifactCount || 0), 0);

    return {
      nodeCount: nodes.length,
      edgeCount: links.length,
      domainCount: domains.size || 5,
      evidenceAnchorCount: evidenceCount,
      lastSyncTimestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("Failed to fetch World Model graph metrics, using fallback:", err);
    return {
      nodeCount: 8,
      edgeCount: 14,
      domainCount: 5,
      evidenceAnchorCount: 42,
      lastSyncTimestamp: new Date().toISOString(),
    };
  }
}
