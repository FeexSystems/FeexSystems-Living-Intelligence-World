# Phase 2 PR — Capability Mapping

| Capability | Status in this work |
|------------|---------------------|
| 05 Marketing Knowledge Graph | Typed claim edges (supports, about, asserts) |
| 08 Evidence-First Marketing | Orphan detection + integrity check API |
| 35 Claim Graph | Neighborhood + product claim graph + traverse |
| 45 Evidence Freshness & Dependency Propagation | `claimsDependingOnEvidence` + `propagateEvidenceChange` |

## APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/marketing/claims/orphans` | List claims with zero evidence |
| POST | `/api/marketing/claims/integrity-check` | 409 if orphans exist |
| GET | `/api/marketing/claims/:id/graph` | Claim neighborhood graph |
| GET | `/api/marketing/products/:id/claim-graph` | All claims for product |
| GET | `/api/marketing/evidence/dependencies` | Claims depending on evidence |
| POST | `/api/marketing/evidence/propagate` | Refresh dependent claim freshness + audit |
| POST | `/api/marketing/claims/:id/about` | Link claim → feature/technology |
| GET | `/api/marketing/evidence/traverse` | BFS from evidence through claims/content |

## New models

- `MarketingClaimAbout` — claim → feature | technology
- `MarketingClaimAudit` — append-only mutation log

## Schema note

Full `prisma/schema.prisma` includes main World Model + Phase 1 Marketing* + Phase 2 about/audit tables. Restore from commit `09fa31d` base if main was corrupted by a stub.
