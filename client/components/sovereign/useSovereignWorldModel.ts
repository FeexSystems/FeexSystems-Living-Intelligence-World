/**
 * useSovereignWorldModel — grounds the Sovereign Engine in the canonical World Model.
 *
 * CANONICAL PRINCIPLE #1 (Canonical Data + Model Reasoning):
 * The database-backed World Model is authoritative. This hook fetches canonical
 * state and projects it onto the Feex world catalog; it never invents facts.
 *
 * CANONICAL PRINCIPLE #8 (Non-Blocking Infrastructure Initialization):
 * Every fetch failure degrades to a clearly-labeled offline state. The engine
 * always renders — it never blocks on a database or external service.
 *
 * Grounding contract exposed to the UI:
 *   "live"      — canonical endpoints answered; metrics marked `canonical` are real
 *   "partial"   — graph answered but maintenance/providers did not
 *   "fixture"   — nothing answered; ALL canonical metrics render as "—"
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CANONICAL_FEEX_WORLDS,
  resolveWorldForProject,
  type FeexWorld,
  type WorldMetric,
} from "@/data/feexWorlds";

/** How much of the engine's state is backed by canonical data. */
export type GroundingLevel = "live" | "partial" | "fixture";

/** One World Model project record as returned by GET /api/world-model/graph. */
interface GraphProjectNode {
  id: string;
  name: string;
  type: string;
  repository?: string | null;
  description?: string | null;
  url?: string | null;
  isPinned?: boolean;
  artifactCount?: number;
  domain?: string;
  language?: string;
  lastObservedAt?: string;
}

export interface GroundedWorld extends FeexWorld {
  /** Canonical artifact count when the World Model reports it, else null. */
  artifactCount: number | null;
  /** Canonical last-observed timestamp, else null. */
  lastObservedAt: string | null;
  /** True when this world has a matching row in the canonical World Model. */
  canonical: boolean;
  /** Metrics after canonical values have been merged in. */
  resolvedMetrics: WorldMetric[];
}

export interface WorldModelStatus {
  /** Which LLM providers are configured (from /providers/status). */
  providers: {
    gemini: boolean;
    openai: boolean;
    anthropic: boolean;
    default: string;
    geminiModel: string;
  } | null;
  /** Canonical timestamps for the last maintenance run, else null. */
  maintenance: {
    running: boolean;
    lastRunAt: string | null;
  } | null;
}

export interface SovereignWorldModelState {
  worlds: GroundedWorld[];
  links: Array<{ id: string; source: string; target: string; relation: string }>;
  /** Count of canonical projects — the honest replacement for the old "8" badge. */
  canonicalProjectCount: number;
  totalArtifacts: number;
  grounding: GroundingLevel;
  status: WorldModelStatus;
  loading: boolean;
  refresh: () => Promise<void>;
}

/** Extracts the maintenance `finishedAt` from an unknown-typed API payload. */
function readLastRunAt(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const lastRun = (payload as { lastRun?: unknown }).lastRun;
  if (!lastRun || typeof lastRun !== "object") return null;
  const finishedAt = (lastRun as { finishedAt?: unknown }).finishedAt;
  return typeof finishedAt === "string" ? finishedAt : null;
}

/**
 * Merges canonical World Model values onto a world's metric list.
 *
 * Canonical metrics are replaced with measured values when available and set to
 * `null` otherwise — the UI renders "—" for a null value, so an ungrounded
 * engine can never display a plausible-looking invented number.
 */
function mergeMetrics(
  world: FeexWorld,
  artifactCount: number | null,
  lastObservedAt: string | null,
  canonical: boolean
): WorldMetric[] {
  const merged: WorldMetric[] = world.metrics
    .filter((m) => m.label !== "artifacts" && m.label !== "last_observed")
    .map((metric) => {
      if (metric.source !== "canonical") return metric;
      if (metric.label === "status") {
        return { ...metric, value: canonical ? world.statusLabel : null };
      }
      return { ...metric, value: canonical ? metric.value : null };
    });

  merged.push({
    label: "artifacts",
    value: artifactCount === null ? null : String(artifactCount),
    source: "canonical",
  });

  if (lastObservedAt) {
    merged.push({
      label: "last_observed",
      value: new Date(lastObservedAt).toLocaleDateString(),
      source: "canonical",
    });
  }

  return merged;
}

