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

export const EIL_SCHEMA_VERSION = "1.0.0" ;






const STRICT_SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function isSupportedSchemaVersion(version) {
  const match = STRICT_SEMVER.exec(version);
  if (!match) return false;
  const supportedMajor = Number(EIL_SCHEMA_VERSION.split(".")[0]);
  return Number(match[1]) <= supportedMajor;
}

export function envelope(payload) {
  return { schemaVersion: EIL_SCHEMA_VERSION, payload };
}

export function assertSupportedSchemaVersion(version) {
  if (!isSupportedSchemaVersion(version)) {
    throw new Error(
      `Unsupported EIL schema version: ${version} (supported: ${EIL_SCHEMA_VERSION})`,
    );
  }
}
