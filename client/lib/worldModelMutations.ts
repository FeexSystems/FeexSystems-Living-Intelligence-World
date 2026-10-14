/**
 * FeexSystems — Canonical World Model WRITE paths (SQL Connect mutations).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  ARCHITECTURAL GUARDRAIL — READ BEFORE WIRING ANY CALLER
 * ─────────────────────────────────────────────────────────────────────────────
 * Unlike the read helpers in `worldModelClient.ts` (safe projections with a
 * REST fallback), these functions MUTATE the canonical World Model directly in
 * Postgres. They deliberately have **no REST fallback** and **no silent
 * failure** — a canonical write either succeeds or throws loudly. This protects
 * two core invariants:
 *
 *   1. "Canonical Data + Model Reasoning" — the server remains the source of
 *      truth. The server's own write paths (`syncRepository`, the GitHub
 *      webhook receiver, `/sync/github-pinned`) are HEAVILY orchestrated: they
 *      call the GitHub API, compute real commit SHAs, reindex embeddings, and
 *      emit `world_model_events`. A raw client upsert BYPASSES all of that.
 *      → Prefer the server REST endpoints for any workflow that discovers or
 *        verifies real evidence. These client mutations are for explicitly
 *        operator-driven, already-verified edits only.
 *
 *   2. "Evidence, Not Claims" — `insertWorldEvidence` anchors a provenance
 *      record. It MUST carry a REAL, server-verified commit SHA / file path.
 *      Never fabricate evidence to satisfy the schema.
 *
 * Auth: all three mutations are `@auth(level: USER)` — the Firebase web SDK
 * attaches the signed-in user's ID token automatically. `@auth USER` proves a
 * session exists; it does NOT assert an admin role. Callers MUST enforce role
 * (e.g. via `useFirebaseAuth().user?.role === 'ADMIN'`) before invoking a write.
 *
 * Every function here first asserts an active Firebase session and enabled SQL
 * Connect, then delegates to `dataconnect-client.ts`. It throws a descriptive
 * error otherwise (never a fabricated success).
 */
import { firebaseAuth } from './firebase';
import {
  isDataConnectEnabled,
  upsertProjectSql,
  insertEvidenceSql,
  recordTelemetryEventSql,
  type UpsertWorldProjectVariables,
  type InsertWorldEvidenceVariables,
  type RecordTelemetryEventVariables,
} from './dataconnect-client';

/**
 * Precondition shared by every write:
 *  - SQL Connect must be enabled (Vitest / `VITE_DATACONNECT=off` disable it).
 *  - A Firebase user must be signed in (`@auth USER` requirement). In Vitest the
 *    Firebase app never authenticates, so this throws and no network write is
 *    attempted — writes are never exercised against a real Postgres by tests.
 */
function assertWritable(operation: string): void {
  if (!isDataConnectEnabled()) {
    throw new Error(
      `[${operation}] SQL Connect is disabled — canonical writes are not available. ` +
        `Set VITE_DATACONNECT=production (or emulator) and sign in to perform writes.`
    );
  }
  const user = firebaseAuth?.currentUser;
  if (!user) {
    throw new Error(
      `[${operation}] Requires an authenticated Firebase session (@auth USER). ` +
        `Sign in before mutating the canonical World Model.`
    );
  }
}

/**
 * Upsert a canonical World Model project.
 *
 * ⚠️ Prefer the server `/sync/github-pinned` route for anything that must
 * discover or verify real repository evidence — this raw upsert does not call
 * GitHub, compute SHAs, reindex embeddings, or emit events. Operator use only,
 * and the caller must gate on an admin role.
 */
export async function upsertWorldProject(vars: UpsertWorldProjectVariables): Promise<{ id: string }> {
  assertWritable('upsertWorldProject');
  return upsertProjectSql(vars);
}

/**
 * Anchor an Evidence Fabric provenance record.
 *
 * ⚠️ "Evidence, Not Claims": `commitSha` MUST be a real, verified commit SHA and
 * `filePath` a real path. Never fabricate evidence to satisfy the schema.
 * Caller must gate on an admin role.
 */
export async function insertWorldEvidence(vars: InsertWorldEvidenceVariables): Promise<{ id: string }> {
  assertWritable('insertWorldEvidence');
  return insertEvidenceSql(vars);
}

/**
 * Record a canonical telemetry event into `world_model_events`.
 *
 * This is the WRITE counterpart to `fetchWorldTelemetryEvents` (the read
 * snapshot). It does NOT replace the live SSE/WebSocket telemetry stream — it
 * persists a discrete canonical event. Caller must gate on an authenticated
 * role appropriate to emitting telemetry.
 */
export async function recordWorldTelemetryEvent(vars: RecordTelemetryEventVariables): Promise<{ id: string }> {
  assertWritable('recordWorldTelemetryEvent');
  return recordTelemetryEventSql(vars);
}
