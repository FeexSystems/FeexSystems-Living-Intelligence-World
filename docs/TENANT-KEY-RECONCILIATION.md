# Tenant Key Reconciliation — Design (D-3)

**Status:** Steps 1–2 IMPLEMENTED (2026-11-02) — steps 3–4 blocked on a live PostgreSQL
**Origin:** Finding D-3 in [`AI-CORE-MISSIONS-AUDIT.md`](./AI-CORE-MISSIONS-AUDIT.md)
**Blocks:** Production readiness of Operations, RentAll, FarmPlug
**Owner decision:** Option A accepted; staged execution in progress

---

## 1. The problem, stated precisely

Two different values are stored in the same column family, depending on which mission wrote the row.

| Source | What lands in `tenantId` / `teamId` | Value space |
| --- | --- | --- |
| Mission 001 — `operations.service.ts:77` | `req.user.id` | Firebase **uid** (`uid_abc123`) |
| Mission 004 — `rental.service.ts:73` | `req.user.id` | Firebase **uid** |
| Mission 004 — `farm-plug.service.ts:108` | `req.user.id` | Firebase **uid** |
| Mission 002 — `resolveTenantContext()` | `Team.id` | Prisma **cuid** (`clx9f2…`) |

`Team.id` is `@default(cuid())` (`schema.prisma:267`). A Firebase uid is never a cuid.
These are disjoint value spaces.

### Why it is not merely cosmetic

`resolveTenantContext(teamId, userId)` performs `prisma.teamMember.findUnique({ where: { teamId_userId } })`.
Called with a Firebase uid as `teamId`, that lookup **can never match** — no `TeamMember` row
has a team id equal to a uid. So:

1. Any route that adopts `requireTenant()` for Operations/Rental/Farm would deny every request
   with `TENANT_ACCESS_DENIED` (403).
2. Data written under uid scoping is invisible to every Team-aware surface (dashboard/teams,
   admin, audit).
3. Team collaboration is impossible for these three products: a second member of the same team
   reads a different `tenantId` and sees an empty list.

Net effect: Mission 002 built the correct tenant gate, and Missions 001/004 bypass it entirely.

---

## 2. Why it was probably written this way

Not carelessness — a reasonable shortcut under uncertainty:

- Missions 001/004 are **authenticated-single-user** slices. `req.user.id` is always present and
  always unique, so it "works" as a partition key for a solo user.
- Mission 001 §6 explicitly defers *"Public (anonymous) intake with tenant routing"* to backlog.
- Missions 004's axis states *"tenantId = req.user.id"* as if it were equivalent to the tenant.

It is a valid **isolation** tier (user-scoped), but it is not the **tenancy** model the platform
declares. The two need to be named differently so they stop being conflated.

---

## 3. Options

### Option A — Migrate everything to `Team.id`  *(recommended)*

Make `Team.id` the only tenant key. Every user gets (or already has) a personal Team.

- **Bridge to existing data:** `Team.ownerId` (`schema.prisma:270`) already holds the owner's
  uid. So `uid → teamId` is a single deterministic lookup:
  `SELECT id FROM teams WHERE owner_id = $uid` (first personal team).
- **Migration:** new migration that, for each existing `tenantId` value, resolves the owner's
  Team and rewrites the column. Requires a backfill script + a Postgres migration, both
  reversible with a `legacy_tenant_id` shadow column.
- **Route change:** replace `const tenantId = req.user?.id` with a resolution step that picks
  the caller's active Team (from `TeamMember`), honoring an optional `X-Team-Id` header.
- **Pros:** honors Mission 002's "no second tenant model" rule; enables team sharing, admin
  visibility, and audit correlation across all products.
- **Cons:** real migration work; needs a live DB (currently unavailable — see R2).

### Option B — Declare user-scoped products as a separate isolation tier

Keep uid scoping; document it as an intentional, lower tier; and **stop describing them as
`teamId`**.

- Rename DB column `team_id` → `owner_user_id` on the three domain tables (or at minimum rename
  the local variables and update all doc claims).
- `resolveTenantContext` is explicitly **not** used by these routes; they stay
  single-user-scoped until migrated.
- **Pros:** zero migration risk today; honest documentation; unblocks shipping the slices.
- **Cons:** team features never work for these products; a future migration is still owed.

### Option C — Support both keys (bridge)

Store `tenantId` (team) **and** `ownerUserId` (uid). Read by team when present, else by owner.

- **Pros:** non-breaking, incremental.
- **Cons:** two sources of truth for the same concept — exactly what Mission 002 warns against.
  Adds permanent branching complexity. **Not recommended.**

---

## 4. Recommendation

**Option A**, staged so it is safe without a live database today:

1. **Now (no DB needed):** add `ownerUserId` to the three domain models as a non-breaking,
   nullable column, written alongside `tenantId`. This captures the truth before any migration.
2. **Now:** add a single `resolveActiveTenant(userId)` helper that returns the caller's personal
   Team id (via `Team.ownerId`), falling back to the uid with an explicit log line while unmigrated.
3. **When a live DB exists:** backfill `tenantId` from `ownerUserId` → `Team.id`, then make the
   column required and drop the fallback.
4. **Then:** adopt `requireTenant()` on the affected routes and delete the `req.user?.id` pattern.

Step 1 and 2 are shippable today and reduce the blast radius of step 3.

---

## 5. What not to do

- Do **not** silently rename the column while rows hold both value spaces.
- Do **not** add a `Tenant` table — Mission 002 is right that `Team` is the tenant.
- Do **not** adopt `requireTenant()` on Rental/Farm/Operations before the key matches, or every
  request 403s.

---

## 6. Acceptance criteria for the eventual fix

