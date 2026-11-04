/**
 * Safe date -> ISO string conversion for DTO mappers.
 *
 * `createdAt` / `updatedAt` are non-null in the Prisma schema and are always
 * populated by PostgreSQL. However:
 *   - in-memory Prisma providers (e.g. prismock) do not implement `@updatedAt`,
 *     leaving the field null on freshly created rows;
 *   - any future nullable column must not crash a read path.
 *
 * A DTO mapper must never throw a 500 because a timestamp was missing.
 */
export function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date().toISOString();
}

/** Nullable variant for optional timestamps (e.g. `approvedAt`, `plantedAt`). */
export function toIsoOrNull(value) {
  return value instanceof Date ? value.toISOString() : null;
}
