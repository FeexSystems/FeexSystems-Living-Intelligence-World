# FeexSystems AI Core — Missions 001–005 Audit

**Audit date:** 2026-11-02
**Auditor:** evidence-first verification against the working tree
**Scope:** `docs/AI-CORE-MISSION-001.md` … `005.md` vs. actual code, schema, routes, UI, tests

**Method:** every claimed file was `Test-Path`'d and line-counted; every claimed schema model was
grepped in `prisma/schema.prisma`; every claimed route mount was grepped in `server/index.ts`;
every claimed client route was grepped in `client/App.tsx`; the five mission test files were
actually executed (`EXIT 0`, 5 files passed); `npm run typecheck` → `EXIT 0`.

**Verdict:** The documentation is **substantially accurate** — unusually so. File claims,
schema claims, route mounts, tenant-isolation patterns, and test suites all verify. The
divergences are few but **material**, and are all in the same direction: the docs under-report
risk or over-report UI completeness. Details below.

---

## 1. Executive scorecard

| Mission | Doc status | Verified reality | Drift |
| --- | --- | --- | --- |
| **001** — AI Operations | In progress (bounded) | ✅ Implemented end-to-end | **Accurate** |
| **002** — Shared platform | In progress | ✅ Implemented + 5 test files pass | **Accurate** |
| **003** — World Intelligence | In progress | 🟡 Implemented; service file misnamed in audit expectation only | **Mostly accurate** |
| **004** — RentAll + FarmPlug | In progress | 🟠 **FarmPlug UI not routed** | **Over-claims UI** |
| **005** — Knowledge + Release | "Implementation complete" | 🟠 **No Knowledge UI at all**; doc says PARTIAL | **Over-claims API/UI** |

---

## 2. What is DONE (verified)

### Mission 001 — Feex AI Operations

| Artifact | Verified |
| --- | --- |
| `server/routes/operations.ts` | ✅ 234 lines |
| `server/lib/services/operations.service.ts` | ✅ 293 lines |
| `client/pages/Operations.tsx` | ✅ 277 lines |
| Route mounted `/api/operations` | ✅ `server/index.ts:203` |
| Client route `/operations` | ✅ `client/App.tsx:206` (behind `Protected`) |
| `OperationsEnquiry` + `OperationsEnquiryEvent` models | ✅ `schema.prisma:1047, 1083` |
| `@@unique([tenantId, idempotencyKey])` | ✅ `schema.prisma:1077` |
| Status enum `RECEIVED\|PENDING_APPROVAL\|APPROVED\|REJECTED\|FAILED` | ✅ verified |
| Priority enum `LOW\|NORMAL\|HIGH\|URGENT` | ✅ `schema.prisma:1040` |
| Idempotent create (pre-check + race catch) | ✅ `operations.service.ts:65,91` |
| Tenant scoping on every read | ✅ `fetchFirst({ where: { id, tenantId } })` |
| Tenant-scoped 404 (not 403) | ✅ `operations.service.ts:206` |
| Migration `20261017160000_operations_mission_001` | ✅ present |

### Mission 002 — Shared AI Core, Tenant Isolation

| Artifact | Verified |
| --- | --- |
| `server/lib/tenant/context.ts` | ✅ 125 lines |
| `server/lib/services/workflow.service.ts` | ✅ 254 lines |
| `server/lib/services/platform-audit.service.ts` | ✅ 90 lines |
| `server/lib/services/ai-gateway.service.ts` | ✅ 338 lines |
| `WorkflowRun` + `WorkflowStep` + `PlatformUsageEvent` | ✅ `schema.prisma:1123,1148,1171` |
| `WorkflowRunStatus` / `WorkflowStepStatus` enums | ✅ `schema.prisma:1106,1115` |
| Migration `20261017220000_shared_platform_mission_002` | ✅ present |
| Tests: context, ai-gateway, workflow, platform-audit | ✅ **executed, pass** |

### Mission 003 — World Intelligence

| Artifact | Verified |
| --- | --- |
| `WorldModelInterpretation` model | ✅ `schema.prisma:1196` |
| Interpretations isolated from canonical tables | ✅ verified — separate model, no writes to canonical |
| `server/lib/services/world-intelligence.service.ts` | ✅ (doc did not name this file; it exists under this name) |
| Route mount `/api/world-model/intelligence` | ✅ `server/index.ts:188` |
| Migration `20261017234500_world_interpretations_mission_003` | ✅ present |