/**
 * Fetches canonical World Model state and projects it onto the Feex world catalog.
 */
export function useSovereignWorldModel(): SovereignWorldModelState {
  const [projectNodes, setProjectNodes] = useState<GraphProjectNode[]>([]);
  const [links, setLinks] = useState<SovereignWorldModelState["links"]>([]);
  const [providers, setProviders] = useState<WorldModelStatus["providers"]>(null);
  const [maintenance, setMaintenance] = useState<WorldModelStatus["maintenance"]>(null);
  const [loading, setLoading] = useState(true);
  const [graphOk, setGraphOk] = useState(false);
  const [statusOk, setStatusOk] = useState(false);
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);

    const [graphResult, maintenanceResult, providerResult] = await Promise.allSettled([
      fetch("/api/world-model/graph").then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(`graph ${res.status}`))
      ),
      fetch("/api/world-model/maintenance/status").then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(`maintenance ${res.status}`))
      ),
      fetch("/api/world-model/providers/status").then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(`providers ${res.status}`))
      ),
    ]);

    if (cancelledRef.current) return;

    // ── Canonical graph (projects + typed relationship edges) ──────────────
    if (graphResult.status === "fulfilled" && graphResult.value?.success && graphResult.value.data) {
      const data = graphResult.value.data as {
        nodes?: GraphProjectNode[];
        links?: SovereignWorldModelState["links"];
      };
      setProjectNodes((data.nodes ?? []).filter((n) => n.type === "project"));
      setLinks(Array.isArray(data.links) ? data.links : []);
      setGraphOk(true);
    } else {
      setProjectNodes([]);
      setLinks([]);
      setGraphOk(false);
    }

    // ── Maintenance + provider status ─────────────────────────────────────
    const maintenanceData =
      maintenanceResult.status === "fulfilled" && maintenanceResult.value?.success
        ? maintenanceResult.value.data
        : null;

    const providerData =
      providerResult.status === "fulfilled" && providerResult.value?.success
        ? providerResult.value.data
        : null;

    setMaintenance(
      maintenanceData
        ? {
            running: Boolean(maintenanceData.running),
            lastRunAt: readLastRunAt(maintenanceData),
          }
        : null
    );
    setProviders(providerData ?? null);
    setStatusOk(Boolean(maintenanceData) && Boolean(providerData));

    setLoading(false);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    refresh();
    return () => {
      cancelledRef.current = true;
    };
  }, [refresh]);

  const grounding: GroundingLevel = graphOk && statusOk ? "live" : graphOk || statusOk ? "partial" : "fixture";

  const worlds = useMemo<GroundedWorld[]>(() => {
    return CANONICAL_FEEX_WORLDS.map((world) => {
      const match = world.repo
        ? projectNodes.find((p) => p.repository?.toLowerCase() === world.repo?.toLowerCase())
        : undefined;

      const canonical = Boolean(match);
      const artifactCount =
        canonical && typeof match?.artifactCount === "number" ? match.artifactCount : null;
      const lastObservedAt = canonical ? match?.lastObservedAt ?? null : null;

      return {
        ...world,
        canonical,
        artifactCount,
        lastObservedAt,
        resolvedMetrics: mergeMetrics(world, artifactCount, lastObservedAt, canonical),
      };
    });
  }, [projectNodes]);

  const canonicalProjectCount = useMemo(
    () => worlds.filter((w) => w.canonical).length,
    [worlds]
  );

  const totalArtifacts = useMemo(
    () => worlds.reduce((sum, w) => sum + (w.artifactCount ?? 0), 0),
    [worlds]
  );

  return {
    worlds,
    links,
    canonicalProjectCount,
    totalArtifacts,
    grounding,
    status: { providers, maintenance },
    loading,
    refresh,
  };
}

/**
 * Resolves the canonical world backing a lightweight project-like record.
 * Re-exported here so engine consumers import from a single module.
 */
export { resolveWorldForProject };
