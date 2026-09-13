# Marketing Module Layout (Phase 0)

**Status:** Draft for team sign-off  
**Contract:** `docs/FEEXSYSTEMS-ADVANCED-MARKETING-INTELLIGENCE-SYSTEM.md` (PR #19 — **accepted / merged**)  
**Goal:** Decide how marketing tables **link to / extend** existing `WorldModel*` models so we never create a parallel graph.

---

## 1. Principles

1. **World Model owns reality.** Marketing entities are projections and enrichments over the same evidence fabric, not a second source of truth.
2. **Extend, don't fork.** Prefer foreign keys and optional 1:1 extension tables over duplicate project/evidence stores.
3. **Typed edges over free-form JSON** for relationships that must be queried and explained.
4. **Browser is a projection.** Canonical writes go through authenticated server APIs; client is read model + HITL UI.
5. **Provider-neutral intelligence.** LLM calls only via existing adapters; Zod contracts on all tool I/O.

---

## 2. Existing baseline to reuse

| Asset | Location | Marketing use |
|-------|----------|---------------|
| `WorldModelProject` | Prisma | Canonical repo/project node; marketing Product/Campaign link via `worldModelProjectId` or repository string |
| `WorldModelEvidence` | Prisma | Base evidence rows; marketing Claim links here (do not duplicate commit/file evidence) |
| `WorldModelArtifact` | Prisma | Path/SHA artifacts; content lineage may reference |
| `WorldModelTechnology` | Prisma | Shared technology vocabulary; marketing Feature/Product use FKs |
| `WorldModelRelationship` | Prisma | Generic typed edges; marketing may add domain-specific join tables where query patterns need richer fields |
| `WorldModelEvent` | Prisma | Engineering events; marketing telemetry is a **sibling** append-only store with optional `worldModelProjectId` |
| `Repository` | Prisma | User-scoped git connection; optional link from Product |
| `server/lib/world-model/` | Lib | Discovery / retrieve / sync patterns |
| `hybrid-retrieval.service`, `embedding.service` | Services | Semantic memory for content/claims |
| `github-pinned.service`, webhook provisioning | Services | GitHub → evidence path (Phase 7 builds on this) |
| `shared/orchestration*.ts` | Shared | Navigator tool registration |
| Omni-Command UI | `client/components/omni` | Command Center shells |

---

## 3. Decision: linkage strategy

### 3.1 Keep World Model tables as-is

Do **not** rename or merge marketing concerns into `WorldModel*`. Those tables remain engineering/evidence canonical.

### 3.2 New marketing namespace tables

All new Prisma models use clear marketing names and `@@map("marketing_*")`.

**Core Phase 1 set (minimal):**

| Model | Purpose | Links to World Model |
|-------|---------|----------------------|
| `MarketingProduct` | Shipable product / surface | Optional `worldModelProjectId` → `WorldModelProject`; optional `repositoryId` → `Repository` |
| `MarketingFeature` | Product capability | `productId`; optional claim links later |
| `MarketingTopic` | Thematic node | Standalone; later content/signal edges |
| `MarketingContentAsset` | Structured content intelligence | Optional `productId`, `topicId`; lineage via `parentId` |
| `MarketingCampaign` | Coordinated objective | Links to products/audiences later |
| `MarketingAudience` | Privacy-conscious segment | No PII by default |
| `MarketingChannel` | Distribution channel enum/table | Standalone |
| `MarketingClaim` | Asserted statement | **Required** evidence via join to `WorldModelEvidence` and/or marketing evidence extension |
| `MarketingClaimEvidence` | Join claim ↔ evidence | `claimId` + `worldModelEvidenceId` (preferred) and/or marketing-only evidence row |
| `MarketingEvent` | Marketing telemetry | Optional `worldModelProjectId`, `contentAssetId`, `campaignId` |

**Deferred to later phases:** Experiment, Lead, Outcome, Competitor, MarketSignal, Opportunity, DigitalTwinState.

### 3.3 Evidence strategy (critical)

- **Prefer** linking claims to existing `WorldModelEvidence` rows (commit, file, release).
- Add a thin `MarketingEvidence` only when the source is **not** a World Model project artifact.
- Material claims **must** have ≥1 evidence link at create time (enforced in service + Zod).

### 3.4 Technology

- Prefer FK to `WorldModelTechnology.id` from Feature/Product join tables.
- Do not create a second technology vocabulary.

### 3.5 Relationships

| Pattern | Use |
|---------|-----|
| FK + join tables | Product↔Content, Campaign↔Content, Claim↔Evidence |
| `WorldModelRelationship` | Optional cross-domain edges when a generic edge is enough |
| Content `parentId` | Lineage for recycling (Phase 8) |

---

## 4. Module boundaries (code)

```text
prisma/schema.prisma          # append Marketing* models only
shared/marketing-contracts.ts # Zod DTOs + enums (content lifecycle, etc.)
server/lib/marketing/         # domain services (claims, content, products)
server/routes/marketing.ts    # authenticated CRUD + graph neighborhood
client/…                      # Command Center routes in Phase 10; not Phase 1
```

**Route mount:** `/api/marketing/*` behind existing `authMiddleware`.

**Navigator:** Phase 6 registers tools against `shared/orchestration*.ts`; Phase 1 only exposes REST CRUD.

---

## 5. Branching & CI

- Feature branch: `feat/marketing-phase-1-schema` off `main`.
- One phase (or coherent slice) per PR; include migration + seed + tests + short capability mapping (03, 07, partial 08).
- CI: existing typecheck + vitest; add unit tests for claim-requires-evidence rule.

---

## 6. Seed policy

- Seed FeexSystems products that map to pinned World Model projects where possible.
- Sample content assets in `IDEA` / `DRAFT` only (no fake published performance).
- At least one claim with a real or fixture `WorldModelEvidence` link.

---

## 7. Explicit non-goals (Phase 0–1)

- No parallel `marketing_projects` that copy GitHub repos.
- No LLM-generated claims without evidence.
- No auto-publish.
- No Audience PII collection.
- No Command Center UI yet (Phase 10).

---

## 8. Sign-off checklist

- [ ] Team agrees: World Model tables remain authoritative for projects/evidence/artifacts.
- [ ] Team agrees: MarketingClaim must link evidence at create.
- [ ] Team agrees: module paths above.
- [ ] Team agrees: Phase 1 model set is minimal; signals/opportunity deferred.
- [ ] Architecture contract status note accepted.

---

## 9. Capability mapping (Phase 0–1)

| Capability | Phase |
|------------|-------|
| 03 Entity Model | 1 (subset) |
| 06 World Model Principle | 0 (layout enforces) |
| 07 Marketing Data Model | 1 |
| 08 Evidence-First (hooks) | 1 (claim↔evidence) |
| 12 Content Lifecycle (enum only) | 1 |

---

*Document version: 1.0 — Phase 0 layout. Amend only via PR when decisions change.*
