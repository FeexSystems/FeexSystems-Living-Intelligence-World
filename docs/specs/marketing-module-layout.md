# Marketing Module Layout (Phase 0)

**Status:** Accepted for implementation (Phase 1–2 in progress)  
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
| `WorldModelProject` | Prisma | Canonical repo/project node; marketing Product link via `worldModelProjectId` |
| `WorldModelEvidence` | Prisma | Base evidence; marketing Claim links here |
| `WorldModelTechnology` | Prisma | Shared technology vocabulary |
| `WorldModelRelationship` | Prisma | Generic typed edges |
| `Repository` | Prisma | Optional link from Product |

---

## 3. Decision: linkage strategy

- Keep World Model tables as-is.
- New `Marketing*` models with FKs into World Model.
- Prefer `WorldModelEvidence` for claims; thin `MarketingEvidence` for non-repo sources only.
- Material claims **must** have ≥1 evidence link at create.

## 4. Module boundaries

```text
shared/marketing-contracts.ts
server/lib/marketing/
server/routes/marketing.ts → /api/marketing
```

## 8. Sign-off checklist

- [x] World Model tables remain authoritative for projects/evidence/artifacts.
- [x] MarketingClaim must link evidence at create.
- [x] Module paths above.
- [x] Phase 1 model set is minimal; signals/opportunity deferred.
- [x] Architecture contract status note accepted.

*Signed off for implementation — Phase 1 schema + Phase 2 claim graph (2026-09-13).*
