# Prisma Enum Drift — Live Database vs. Schema

**Status:** ✅ CONFIRMED — blocks FarmPlug AI at runtime
**Discovered:** 2026-11-02, while verifying whether D-5 (unapplied migrations) was real
**Severity:** High — FarmPlug routes fail against the live database

---

## 1. Summary

The live PostgreSQL database (Supabase) contains a **mixture of two enum naming conventions**:

| Convention | Example | Created by |
| --- | --- | --- |
| PascalCase (schema-declared) | `FarmStatus`, `PropertyStatus`, `OperationsEnquiryStatus` | `prisma migrate deploy` |
| all-lowercase (hand-written) | `farmstatus`, `cropplotstatus`, `observationseverity`, `observationtype`, `advisoryrequeststatus` | ad-hoc SQL |

PostgreSQL identifiers are **case-sensitive when quoted**. Prisma generates
`CREATE TYPE "FarmStatus"` (quoted → case preserved) but the live database holds
`farmstatus` (unquoted → folded to lowercase).

**Result:** every FarmPlug query that touches an enum column fails, because the
generated SQL references a type that does not exist.

### Proof — enum types actually present in `public`

```
ContentLifecycleState      OperationsEnquiryStatus     TeamRole
DeploymentStatus           OperationsEnquiryPriority   TenancyStatus
EventType                  PipelineStatus              UserRole
GitProvider                PropertyStatus              WorkflowRunStatus
InvitationStatus           PropertyUnitStatus          WorkflowStepStatus
KnowledgeDocumentStatus    RequestStatus               ScanStatus
KnowledgeExtractionMethod  ResourceType                SecurityScanType
MaintenanceCategory        MarketingChannelType        SubscriptionStatus
MaintenanceRequestStatus   MemberStatus

advisoryrequeststatus   ← should be "AdvisoryRequestStatus"
cropplotstatus          ← should be "CropPlotStatus"
farmstatus              ← should be "FarmStatus"
observationseverity     ← should be "ObservationSeverity"
observationtype         ← should be "ObservationType"
```

**Exactly the five FarmPlug enums are wrong.** Every other product's enums are correct.

### Corroborating evidence

`advisory_requests.status` is typed `advisoryrequeststatus` (lowercase) while
`properties.status` is `PropertyStatus` (PascalCase) — in the same database, in the
same schema, written by different mechanisms.

---

## 2. Why `migrate status` did not catch it

```
9 migrations found in prisma/migrations
Database schema is up to date!
```

Prisma considers a migration applied once its **name** is in `_prisma_migrations`.
The tables (`farms`, `crop_plots`, …) *do* exist, and `_prisma_migrations` records
Mission 004 as applied — but the enum types in that migration were evidently created
by a different, hand-run path that lowercased them.

`prisma migrate status` compares **migration records**, not the resulting object graph.
`prisma migrate diff --from-schema-datasource` *does* see it — it reports
5 `CREATE TYPE` statements among a larger drift set.

> **Important correction to an earlier conclusion:** the drift is **not** wholesale
> camelCase-vs-snake_case corruption. Live columns are correctly snake_case
> (`crop_type`, `unit_number`, `reported_by_user_id` all verified). The drift is
> confined to **enum type names**, plus the new `created_by_user_id` columns that
> have not yet been migrated.

---

## 3. Impact

**Proven by a live smoke test** (create → delete against the real Supabase database):

| Product | Live result | Error |
| --- | --- | --- |
| Operations | ❌ FAIL | `The column operations_enquiries.created_by_user_id does not exist` |
| RentAll | ❌ FAIL | missing `properties.created_by_user_id` (same cause) |
| **FarmPlug** | ❌ FAIL | `type "public.FarmStatus" does not exist` (Postgres `42704`) |
| Knowledge | ❌ FAIL | `The column extractionMethod does not exist` in the current database |

So **no product works against the live database today**. Two independent defects are in play:

