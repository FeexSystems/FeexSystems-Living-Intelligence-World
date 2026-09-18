import { Router, Request, Response } from "express";
import { prisma } from "../lib/database";

/**
 * Canonical World Model telemetry stream (SSE).
 *
 * Streams REAL WorldModelEvent ledger rows (world_model_events) to the
 * client HUD so the Feex Sovereign Engine never has to fabricate evidence.
 *
 * Contract (aligned with client/components/sovereign/useProductionServerTelemetry.ts):
 *   data: { msg, serverIndex, hexColor, timestamp, simulated: false }
 *
 * Non-blocking by design: every DB failure degrades to a closed stream and the
 * client falls back to its clearly-labeled procedural feed. Never blocks
 * readiness checks or server startup.
 */
const router = Router();

interface WorldModelEventRow {
  id: string;
  project_id: string | null;
  event_type: string;
  commit_sha: string | null;
  payload: unknown;
  occurred_at: Date | string;
}

interface RenderStyle {
  serverIndex: number;
  hexColor: string;
}

const EVENT_RENDER: Record<string, RenderStyle> = {
  github_webhook: { serverIndex: 0, hexColor: "#38bdf8" },
  repository_sync: { serverIndex: 1, hexColor: "#00ffaa" },
  incremental_sync: { serverIndex: 1, hexColor: "#00ffaa" },
  evidence_notarized: { serverIndex: 0, hexColor: "#c084fc" },
};

const FALLBACK_RENDER: RenderStyle = { serverIndex: 2, hexColor: "#c084fc" };

function renderStyleFor(eventType: string): RenderStyle {
  return EVENT_RENDER[eventType] ?? FALLBACK_RENDER;
}

/** Build the HUD line from REAL ledger data only — no invented SHAs, no invented claims. */
function summarizeEvent(row: WorldModelEventRow): string {
  const project = row.project_id ?? "world";
  const sha = typeof row.commit_sha === "string" && row.commit_sha.length >= 7 ? row.commit_sha.slice(0, 7) : null;

  switch (row.event_type) {
    case "github_webhook":
      return `» CANONICAL: GitHub webhook commit ${sha ?? "pending"} ingested → project ${project}`;
    case "repository_sync":
      return `» CANONICAL: Repository sync notarized for project ${project}`;
    case "incremental_sync": {
      const payload = row.payload as { changedPaths?: unknown } | unknown[] | null;
      const pathList = Array.isArray(payload) ? payload : Array.isArray(payload?.changedPaths) ? (payload.changedPaths as unknown[]) : null;
      return `» CANONICAL: Incremental sync on ${project}${pathList ? ` — ${pathList.length} paths observed` : ""}`;
    }
    default:
      return `» CANONICAL: ${row.event_type} recorded on project ${project}`;
  }
}

function toTelemetryFrame(row: WorldModelEventRow) {
  const style = renderStyleFor(row.event_type);
  return {
    msg: summarizeEvent(row),
    serverIndex: style.serverIndex,
    hexColor: style.hexColor,
    timestamp:
      new Date(row.occurred_at as string | Date).toISOString().substring(11, 19),
    simulated: false,
  };
}

const POLL_INTERVAL_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 25000;
const TAIL_LIMIT = 12;
const MAX_BURST_PER_POLL = 3;

router.get("/stream", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const sentIds = new Set<string>();
  let closed = false;

  const send = (payload: unknown) => {
    if (closed) return;
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      closed = true;
    }
  };

  const pollOnce = async () => {
    if (closed) return;
    try {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT id, project_id, event_type, commit_sha, payload, occurred_at
         FROM world_model_events
         ORDER BY occurred_at DESC
         LIMIT ${TAIL_LIMIT}`
      )) as WorldModelEventRow[];

      let emitted = 0;
      for (const row of rows) {
        if (sentIds.has(row.id) || emitted >= MAX_BURST_PER_POLL) continue;
        sentIds.add(row.id);
        send(toTelemetryFrame(row));
        emitted++;
      }

      // Bound memory on long-lived connections
      if (sentIds.size > 200) {
        const recent = new Set(rows.map((r) => r.id));
        sentIds.clear();
        recent.forEach((id) => sentIds.add(id));
      }
    } catch (err) {
      // Canonical source unreachable (DB down / tables not provisioned yet):
      // end the stream so the client's resilient procedural fallback takes over.
      console.warn(
        "⚠️ [telemetry-stream] Canonical event source unavailable, closing stream:",
        err instanceof Error ? err.message : err
      );
      closed = true;
      res.end();
    }
  };

  // Prime the connection with the most recent real events
  await pollOnce();

  const pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
  const heartbeatTimer = setInterval(() => {
    if (closed) return;
    try {
      res.write(": keepalive\n\n");
    } catch {
      closed = true;
    }
  }, HEARTBEAT_INTERVAL_MS);

  req.on("close", () => {
    closed = true;
    clearInterval(pollTimer);
    clearInterval(heartbeatTimer);
  });
});

export default router;