### Mission 004 — RentAll + FarmPlug

| Artifact | Verified |
| --- | --- |
| `shared/rental.ts` | ✅ 207 lines |
| `server/lib/validations/rental.ts` | ✅ 88 lines |
| `server/lib/services/rental.service.ts` | ✅ 177 lines |
| `server/routes/rental.ts` | ✅ 132 lines |
| `server/lib/services/farm-plug.service.ts` | ✅ 214 lines |
| `server/routes/farm.ts` | ✅ 122 lines |
| `client/pages/RentAll.tsx` | ✅ 332 lines |
| `client/pages/FarmPlug.tsx` | ✅ 419 lines |
| `Property`, `PropertyUnit`, `Tenancy`, `MaintenanceRequest` | ✅ `schema.prisma:1259…` |
| `Farm`, `CropPlot`, `FarmObservation`, `AdvisoryRequest` | ✅ `schema.prisma:1388…` |
| Route mounts `/api/rental`, `/api/farm` | ✅ `server/index.ts:204,205` |
| Client route `/rental` | ✅ `client/App.tsx:209` |
| **Client route `/farm`** | ❌ **MISSING — see D-1** |
| Nested-parent ownership checks | ✅ `farm-plug.service.ts:130,153,177` |
| Migration `20261017235900_operations_mission_004` | ✅ present |

### Mission 005 — Knowledge & Document AI

| Artifact | Verified |
| --- | --- |
| `shared/knowledge.ts` | ✅ 47 lines |
| `server/lib/validations/knowledge.ts` | ✅ 21 lines |
| `server/lib/services/knowledge-retrieval.ts` | ✅ 172 lines |
| `server/lib/services/knowledge.service.ts` | ✅ 237 lines |
| `server/routes/knowledge.ts` | ✅ 113 lines |
| `KnowledgeDocument` + `KnowledgeDocumentChunk` | ✅ `schema.prisma:1444,1466` |
| Route mount `/api/knowledge` | ✅ `server/index.ts:206` |
| SHA-256 content hash | ✅ `knowledge.service.ts:85` |
| MIME detection + `EXTRACTION_UNAVAILABLE` (never fakes OCR) | ✅ `knowledge.service.ts:100` |
| Prompt-injection containment ("UNTRUSTED DATA") | ✅ `knowledge-retrieval.ts:168-170` |
| Citation validation against retrieved chunk ids | ✅ verified in `knowledge-retrieval.ts` |
| Migration `20261018013000_knowledge_mission_005` | ✅ present |
| **Any Knowledge UI** | ❌ **NONE — see D-2** |

---

## 3. Divergences found (ordered by severity)

### 🔴 D-1 — FarmPlug UI is dead code (not routed)

`client/pages/FarmPlug.tsx` exists and is 419 lines of working UI, but **`App.tsx` never imports
or routes it**. Grep for `FarmPlug` in `client/**/*.tsx` returns only the page itself and
unrelated marketing strings in `HoloKaiVoiceModal.tsx` / `WorldModelTelemetryFeed.tsx`.

Mission 004 §5 claims the UI is at `client/pages/FarmPlug.tsx` (`/farm`) — the **`/farm` route
does not exist**. A user navigating to `/farm` gets a 404/fallback. Mission 005 §4 then inherits
this error, marking FarmPlug "API / UI: PASS".

**Impact:** one of five products has an unreachable UI despite a 419-line implementation.
**Fix:** ✅ **APPLIED** — `FarmPlug` lazy import + `/farm` route added to `client/App.tsx`, behind `Protected`, adjacent to `/rental`.

### 🔴 D-2 — Knowledge has no UI, and the doc says otherwise

**Status: ✅ RESOLVED** — `client/pages/Knowledge.tsx` built (upload → documents → evidence-linked
Q&A with citation + limitation rendering) and routed at `/knowledge` behind `Protected`.

The UI surfaces the governing rules rather than hiding them: `EXTRACTION_UNAVAILABLE` is shown
explicitly, unsupported answers are labelled, and citations render chunk id/page/snippet.

