/**
 * FeexSystems — Firebase SQL Connect (Data Connect) client layer.
 *
 * Direct-to-Postgres reads/writes via the generated connector SDK
 * (`client/lib/dataconnect`, package `@feexsystems/dataconnect`). SQL Connect is
 * used opportunistically against the REST projection: callers (see
 * `worldModelClient.ts`) try this layer first and fall back to the Express API
 * when the SQL Connect service is unreachable (not yet deployed / billing
 * gate) — preserving the "browser as projection, server state canonical"
 * invariant either way.
 *
 * Modes (env):
 *   VITE_DATACONNECT=auto|on|production  → deployed SQL Connect service (default)
 *   VITE_DATACONNECT=emulator            → local emulator (localhost:9399)
 *   VITE_DATACONNECT_EMULATOR=true       → same as above
 *   VITE_DATACONNECT=off                 → fully disabled (REST only)
 * Vitest runs (import.meta.env.MODE === 'test') are always disabled so unit
 * tests stay deterministic and offline.
 */
import './firebase'; // side-effect: initializes the default Firebase App required by getDataConnect
import { getDataConnect, connectDataConnectEmulator, type DataConnect } from 'firebase/data-connect';
import {
  connectorConfig,
  listWorldProjects,
  getWorldProject,
  listWorldEvidences,
  listWorldTelemetryEvents,
  upsertWorldProject,
  insertWorldEvidence,
  recordTelemetryEvent,
  type ListWorldProjectsData,
  type ListWorldEvidencesData,
  type ListWorldTelemetryEventsData,
  type UpsertWorldProjectVariables,
  type InsertWorldEvidenceVariables,
  type RecordTelemetryEventVariables,
} from './dataconnect';

export type DataConnectMode = 'production' | 'emulator' | 'disabled';

const EMULATOR_HOST = 'localhost';
const EMULATOR_PORT = 9399;

export function getDataConnectMode(): DataConnectMode {
  if (import.meta.env.MODE === 'test') return 'disabled';
  const raw = String(import.meta.env.VITE_DATACONNECT ?? 'auto').toLowerCase();
  if (raw === 'off' || raw === 'false' || raw === 'disabled') return 'disabled';
  if (raw === 'emulator' || import.meta.env.VITE_DATACONNECT_EMULATOR === 'true') return 'emulator';
  return 'production';
}

export function isDataConnectEnabled(): boolean {
  return getDataConnectMode() !== 'disabled';
}

let dcInstance: DataConnect | null = null;
let emulatorConnected = false;

/** Lazily create the DataConnect instance (emulator wired when in emulator mode). */
export function getDataConnectClient(): DataConnect {
  if (!dcInstance) {
    dcInstance = getDataConnect(connectorConfig);
    if (getDataConnectMode() === 'emulator' && !emulatorConnected) {
      connectDataConnectEmulator(dcInstance, EMULATOR_HOST, EMULATOR_PORT);
      emulatorConnected = true;
    }
  }
  return dcInstance;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export type SqlWorldProject = ListWorldProjectsData['worldProjects'][number];
export type SqlWorldEvidence = ListWorldEvidencesData['worldEvidences'][number];

export async function fetchProjectsSql(): Promise<SqlWorldProject[]> {
  const { data } = await listWorldProjects(getDataConnectClient());
  return data.worldProjects;
}

export async function fetchProjectSql(id: string): Promise<ListWorldProjectsData['worldProjects'][number] | null> {
  const { data } = await getWorldProject(getDataConnectClient(), { id });
  return data.worldProject ?? null;
}

export async function fetchEvidencesSql(projectId: string): Promise<ListWorldEvidencesData['worldEvidences']> {
  const { data } = await listWorldEvidences(getDataConnectClient(), { projectId });
  return data.worldEvidences;
}

export async function fetchTelemetryEventsSql(): Promise<ListWorldTelemetryEventsData['worldTelemetryEvents']> {
  const { data } = await listWorldTelemetryEvents(getDataConnectClient());
  return data.worldTelemetryEvents;
}

// ── Mutations (USER-level @auth — require a Firebase Auth session; the web SDK
// attaches the ID token automatically when the user is signed in) ────────────

export async function upsertProjectSql(vars: UpsertWorldProjectVariables) {
  const { data } = await upsertWorldProject(getDataConnectClient(), vars);
  return data.worldProject_upsert;
}

export async function insertEvidenceSql(vars: InsertWorldEvidenceVariables) {
  const { data } = await insertWorldEvidence(getDataConnectClient(), vars);
  return data.worldEvidence_insert;
}

export async function recordTelemetryEventSql(vars: RecordTelemetryEventVariables) {
  const { data } = await recordTelemetryEvent(getDataConnectClient(), vars);
  return data.worldTelemetryEvent_insert;
}

export { connectorConfig };
