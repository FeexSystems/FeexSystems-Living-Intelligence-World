/**
 * Autonomous World Model maintenance — re-sync, re-embed, orphan cleanup.
 * Safe to run on a cron / Bull interval.
 */

import { prisma } from "../database";
import { syncPinnedProjects, ensureWorldModelTables } from "./github-pinned.service";
import { reindexWorldModelEmbeddings, ensureEmbeddingTables } from "./embedding.service";

export interface MaintenanceReport {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  steps: Array<{ name: string; ok: boolean; detail?: unknown; error?: string }>;
}

let lastRun: MaintenanceReport | null = null;
let running = false;
let timer: ReturnType<typeof setInterval> | null = null;

export function getLastMaintenanceReport() {
  return lastRun;
}

export function isMaintenanceRunning() {
  return running;
}

async function cleanupOrphanRelationships(): Promise<number> {
  // Relationships whose source/target no longer exist as project or tech ids
  try {
    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM world_model_relationships r
      WHERE NOT EXISTS (
        SELECT 1 FROM world_model_projects p WHERE p.id = r.source_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM world_model_technologies t WHERE t.id = r.source_id
      )
    `);
    return typeof result === "number" ? result : 0;
  } catch {
    return 0;
  }
}

async function cleanupOrphanEvidence(): Promise<number> {
  try {
    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM world_model_evidence e
      WHERE NOT EXISTS (
        SELECT 1 FROM world_model_projects p WHERE p.id = e.project_id
      )
    `);
    return typeof result === "number" ? result : 0;
  } catch {
    return 0;
  }
}

async function trimOldEvents(keepDays = 90): Promise<number> {
  try {
    const result = await prisma.$executeRawUnsafe(
      `
      DELETE FROM world_model_events
      WHERE occurred_at < NOW() - ($1::text || ' days')::interval
      `,
      String(keepDays)
    );
    return typeof result === "number" ? result : 0;
  } catch {
    return 0;
  }
}

export async function runWorldModelMaintenance(opts?: {
  skipSync?: boolean;
  skipEmbed?: boolean;
  eventRetentionDays?: number;
}): Promise<MaintenanceReport> {
  if (running) {
    return (
      lastRun || {
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 0,
        steps: [{ name: "guard", ok: false, error: "already running" }],
      }
    );
  }

  running = true;
  const startedAt = new Date();
  const steps: MaintenanceReport["steps"] = [];

  try {
    await ensureWorldModelTables();
    steps.push({ name: "ensure_tables", ok: true });

    if (!opts?.skipSync) {
      try {
        const projects = await syncPinnedProjects();
        steps.push({
          name: "sync_pinned",
          ok: true,
          detail: { count: Array.isArray(projects) ? projects.length : 0 },
        });
      } catch (e) {
        steps.push({
          name: "sync_pinned",
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    if (!opts?.skipEmbed) {
      try {
        await ensureEmbeddingTables();
        const emb = await reindexWorldModelEmbeddings();
        steps.push({ name: "reindex_embeddings", ok: !emb.skipped, detail: emb });
      } catch (e) {
        steps.push({
          name: "reindex_embeddings",
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    try {
      const n = await cleanupOrphanRelationships();
      steps.push({ name: "cleanup_orphan_relationships", ok: true, detail: { deleted: n } });
    } catch (e) {
      steps.push({
        name: "cleanup_orphan_relationships",
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const n = await cleanupOrphanEvidence();
      steps.push({ name: "cleanup_orphan_evidence", ok: true, detail: { deleted: n } });
    } catch (e) {
      steps.push({
        name: "cleanup_orphan_evidence",
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const n = await trimOldEvents(opts?.eventRetentionDays ?? 90);
      steps.push({ name: "trim_old_events", ok: true, detail: { deleted: n } });
    } catch (e) {
      steps.push({
        name: "trim_old_events",
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  } finally {
    running = false;
  }

  const finishedAt = new Date();
  lastRun = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    steps,
  };
  return lastRun;
}

/** Start interval maintenance (hours). No-op if already scheduled. */
export function startWorldModelMaintenanceScheduler() {
  const hours = Number(process.env.WORLD_MODEL_MAINTENANCE_HOURS || 0);
  if (!hours || hours <= 0) {
    console.log("[wm-maintenance] scheduler disabled (set WORLD_MODEL_MAINTENANCE_HOURS>0)");
    return;
  }
  if (timer) return;
  const ms = hours * 60 * 60 * 1000;
  console.log(`[wm-maintenance] scheduling every ${hours}h`);
  timer = setInterval(() => {
    runWorldModelMaintenance().catch((e) =>
      console.warn("[wm-maintenance] scheduled run failed:", e)
    );
  }, ms);
  timer.unref();
  
  // Optional immediate run after delay
  if (process.env.WORLD_MODEL_MAINTENANCE_ON_BOOT === "true") {
    setTimeout(() => {
      runWorldModelMaintenance().catch((e) =>
        console.warn("[wm-maintenance] boot run failed:", e)
      );
    }, 15_000).unref();
  }
}

export function stopWorldModelMaintenanceScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