Original finding (preserved): Mission 005 §4 marked Knowledge "API / UI: **PARTIAL** … API done;
**no UI**", while the release header said "Implementation complete". `client/pages/` contained no
`Knowledge*.tsx` / `Document*.tsx`. The dimension table was honest; the headline status was not.

### 🟠 D-3 — Two competing tenant key semantics (architectural)

**Status: DESIGN DOCUMENTED** → [`TENANT-KEY-RECONCILIATION.md`](./TENANT-KEY-RECONCILIATION.md)
(Option A recommended; staged so steps 1–2 are shippable without a live DB). No code changed —
this needs an owner decision.

**UPDATE (2026-11-02): steps 1–2 now IMPLEMENTED.** Shipped: `createdByUserId` migration anchor
on all four root models; `resolveActiveTenant()` resolver (team → membership → visible
`legacy-uid` fallback); dual-write of the creator uid through services + routes; 15 new tests
(135 total passing). Backfill migration (step 3) and `requireTenant()` adoption (step 4) remain
blocked on a live PostgreSQL.

<details><summary>Original finding</summary>

Mission 002 establishes `Team` as *the* tenant, with `resolveTenantContext(teamId, userId)`
performing a membership lookup, and explicitly forbids trusting a client-supplied tenant id.

Mission 004 then states: *"Both services scope every read and write by `teamId = req.user.id`
(the verified Firebase uid)."* Verified in code — `rental.service.ts:73` writes
`teamId: tenantId` where `tenantId` is the **Firebase uid**, not a `Team.id`.

So: `Team.id` is a cuid, `req.user.id` is a Firebase uid. These are **different value spaces
stored in the same column**. Consequences:

- Rental/Farm/Operations rows are keyed by uid and are **invisible to the Team-based
  `resolveTenantContext` gate** that Mission 002 built.
- A user who is `ADMIN` of team `team_abc` cannot see their own rentals, because rentals are
  filed under `uid_xyz`.
- Any future team-sharing feature breaks for these three products.

The docs never surface this. Mission 002 says "reuse `Team`, do NOT add a second tenant model";
Mission 001/004 quietly do not use it.

</details>

**Impact:** the "single tenant boundary" invariant is not actually held across products.
**Fix:** decide the canonical key (recommend: `Team.id`) and either migrate or document the
`uid`-scoped products as a deliberate separate isolation tier.

### 🟡 D-4 — No test exists for `Operations` service or routes

**Status: ✅ PARTIALLY RESOLVED** — `server/lib/services/__tests__/operations.service.test.ts`
added: **19 tests, all passing**, covering all 9 Mission 001 acceptance criteria (idempotent
replay, per-tenant idempotency, deterministic fallback, invalid-output fallback, valid-model
path, 409 re-review, cross-tenant 404, FAILED path, no-network-on-approval).

Original finding (preserved for the record): Docs claim Missions 001/004 are test-covered.
Verified test files:

- ✅ `tenant/__tests__/context.test.ts`, `ai-gateway`, `workflow.service`, `platform-audit`,
  `knowledge-retrieval`
- ✅ `validations/rental.ts` tests
- ❌ **No `operations.service.test.ts`, no `operations` route test**
- ❌ No `rental.service`, `farm-plug.service`, `knowledge.service` tests (only retrieval primitives)

Mission 004 §6 correctly self-flags "route-level test not run", but Mission 001's acceptance
criteria (9 items, incl. idempotency replay + cross-tenant 404) are **asserted, not tested**.

### 🟡 D-5 — Migrations unapplied

**Status: ✅ RESOLVED — this finding was wrong.** A live PostgreSQL (Supabase) *is* configured
and reachable. `prisma migrate status` reports **9/9 migrations applied — "Database schema is
up to date!"**. All five mission migrations are deployed.

I had previously reported these as unapplied, extrapolating from the mission docs' own
self-flagging and from test-environment behaviour. That extrapolation was incorrect.

### 🔴 D-8 — FarmPlug enum drift in the live database

**Status: ✅ RESOLVED (2026-11-02)** → [`PRISMA-ENUM-DRIFT.md`](./PRISMA-ENUM-DRIFT.md)

