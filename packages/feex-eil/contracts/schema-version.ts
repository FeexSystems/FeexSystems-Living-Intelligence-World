/**
 * FEEX Embodied Intelligence Layer — Schema Versioning
 *
 * Every persisted or networked EIL payload carries `schemaVersion`.
 * Versioning policy:
 * - MAJOR: breaking contract change — old consumers must reject or migrate.
 * - MINOR: additive optional fields — old consumers may ignore.
 * - PATCH: documentation/clarification only.
 * Receivers MUST reject payloads whose major version exceeds their own.
 */

export const EIL_SCHEMA_VERSION = "1.0.0" as const;

export interface VersionedEnvelope<T> {
  schemaVersion: string;
  payload: T;
}

export function isSupportedSchemaVersion(version: string): boolean {
  const [major] = version.split(".").map(Number);
  const [supportedMajor] = EIL_SCHEMA_VERSION.split(".").map(Number);
  return Number.isFinite(major) && major <= (supportedMajor ?? 0);
}

export function envelope<T>(payload: T): VersionedEnvelope<T> {
  return { schemaVersion: EIL_SCHEMA_VERSION, payload };
}

export function assertSupportedSchemaVersion(version: string): void {
  if (!isSupportedSchemaVersion(version)) {
    throw new Error(
      `Unsupported EIL schema version: ${version} (supported: ${EIL_SCHEMA_VERSION})`,
    );
  }
}
