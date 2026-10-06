import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface GetWorldProjectData {
  worldProject?: {
    id: string;
    name: string;
    repository: string;
    owner: string;
    url: string;
    description?: string | null;
    isPinned: boolean;
    lastObservedAt: TimestampString;
  } & WorldProject_Key;
}

export interface GetWorldProjectVariables {
  id: string;
}

export interface InsertWorldEvidenceData {
  worldEvidence_insert: WorldEvidence_Key;
}

export interface InsertWorldEvidenceVariables {
  projectId: string;
  commitSha: string;
  filePath?: string | null;
  observationType: string;
}

export interface ListWorldEvidencesData {
  worldEvidences: ({
    id: UUIDString;
    commitSha: string;
    filePath?: string | null;
    observationType: string;
    timestamp: TimestampString;
  } & WorldEvidence_Key)[];
}

export interface ListWorldEvidencesVariables {
  projectId: string;
}

export interface ListWorldProjectsData {
  worldProjects: ({
    id: string;
    name: string;
    repository: string;
    owner: string;
    url: string;
    description?: string | null;
    isPinned: boolean;
    lastObservedAt: TimestampString;
  } & WorldProject_Key)[];
}

export interface ListWorldTelemetryEventsData {
  worldTelemetryEvents: ({
    id: UUIDString;
    eventType: string;
    source: string;
    payload?: unknown | null;
    createdAt: TimestampString;
  } & WorldTelemetryEvent_Key)[];
}

export interface RecordTelemetryEventData {
  worldTelemetryEvent_insert: WorldTelemetryEvent_Key;
}

export interface RecordTelemetryEventVariables {
  eventType: string;
  source: string;
  payload?: unknown | null;
}

export interface UpsertWorldProjectData {
  worldProject_upsert: WorldProject_Key;
}

export interface UpsertWorldProjectVariables {
  id: string;
  name: string;
  repository: string;
  owner: string;
  url: string;
  description?: string | null;
  isPinned?: boolean | null;
}

export interface WorldEvidence_Key {
  id: UUIDString;
  __typename?: 'WorldEvidence_Key';
}

export interface WorldProject_Key {
  id: string;
  __typename?: 'WorldProject_Key';
}

export interface WorldTelemetryEvent_Key {
  id: UUIDString;
  __typename?: 'WorldTelemetryEvent_Key';
}

interface UpsertWorldProjectRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertWorldProjectVariables): MutationRef<UpsertWorldProjectData, UpsertWorldProjectVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertWorldProjectVariables): MutationRef<UpsertWorldProjectData, UpsertWorldProjectVariables>;
  operationName: string;
}
export const upsertWorldProjectRef: UpsertWorldProjectRef;

export function upsertWorldProject(vars: UpsertWorldProjectVariables): MutationPromise<UpsertWorldProjectData, UpsertWorldProjectVariables>;
export function upsertWorldProject(dc: DataConnect, vars: UpsertWorldProjectVariables): MutationPromise<UpsertWorldProjectData, UpsertWorldProjectVariables>;

interface InsertWorldEvidenceRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertWorldEvidenceVariables): MutationRef<InsertWorldEvidenceData, InsertWorldEvidenceVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertWorldEvidenceVariables): MutationRef<InsertWorldEvidenceData, InsertWorldEvidenceVariables>;
  operationName: string;
}
export const insertWorldEvidenceRef: InsertWorldEvidenceRef;

export function insertWorldEvidence(vars: InsertWorldEvidenceVariables): MutationPromise<InsertWorldEvidenceData, InsertWorldEvidenceVariables>;
export function insertWorldEvidence(dc: DataConnect, vars: InsertWorldEvidenceVariables): MutationPromise<InsertWorldEvidenceData, InsertWorldEvidenceVariables>;

interface RecordTelemetryEventRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: RecordTelemetryEventVariables): MutationRef<RecordTelemetryEventData, RecordTelemetryEventVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: RecordTelemetryEventVariables): MutationRef<RecordTelemetryEventData, RecordTelemetryEventVariables>;
  operationName: string;
}
export const recordTelemetryEventRef: RecordTelemetryEventRef;

export function recordTelemetryEvent(vars: RecordTelemetryEventVariables): MutationPromise<RecordTelemetryEventData, RecordTelemetryEventVariables>;
export function recordTelemetryEvent(dc: DataConnect, vars: RecordTelemetryEventVariables): MutationPromise<RecordTelemetryEventData, RecordTelemetryEventVariables>;

interface ListWorldProjectsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListWorldProjectsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListWorldProjectsData, undefined>;
  operationName: string;
}
export const listWorldProjectsRef: ListWorldProjectsRef;

export function listWorldProjects(options?: ExecuteQueryOptions): QueryPromise<ListWorldProjectsData, undefined>;
export function listWorldProjects(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListWorldProjectsData, undefined>;

interface GetWorldProjectRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetWorldProjectVariables): QueryRef<GetWorldProjectData, GetWorldProjectVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetWorldProjectVariables): QueryRef<GetWorldProjectData, GetWorldProjectVariables>;
  operationName: string;
}
export const getWorldProjectRef: GetWorldProjectRef;

export function getWorldProject(vars: GetWorldProjectVariables, options?: ExecuteQueryOptions): QueryPromise<GetWorldProjectData, GetWorldProjectVariables>;
export function getWorldProject(dc: DataConnect, vars: GetWorldProjectVariables, options?: ExecuteQueryOptions): QueryPromise<GetWorldProjectData, GetWorldProjectVariables>;

interface ListWorldEvidencesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListWorldEvidencesVariables): QueryRef<ListWorldEvidencesData, ListWorldEvidencesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListWorldEvidencesVariables): QueryRef<ListWorldEvidencesData, ListWorldEvidencesVariables>;
  operationName: string;
}
export const listWorldEvidencesRef: ListWorldEvidencesRef;

export function listWorldEvidences(vars: ListWorldEvidencesVariables, options?: ExecuteQueryOptions): QueryPromise<ListWorldEvidencesData, ListWorldEvidencesVariables>;
export function listWorldEvidences(dc: DataConnect, vars: ListWorldEvidencesVariables, options?: ExecuteQueryOptions): QueryPromise<ListWorldEvidencesData, ListWorldEvidencesVariables>;

interface ListWorldTelemetryEventsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListWorldTelemetryEventsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListWorldTelemetryEventsData, undefined>;
  operationName: string;
}
export const listWorldTelemetryEventsRef: ListWorldTelemetryEventsRef;

export function listWorldTelemetryEvents(options?: ExecuteQueryOptions): QueryPromise<ListWorldTelemetryEventsData, undefined>;
export function listWorldTelemetryEvents(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListWorldTelemetryEventsData, undefined>;

