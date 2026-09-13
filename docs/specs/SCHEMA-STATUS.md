# Schema status on this branch

`prisma/schema.prisma` was temporarily reduced during automated push size limits.

**To complete Phase 1 schema on this branch:**

1. Start from `main`'s `prisma/schema.prisma` (authoritative base).
2. Apply reverse relations + Marketing* models from `docs/specs/SCHEMA-MARKETING-PHASE1.md`.
3. Or apply the local patch from project artifacts: `feat-marketing-phase-1-schema.patch` (includes full schema).

Until applied, run migrate only after schema is restored. All other Phase 1 files (contracts, service, routes, seed, tests, layout docs) are already on this branch.
