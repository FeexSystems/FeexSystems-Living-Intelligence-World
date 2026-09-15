 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Autonomous World Model maintenance — re-sync, re-embed, orphan cleanup.
 * Safe to run on a cron / Bull interval.
 */

import { prisma } from "../database";
import { syncPinnedProjects, ensureWorldModelTables } from "./github-pinned.service";
import { reindexWorldModelEmbeddings, ensureEmbeddingTables } from "./embedding.service";








let lastRun = null;
let running = false;
let timer = null;

export function getLastMaintenanceReport() {
  return lastRun;
}

export function isMaintenanceRunning() {
  return running;
}

async function cleanupOrphanRelationships() {
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
  } catch (e2) {
    return 0;
  }
}

async function cleanupOrphanEvidence() {
  try {
    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM world_model_evidence e
      WHERE NOT EXISTS (
        SELECT 1 FROM world_model_projects p WHERE p.id = e.project_id
      )
    `);
    return typeof result === "number" ? result : 0;
  } catch (e3) {
    return 0;
  }
}

async function trimOldEvents(keepDays = 90) {
  try {
    const result = await prisma.$executeRawUnsafe(
      `
      DELETE FROM world_model_events
      WHERE occurred_at < NOW() - ($1::text || ' days')::interval
      `,
      String(keepDays)
    );
    return typeof result === "number" ? result : 0;
  } catch (e4) {
    return 0;
  }
}

export async function runWorldModelMaintenance(opts



) {
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
  const steps = [];

  try {
    await ensureWorldModelTables();
    steps.push({ name: "ensure_tables", ok: true });

    if (!_optionalChain([opts, 'optionalAccess', _ => _.skipSync])) {
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

    if (!_optionalChain([opts, 'optionalAccess', _2 => _2.skipEmbed])) {
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
      const n = await trimOldEvents(_nullishCoalesce(_optionalChain([opts, 'optionalAccess', _3 => _3.eventRetentionDays]), () => ( 90)));
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
  // Optional immediate run after delay
  if (process.env.WORLD_MODEL_MAINTENANCE_ON_BOOT === "true") {
    setTimeout(() => {
      runWorldModelMaintenance().catch((e) =>
        console.warn("[wm-maintenance] boot run failed:", e)
      );
    }, 15000);
  }
}

export function stopWorldModelMaintenanceScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