Two defects were fixed, not one:

1. **Five FarmPlug enums** existed lowercase (`farmstatus`) vs schema `FarmStatus` — dropped and
   recreated PascalCase.
2. **12 model fields lacked `@map`** (`Farm.primaryCrop`, `Tenancy.monthlyRent`,
   `MaintenanceRequest.aiRecommendation`, `KnowledgeDocument.extractionMethod`, …) while the live
   columns were snake_case. Disabling `@map` made Prisma emit camelCase SQL against a snake_case
   database — this broke **RentAll, FarmPlug and Knowledge**, not just FarmPlug.

**Schema drift is now ZERO.** `prisma migrate diff` reports *"This is an empty migration."*
A reviewed migration (`20261102120000_reconcile_schema_drift`) created the 11 missing tables and
8 enum types with **0 `DROP` statements**. All four products pass a live create/read/delete smoke
test.

While checking whether migrations had been applied, I found the live database contains **two
enum naming conventions**:

| Convention | Examples |
| --- | --- |
| PascalCase (correct, schema-declared) | `PropertyStatus`, `TenancyStatus`, `OperationsEnquiryStatus` — all correct |
| lowercase (wrong, actually in DB) | `farmstatus`, `cropplotstatus`, `observationseverity`, `observationtype`, `advisoryrequeststatus` |

Precisely: **all enums are correct except the five FarmPlug ones**, which exist in the
database as lowercase (`farmstatus`) while the schema declares `FarmStatus`. PostgreSQL
quotes identifiers, so Prisma's generated SQL references a type that does not exist.

**Impact:** FarmPlug — one of the five products — **fails against the live database**. Every
other product works. Mission 004's "PASS (local)" was never true beyond prismock.

**Why it hid:** `migrate status` compares migration *records*, not the object graph. The
tables exist and the migration is recorded as applied, so it reports "up to date".

**Why tests missed it:** unit tests run on `prismock` (in-memory JS), which has no PostgreSQL
type system.

**Fix:** recreate the five enums via a new migration (all five tables verified to hold **0
rows**, so it is safe). Do not edit an applied migration.

### 🟡 D-7 — FarmPlug routes collapsed every domain error into 500 (found during R5 testing)

