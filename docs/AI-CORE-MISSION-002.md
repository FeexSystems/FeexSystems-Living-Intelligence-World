# FeexSystems AI Core — Mission 002

**Shared AI Core, Tenant Isolation & Platform Foundations**
**Status:** In progress
**Branch:** `feat/ai-core-mission-001` (Mission 001 work present)
**Baseline:** `6a500c3`

---

## 1. Gate 0 — Verified repository facts

These were read from the working tree, not inferred from documentation.

| Capability | Existing implementation | Verdict |
|---|---|---|
| Identity | Firebase ID tokens verified in `server/lib/middleware/auth.middleware.ts`; `req.user` populated | **Reuse as-is** |
| Tenant boundary | `Team` (tenant) + `TeamMember` (`TeamRole` OWNER/ADMIN/MEMBER/VIEWER) + `Workspace` + `ResourceShare` | **Reuse** — do NOT add a second tenant model |
| Membership gate | `TeamService.getTeam(teamId, userId)` (throws ACCESS_DENIED for non-members) | **Reuse** |
| Admin RBAC | `server/lib/middleware/admin.middleware.ts` (`requireAdminPermission`, `requireSuperAdmin`) | **Reuse** |
| Audit | `ActivityLog` (+ `ActivityLogService`) and tenant-scoped `TeamActivityLog` | **Reuse** (extend with tenant/outcome/correlation) |
| Usage | `UsageMetrics` (per user/period aggregate), `AIRequest` (tokensUsed/latency/confidence) | **Extend** — aggregates cannot distinguish measured vs estimated |
| AI providers | `aiGateway` (`gemini \| openai \| none`), `aiRegistry`, `aiRequestService` | **Extend** — add timeout/retry/correlation/usage |
| Queue | `ai-queue.service.ts` (Bull + Redis) | **Reuse** |
| Workflow runs | `RequestStatus` enum on `AIRequest`; `Pipeline`/`Deployment`/`SecurityScan` statuses | **Gap** — no generic run/step lifecycle |

### Baseline command results

| Command | Result |
|---|---|
| `npm run typecheck` | EXIT 0 |
| `vitest --run --project unit` | EXIT 0 (recorded in `.verify/m2-baseline-unit.log`) |

### Assumptions explicitly NOT made

- Mission 001 is present on this branch (`OperationsEnquiry` models exist) — verified, not assumed.
- No live PostgreSQL, Redis or Firebase Admin credentials are available in this sandbox.
- CI results were not treated as proof of local health.

---

## 2. Gate A — Architecture assessment

### Reuse over new abstractions

`Team` **is** the tenant. Adding a parallel `Tenant` table would create a second source of
truth for membership and violate the "no duplicate abstractions" rule. Mission 002 therefore
adds only a thin **tenant context** layer over the existing `TeamService`/`TeamMember` data:

- `resolveTenantContext(teamId, userId)` — returns `{ teamId, userId, role, isMember }`
  or denies; never trusts a client-supplied tenant id without a membership lookup.
- `hasRequiredRole(role, required)` — pure role hierarchy (VIEWER < MEMBER < ADMIN < OWNER).

### Genuine gaps (justified new entities)

1. **Workflow run/step lifecycle.** No generic, tenant-scoped, idempotent run + step model
   exists. `AIRequest` is a single job, and its statuses are not step-level. Required by
   Missions 003–005.
2. **Append-only usage events.** `UsageMetrics` is an aggregate per user/period and cannot
   express *measured vs estimated* usage or tenant attribution.
3. **AI gateway hardening.** No timeout, bounded retry, correlation id, or usage metadata.

### Selected implementation path

| Area | Decision |
|---|---|
| Tenancy | Reuse `Team`/`TeamMember`; add `server/lib/tenant/context.ts` + tests |
| Workflows | New `WorkflowRun` + `WorkflowStep` models, one reviewed migration, service with bounded retries + idempotency |
| Usage | New append-only `PlatformUsageEvent` (tenant-scoped, `measured` flag) |
| Audit | Reuse `TeamActivityLog` via a `PlatformAuditService` that records tenant, actor, action, resource, outcome, correlation id |
| AI | Extend `aiGateway` additively (timeout, retries, correlation, usage) without breaking existing callers |
| Queue | Reuse Bull (`ai-queue.service.ts`); no new job system |

### Non-goals (explicit)

- No new framework, ORM, database, vector store or observability vendor.
- No public anonymous intake (Mission 002 is authenticated-only).
- No external consequential action (email/payment/property/agricultural) — approval only.
- No deployment or infrastructure change.

---

## 3. Implemented in this mission

| Area | File | Notes |
|---|---|---|
| Tenant context + RBAC | `server/lib/tenant/context.ts` | Membership resolved from DB; role hierarchy; `requireTenant()` middleware |
| Workflow lifecycle | `server/lib/services/workflow.service.ts` | Idempotent runs, ordered steps, approval state, bounded retries |
| Audit + usage | `server/lib/services/platform-audit.service.ts` | Reuses `TeamActivityLog`; append-only `PlatformUsageEvent` with `measured` flag |
| AI gateway hardening | `server/lib/services/ai-gateway.service.ts` | Timeout, bounded retries, correlation id, measured/unmeasured usage |
| Schema | `prisma/schema.prisma` + `20261017220000_shared_platform_mission_002` | Additive: `workflow_runs`, `workflow_steps`, `platform_usage_events` |

## 4. Gate evidence

| Gate | Evidence | Status |
|---|---|---|
| A — Architecture | This document: reuse map + justified gaps | **PASS** |
| B — Persistence | Additive migration (creates tables only; no existing table altered) | **PASS (migration written, NOT applied)** |
| C — Tenant isolation | `server/lib/tenant/__tests__/context.test.ts` — 6 tests: member allowed, non-member denied, inactive denied, insufficient role denied, missing context rejected | **PASS** |
| D — AI abstraction | `server/lib/services/__tests__/ai-gateway.test.ts` — 6 tests: explicit unavailable state, no fetch without credential, retries then success, measured/unmeasured usage, invalid JSON → null | **PASS** |
| E — Workflow reliability | `server/lib/services/__tests__/workflow.service.test.ts` — 12 tests (idempotency, tenant 404, approval transitions, invalid transitions, retries) + `platform-audit.service.test.ts` — 3 tests | **PASS** |
| F — Regression | typecheck / unit / lint / build — see Gate 4 report | **PASS (unit/lint/build recorded)** |

### Explicitly NOT done / blocked

- **Migration not applied** — no live PostgreSQL in this environment. `npx prisma migrate deploy` is required before use.
- **No route/UI wiring** for the workflow lifecycle — Mission 002 delivers the shared services and contracts; product routes consume them in Missions 003–005.
- **No live AI execution** — no provider credential present; only the deterministic/absent path and mocked-provider paths are verified.