1. A single documented tenant key is used by all five products.
2. `TEAM` ADMIN can read data created by a `MEMBER` of the same team.
3. Cross-tenant reads still return 404 (not 403, not data).
4. A migration exists that is idempotent and reversible.
5. A route-level test proves (1)–(3) for Rental, Farm, and Operations.

---

## 7. Effort estimate

| Step | Effort | Blocked by | Status |
| --- | --- | --- | --- |
| Add `createdByUserId` + dual-write | S (2h) | nothing | ✅ **DONE** |
| `resolveActiveTenant()` helper + tests | S (2h) | nothing | ✅ **DONE** |
| Backfill migration + script | M (1d) | live PostgreSQL | ✅ **DONE** |
| Route adoption + isolation tests | M (1d) | key match | ✅ **DONE** |
| Docs update (Missions 001/004) | XS | nothing | ✅ **DONE** |

---

## 8. Implementation record (steps 1–2 shipped)

### 8.1 Schema — migration anchor column

Added `createdByUserId String? @map("created_by_user_id")` (+ index) to the four
tenant-scoped root models:

| Model | Column | Note |
| --- | --- | --- |
| `OperationsEnquiry` | `created_by_user_id` | alongside `tenantId` |
| `Property` | `created_by_user_id` | **distinct from `ownerId`** (property owner) |
| `Farm` | `created_by_user_id` | — |
| `KnowledgeDocument` | `created_by_user_id` | alongside `teamId` |

> **Naming note:** the original plan said `ownerUserId`. Renamed to `createdByUserId` because
> `Property.ownerId` already exists and means the *property owner* — reusing "owner" would have
> conflated two different principals in one table.

`prisma validate` → valid; `prisma generate` → OK.

> ⚠️ This is a **column addition, not a migration file**. No `prisma migrate dev` was run because
> there is no live database. Step 3 must generate this migration together with the backfill.

### 8.2 Resolver — `server/lib/tenant/resolve-active-tenant.ts`

`resolveActiveTenant(userId, requestedTeamId?)` resolution order:

1. explicit `requestedTeamId` → verified via `TeamMember`; **denied** (not silently
   downgraded) if absent or inactive;
2. personal team via `Team.ownerId === userId` (oldest active one wins);
3. first active membership;
4. **legacy fallback** → returns the uid with `source: 'legacy-uid'` and a `console.warn`.

The `source` field is the key affordance: callers can tell migrated from unmigrated tenants,
so the fallback can never be mistaken for success.

### 8.3 Dual-write wired

| Service | Method | New param |
| --- | --- | --- |
| `operations.service.ts` | `createEnquiry` | `actorUserId?` |
| `rental.service.ts` | `createProperty` | `actorUserId?` |
| `farm-plug.service.ts` | `createFarm` | `actorUserId?` |
| `knowledge.service.ts` | `ingestDocument` | `actorUserId?` |

Routes pass `req.user?.id`. Parameters are **optional**, so existing callers are unaffected.

### 8.4 Side fix — timestamp DTO hardening

While testing, `toPropertyDTO` / `toFarmDTO` were found to throw
`Cannot read properties of null (reading 'toISOString')` when a Prisma provider does not
implement `@updatedAt` (prismock does not). Added `server/lib/utils/iso.ts`
(`toIso`, `toIsoOrNull`) and applied it to every DTO mapper in rental/farm. A read path must
never 500 because a timestamp is missing.

### 8.5 Verification

| Check | Result |
| --- | --- |
| `npx prisma validate` | ✅ valid |
| `npx prisma generate` | ✅ OK |
| `npm run typecheck` | ✅ EXIT 0 |
| `npm run lint` | ✅ 0 errors |
| Tenant + services + routes suites | ✅ **13 files, 135 tests passed, 0 failed** |
| `resolve-active-tenant.test.ts` | ✅ 15 tests |

### 8.6 What step 3 must do → **DONE**

Delivered as `scripts/backfill-tenant-keys.ts`:

- **Dry run by default**; writes only with `--apply`.
- Rewrites only rows whose `createdByUserId` resolves to **exactly one** active team.
  Ambiguous (0 or 2+) matches are reported and skipped, never guessed.
- Every rewrite is recorded in `tenant_key_backfill_log` (a declared Prisma model,
  `TenantKeyBackfillLog`), making the operation auditable and reversible.
- Idempotent: rows already holding a `Team.id` are left alone.

### 8.7 Step 4 — route adoption

Added `server/lib/middleware/tenant-key.middleware.ts`:

- `resolveTenantKey` — mounted after `authMiddleware` on all four product routers.
  Honours an `X-Team-Id` header (membership verified), else the caller's active team,
  else the legacy uid.
- `tenantKeyOf(req)` — **throws** rather than silently falling back to `req.user.id`,
  so a missing middleware fails loudly instead of quietly reverting to uid scoping.

**All 28 `const tenantId = req.user?.id` call sites replaced.**

| File | Sites |
| --- | --- |
| `operations.ts` | 7 |
| `rental.ts` | 9 |
| `farm.ts` | 7 |
| `knowledge.ts` | 5 |

### 8.8 Backfill dry run (live database)

```
operations_enquiries: 0 rows | 0 to rewrite | 0 skipped
properties:           0 rows | 0 to rewrite | 0 skipped
farms:                0 rows | 0 to rewrite | 0 skipped
knowledge_documents:  0 rows | 0 to rewrite | 0 skipped
```

No rows exist yet, so there is nothing to migrate. The script is ready for the
first real data. **When real data arrives, run it (dry run first, then `--apply`).**

### 8.9 Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | ✅ EXIT 0 |
| Middleware tests | ✅ 8/8 |
| Full lib + routes suite | ✅ 240 tests, 0 failed |
| `prisma migrate diff` | ✅ **zero drift** |
| `migrate status` | ✅ 11/11 applied |