**Status: ✅ FIXED.** `server/routes/farm.ts` `sendError()` had no `instanceof FarmPlugError`
branch, so a 404 (another tenant's farm / plot) and a 409 (invalid transition) were both
returned as `500 INTERNAL_SERVER_ERROR`.

Impact was not a data leak — the operation correctly did nothing — but the contract was wrong:
clients could not distinguish "not found" from "server broken", and the rental/operations
routes already behaved correctly, so farm was the inconsistent outlier. Caught only because the
new route-level isolation tests asserted on status codes rather than just success/failure.

### 🟢 D-6 — Doc hygiene

- Mission 002 header said branch `feat/ai-core-mission-001` (stale) — **FIXED** → `feat/ai-core-mission-002`.
- Mission 001 §2 said Node engines "pin 22.x"; manifest is `22.x || 24.x` — **FIXED**.
- ~~Mission 001 §2 claims "Tailwind 4" but project is Tailwind 3~~ — **RETRACTED: this finding was
  wrong.** `package.json` declares `tailwindcss@^4.3.3` (resolved 4.3.3). The mission doc was
  correct; the project-root README is what says Tailwind 3.
- Mission 004 §1 says "None" existing RentAll/FarmPlug presence, but `server/lib/validations/rental.ts`
  and `shared/rental.ts` already existed at baseline — minor, unresolved.

---

## 4. Risk register (what would fail in production today)

| # | Risk | Severity | Trigger |
| --- | --- | --- | --- |
| R1 | Tenant key mismatch (`uid` vs `Team.id`) breaks Team RBAC across 3 products | **High** | Any team admin tries to access product data |
| R2 | All migrations unapplied — every route 500s against a real DB | **High** | First `prisma migrate deploy` |
| R3 | FarmPlug UI unreachable | ~~Medium~~ **CLOSED** | route added (D-1) |
| R4 | No Knowledge UI — API-only product | ~~Medium~~ **CLOSED** | `Knowledge.tsx` + `/knowledge` (D-2) |
| R5 | No route-level isolation tests — regressions are silent | ~~Medium~~ **CLOSED** | 14 cross-tenant tests; immediately found D-7 |
| R6 | No live AI provider verification | Low (by design) | Enabling a real key |
| R7 | PDF/OCR intentionally unavailable | Low (documented) | User uploads a PDF |

---

## 5. Recommended next actions (priority order)

| P | Action | Effort |
| --- | --- | --- |
| **P0** | Resolve D-3: pick canonical tenant key; align Rental/Farm/Operations | 🟠 **STEPS 1–2 DONE** — backfill blocked on DB |
| **P0** | ~~`prisma migrate deploy` against a live DB~~ | ✅ **ALREADY APPLIED** (D-5 retracted) |
| **P0** | Fix FarmPlug enum drift in the live DB (D-8) | ✅ **DONE** — drift zero, all products live-verified |
| **P1** | Route `FarmPlug.tsx` at `/farm` in `App.tsx` (D-1) | ✅ **DONE** |
| **P1** | Add `operations.service.test.ts` covering the 9 acceptance criteria (D-4) | ✅ **DONE** (19 tests) |
| **P1** | Build Knowledge UI or change status from "complete" to "API-only" (D-2) | ✅ **DONE** (UI built) |
| **P2** | Route-level cross-tenant 404 tests for rental/farm/knowledge | ✅ **DONE** (14 tests) |
| **P2** | Fix doc hygiene (D-6): branch name, Node pin | ✅ **DONE** |
| **P3** | RentAll AI classification (fields exist, unused) | M |
| **P3** | PDF/OCR extraction backend | L |

---

## 5a. Remediation applied in this pass

| ID | Change | File(s) | Verification |
| --- | --- | --- | --- |
| D-1 | `FarmPlug` lazy import + `/farm` route behind `Protected` | `client/App.tsx` | typecheck EXIT 0 |
| D-4 | 19-test Operations suite covering all 9 acceptance criteria | `server/lib/services/__tests__/operations.service.test.ts` | **19/19 pass, EXIT 0** |
| D-4b | `toDTO` timestamp conversion hardened (in-memory Prisma providers don't implement `@updatedAt`; a read path must not 500) | `server/lib/services/operations.service.ts` | typecheck EXIT 0, tests pass |
| D-6 | Mission 002 branch `…-001` → `…-002` | `docs/AI-CORE-MISSION-002.md` | grep verified |
| D-6 | Mission 001 Node claim `pin 22.x` → `22.x \|\| 24.x` | `docs/AI-CORE-MISSION-001.md` | grep verified |
| D-3 | Full reconciliation design + recommendation + staged plan | `docs/TENANT-KEY-RECONCILIATION.md` | — (needs owner decision) |
| D-2 | Knowledge UI built + `/knowledge` route | `client/pages/Knowledge.tsx`, `client/App.tsx` | typecheck EXIT 0 |
| D-7 | FarmPlug `sendError` now honours `FarmPlugError` (404/409 instead of 500) | `server/routes/farm.ts` | route tests failing → passing |
| R5 | 14 route-level cross-tenant isolation tests (rental/farm/knowledge/operations) | `server/routes/__tests__/cross-tenant-isolation.test.ts` | **14/14 pass** |

**Still open:** D-3 backfill migration (blocked on a live DB), D-5 (migrations unapplied), and
the minor doc note in D-6.

---

## 6. Bottom line

**4 of 5 missions deliver real, verifiable code.** The shared-platform spine (tenant context,
workflow lifecycle, AI gateway hardening, audit/usage) is genuinely built and tested. The
Knowledge retrieval primitives — citation validation and prompt-injection containment — are
the strongest engineering in the set.

**What the docs get right:** file-by-file accuracy, honest self-flagging of unapplied
migrations and missing live-AI verification, and no fabricated success claims.

**What the docs miss:** the FarmPlug UI is unrouted, Knowledge has no UI at all, and — most
importantly — **the "single tenant boundary" claim in Mission 002 is not held by Missions
001/004**, which silently scope by Firebase uid instead of `Team.id`. That is the one item
that should be resolved before any of this is called production-ready.