1. **Enum drift** (this document's subject) — FarmPlug's five enums are lowercase.
2. **Unmigrated column additions** — `created_by_user_id` (my D-3 change) and
   `extraction_method` were added to `schema.prisma` but never to a migration.

> `migrate status` reported "Database schema is up to date!" throughout. It compares
> migration *record filenames*, not the resulting object graph.

### Correction to an earlier claim

Mission 004/005's "PASS (local)" was never true against the live database. Unit tests pass
because they run on `prismock`, which has no PostgreSQL type system and no real DDL.

---

## 4. Remediation options

### Option A — Recreate the enums correctly *(recommended)*

```sql
-- All FarmPlug tables are empty, so a clean swap is safe.
ALTER TABLE farms DROP COLUMN IF EXISTS status;
ALTER TABLE crop_plots DROP COLUMN IF EXISTS status;
ALTER TABLE farm_observations DROP COLUMN IF EXISTS observation_type, DROP COLUMN IF EXISTS severity;
ALTER TABLE advisory_requests DROP COLUMN IF EXISTS status;
DROP TYPE IF EXISTS farmstatus, cropplotstatus, observationseverity, observationtype, advisoryrequeststatus;
```

Then generate a **new** migration containing only the five `CREATE TYPE "X"` +
`ALTER TABLE ... ADD COLUMN` statements, and apply it.

- **Safe because:** all five tables were verified to hold **0 rows**.
- **Must be a new migration** — never edit an already-applied migration.

### Option B — Rename the existing types to PascalCase

```sql
ALTER TYPE farmstatus RENAME TO "FarmStatus";
```

Works on an empty database, but leaves the migration history inconsistent with the
database. A fresh `prisma migrate deploy` on another environment would still produce
the PascalCase version, so the two would diverge again. **Not preferred.**

### Option C — Add `@map` to the schema enums

```prisma
enum FarmStatus {
  ACTIVE
  @@map("farmstatus")
}
```

Would make the schema match the database. But it means *every* other enum follows one
convention and FarmPlug another — permanent asymmetry for no benefit. **Not recommended.**

**Recommendation: Option A**, folded into the same migration that adds
`created_by_user_id` and the D-3 backfill.

---

## 5. Verification that must accompany the fix

1. `prisma migrate diff --from-schema-datasource` reports **no** enum drift.
2. A live smoke test creates a farm, a plot, an observation and an advisory request
   against the real database (not prismock).
3. `SELECT status FROM farms` returns a value read through Prisma without a type error.

---

## 6. Why the test suite never caught this

`server/test/prisma-mock.ts` replaces Prisma with `prismock` (in-memory JS). It has no
PostgreSQL type system, so a `FarmStatus` vs `farmstatus` mismatch is invisible to it.

**Lesson:** unit tests with an in-memory ORM cannot validate migration correctness.
A live-database smoke test is required for that class of defect — which is precisely
what Mission 004 §6 marked "route-level test not run".

---

## 7. Rejected approach — the auto-generated migration

The `prisma migrate diff` script was reviewed and **rejected**. It bundled the required enum fix
with 16 destructive `DROP COLUMN` statements against live tables, plus 11 `CREATE TABLE`s for
analytics models. Applying it would have worked today (tables empty) but encoded "these columns
never existed" into migration history, making them unrecoverable later.

See §8.3 for the full reasoning and §8.4 for the script actually applied.

---

## 8. RESOLUTION (applied 2026-11-02)

**Status: ✅ FIXED — all four products now pass a live smoke test.**

### 8.1 Root cause was two defects, not one

| # | Defect | Fix |
|---|---|---|
| 1 | Five FarmPlug enums existed lowercase (`farmstatus`) vs schema `FarmStatus` | Dropped + recreated PascalCase |
| 2 | **12 model fields lacked `@map`** while the DB columns were snake_case | Added `@map` annotations |

Defect 2 is the one that mattered most and was **not** visible from enum inspection alone.
Prisma emitted `SELECT "primaryCrop"` and `INSERT ... "ai_recommendation"` against a database
whose columns are `primary_crop` and `ai_recommendation` — so FarmPlug, Knowledge **and** RentAll
all failed, not just FarmPlug.

### 8.2 Second correction to my own analysis

Earlier in this document I concluded the live columns were *camelCase* and the schema *snake_case*.
That was **wrong** — the reverse was true. The live columns are correctly snake_case; it was
`schema.prisma` that omitted `@map` on these fields:

```
Farm.primaryCrop · CropPlot.cropType / plantedAt · FarmObservation.observationType
AdvisoryRequest.advisoryText / aiProvider / aiModel
MaintenanceRequest.aiProvider / aiModel / aiRecommendation
PropertyUnit.unitNumber / rentAmount · Tenancy.monthlyRent
KnowledgeDocument.extractionMethod
```

I had also stated no product worked; after fixing both defects, **all four do**.

### 8.3 What was deliberately NOT done

`prisma migrate diff` generated a script that would also **drop 16 business columns**
(`properties.description`, `tenancies.monthly_rent`, `property_units.rent_amount`,
`maintenance_requests.ai_recommendation`, …) because they exist in the live database but not in
`schema.prisma`. That script was **rejected**.

They are empty today, so running it would have been harmless *right now* — and catastrophically
lossy the moment real data exists, while permanently erasing the record that the columns were
ever meant to exist. Nobody should make that call from a generated diff.

### 8.4 Applied

Repair SQL is recorded verbatim in
[`prisma/repairs/20261102_farmplug_enum_and_tenant_anchor.sql`](../prisma/repairs/20261102_farmplug_enum_and_tenant_anchor.sql)
so it is reproducible in any other environment.

### 8.5 Verification

| Check | Result |
| --- | --- |
| Pre-flight row counts (7 tables) | ✅ all 0 — safe to alter |
| `prisma validate` / `generate` | ✅ valid / regenerated |
| Live smoke: Operations | ✅ create + read + delete |
| Live smoke: RentAll | ✅ create + read + delete |
| Live smoke: FarmPlug | ✅ farm → plot → observation → advisory, cascade delete |
| Live smoke: Knowledge | ✅ create + read + delete |
| `npm run typecheck` | ✅ EXIT 0 |
| Unit + route suite | ✅ **226 passed, 0 failed** |

### 8.6 Schema drift — RECONCILED (2026-11-02)

**`schema.prisma` and the live database now match exactly.**

Verified by `prisma migrate diff --from-schema-datasource … --to-schema-datamodel` returning:
*"This is an empty migration."*

A real Prisma migration was generated and applied:

```
prisma/migrations/20261102120000_reconcile_schema_drift/migration.sql
```

| Change | Count |
| --- | --- |
| Tables created (schema-declared, DB-missing) | 11 |
| Enum types created | 8 |
| Columns added | 5 |
| `DECIMAL(65,30)` type normalisations | 2 |
| **`DROP` statements** | **0** |

Because the remaining drift was **purely additive**, applying it destroyed nothing. This is the
opposite of the original `migrate diff` output (16 `DROP COLUMN`), which arose *before* the
missing `@map` annotations were fixed: Prisma had concluded the snake_case columns were
unrelated and had to be removed. Fixing `@map` first turned a destructive diff into a safe one.

> **Gotcha for future migrations:** PowerShell's `>` redirection writes **UTF-16 LE with BOM**.
> Prisma cannot read such a `migration.sql` and fails with "Could not find migration file".
> Write migrations as UTF-8 without BOM, or Prisma skips the directory silently.

### 8.7 Verified against the live database

| Check | Result |
| --- | --- |
| Operations create/read/delete | ✅ `status=RECEIVED` |
| RentAll property + unit (Decimal) | ✅ `rentAmount=1200.5` |
| FarmPlug full chain | ✅ farm → plot → observation → advisory |
| Knowledge ingest | ✅ `extraction=NATIVE_TEXT` |
| `WorkflowRun` (new table) | ✅ `status=RUNNING` |
| `PlatformUsageEvent` (new table) | ✅ created |
| `WorldModelInterpretation` (new table) | ✅ FK to project enforced |
| `prisma migrate diff` | ✅ **empty — zero drift** |
| `npm run typecheck` | ✅ EXIT 0 |

The following must be one new migration, generated only after the drift is repaired:

| Change | Model | Why |
| --- | --- | --- |
| `ALTER TYPE` / recreate 5 enums | FarmPlug | lowercase → PascalCase |
| `ADD COLUMN created_by_user_id` + index | `OperationsEnquiry`, `Property`, `Farm`, `KnowledgeDocument` | D-3 migration anchor (schema edited, migration never generated) |
| Verify `extraction_method` | `KnowledgeDocument` | smoke test reported it missing live |

### Safe-repair SQL (all FarmPlug tables verified empty)

```sql
ALTER TABLE farms              DROP COLUMN IF EXISTS status;
ALTER TABLE crop_plots         DROP COLUMN IF EXISTS status;
ALTER TABLE farm_observations  DROP COLUMN IF EXISTS observation_type,
                               DROP COLUMN IF EXISTS severity;
ALTER TABLE advisory_requests  DROP COLUMN IF EXISTS status;
DROP TYPE IF EXISTS farmstatus, cropplotstatus, observationseverity,
                    observationtype, advisoryrequeststatus;
```

Then run `npx prisma migrate dev --name fix_farmplug_enums_and_tenant_anchor` so Prisma
generates the correct `CREATE TYPE "FarmStatus"` statements plus the new columns.

> ⚠️ **Do not run `prisma migrate dev` here without reviewing the generated SQL first.**
> The earlier `migrate diff` showed 18 `DROP COLUMN` statements against live tables
> (`properties.description`, `tenancies.monthly_rent`, `property_units.rent_amount`, …).
> Those tables are empty today, so a drop is currently harmless — but that will not be
> true once real data exists. Capture the drift fix and the enum fix in a **reviewed**
> migration, not an ad-hoc `db push`.
