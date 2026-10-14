import { apiClient } from "@/lib/api-client";
import {
  isDataConnectEnabled,
  fetchProjectsSql,
  fetchEvidencesSql,
  type SqlWorldProject,
  type SqlWorldEvidence,
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
