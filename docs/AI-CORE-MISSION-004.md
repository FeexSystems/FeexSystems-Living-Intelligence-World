# FeexSystems AI Core — Mission 004

**RentAll SmartOps & FarmPlug AI — Domain Product Modules**
**Status:** In progress (Gate 0 verified, implementation in progress)
**Branch:** `feat/ai-core-mission-004` (based on `feat/ai-core-mission-003` @ `b96242e`)
**Precondition:** Mission 002 shared platform applied; Mission 003 World Intelligence applied.

---

## 1. Gate 0 — Verified repository facts

| Area | Finding |
|---|---|
| Branch | `feat/ai-core-mission-003` (Mission 001+002+003 merged through `b96242e`) |
| Working tree | Clean |
| Tenant model | `Team` + `TeamMember` (`TeamRole`: OWNER/ADMIN/MEMBER/VIEWER) — reused as tenant boundary |
| Auth | Firebase ID tokens → `authMiddleware` → `req.user`; `req.user.id` is tenant-scoped user id |
| Tenant context | `server/lib/tenant/context.ts` — `resolveTenantContext`, `requireTenant()` middleware |
| Validation | Zod (`server/lib/validations/*`) |
| Services | `server/lib/services/*` pattern (service class + exported singleton) |
| Routes | `server/routes/*.ts` — express.Router, `authMiddleware`, `rateLimit`, `validateRequest` |
| Frontend | React Router lazy routes in `client/App.tsx`; `apiClient` with `getIdToken` from `useFirebaseAuth`; `client/pages/*` pages |
| Prisma | 50+ models; snake_case `@map`; `cuid()` ids; `@@index` patterns |

### Existing RentAll / FarmPlug presence
**None.** No models, routes, pages, or services reference `rental`, `rentall`, `farmplug`, or `farm` anywhere in `client/`, `server/`, or `shared/`. This is greenfield domain work.

### Existing models suitable for reuse (do NOT duplicate)
| Concern | Existing model | Reuse decision |
|---|---|---|
| Tenant | `Team` | Reuse as `teamId` foreign key |
| Membership | `TeamMember` + `TeamRole` | Reuse for access control |
| Workspace | `Workspace` | Reuse if needed |
| AI provider | `aiGateway` (`gemini\|openai\|none`) | Reuse for AI classification/advice |
| Audit | `TeamActivityLog` via `PlatformAuditService` | Reuse for audit events |
| Usage | `PlatformUsageEvent` (Mission 002) | Reuse for usage recording |

### Baseline checks
- `npm run typecheck` → EXIT 0
- `vitest --run --project unit` → EXIT 0 (1338 passed / 69 skipped)
- `npm run lint` → EXIT 0 (0 errors)
- `npm run build` → EXIT 0

---

## 2. Domain models (additive Prisma schema)

### RentAll SmartOps
| Model | Purpose | Key fields |
|---|---|---|
| `Property` | Rental property | `teamId`, `name`, `address`, `status`, `ownerId` |
| `PropertyUnit` | Unit within property | `propertyId`, `unitNumber`, `status`, `bedrooms`, `bathrooms`, `rentAmount` |
| `Tenancy` | Lease/tenancy record | `propertyId`, `unitId`, `tenantUserId`, `startDate`, `endDate`, `status`, `monthlyRent` |
| `MaintenanceRequest` | Maintenance request | `propertyId`, `unitId`, `tenancyId`, `reportedByUserId`, `title`, `description`, `category`, `priority`, `status` |

### FarmPlug AI
| Model | Purpose | Key fields |
|---|---|---|
| `Farm` | Growing operation | `teamId`, `name`, `location`, `size`, `primaryCrop`, `status` |
| `CropPlot` | Plot within farm | `farmId`, `name`, `cropType`, `plantedAt`, `area`, `status` |
| `FarmObservation` | Observation/issue report | `plotId`, `reportedByUserId`, `observationType`, `description`, `severity`, `observedAt` |
| `AdvisoryRequest` | AI advisory request | `plotId`, `reportedByUserId`, `question`, `observations`, `advisoryText`, `aiProvider`, `confidence`, `status` |

### Design constraints
- All models have `teamId` for tenant isolation (except `FarmObservation`/`AdvisoryRequest` which inherit via plot/farm)
- No cross-product entity sharing: property ≠ farm, tenancy ≠ plot, maintenanceRequest ≠ advisoryRequest
- Status enums explicit per domain
- `aiProvider` / `confidence` recorded on advisory requests (interpretation provenance)

---

## 3. API contracts

### RentAll SmartOps (`/api/rental`)
| Method | Path | Description |
|---|---|---|
| POST | `/properties` | Create property |
| GET | `/properties` | List tenant's properties |
| GET | `/properties/:id` | Get property |
| POST | `/properties/:id/units` | Add unit |
| GET | `/units` | List tenant's units |
| POST | `/maintenance-requests` | Create maintenance request |
| GET | `/maintenance-requests` | List tenant's requests |
| GET | `/maintenance-requests/:id` | Get request |
| PATCH | `/maintenance-requests/:id/status` | Status transition |

### FarmPlug AI (`/api/farm`)
| Method | Path | Description |
|---|---|---|
| POST | `/farms` | Create farm |
| GET | `/farms` | List tenant's farms |
| GET | `/farms/:id` | Get farm |
| POST | `/farms/:id/plots` | Add plot |
| GET | `/plots` | List tenant's plots |
| POST | `/plots/:id/observations` | Add observation |
| GET | `/observations` | List tenant's observations |
| POST | `/advisory-requests` | Request AI advisory |
| GET | `/advisory-requests` | List tenant's advisory requests |
| GET | `/advisory-requests/:id` | Get advisory request |

All routes require Firebase auth; `tenantId` = `req.user.id`; team membership verified via `resolveTenantContext` where team-scoped operations needed.

---

## 4. Acceptance criteria

- Unauthorized users cannot access another tenant's property/farm/unit/plot records
- Invalid status transitions rejected (409)
- Idempotent submission via `idempotencyKey` where retries possible
- AI recommendations labeled as recommendations, never authorize actions
- Tests: create, retrieve, update, validation, permissions, failure handling
- typecheck / lint / unit tests / build all EXIT 0

---

## 5. Implemented (Gate 2)

| Area | File |
|---|---|
| Domain contracts | `shared/rental.ts` |
| Validation | `server/lib/validations/rental.ts` (+ tests) |
| RentAll service | `server/lib/services/rental.service.ts` |
| RentAll routes | `server/routes/rental.ts` |
| FarmPlug service | `server/lib/services/farm-plug.service.ts` |
| FarmPlug routes | `server/routes/farm.ts` |
| Schema | `prisma/schema.prisma` + `20261017235900_operations_mission_004` |
| UI | `client/pages/RentAll.tsx`, `client/pages/FarmPlug.tsx` (`/rental`, `/farm`) |

### Tenant isolation approach

Both services scope every read and write by `teamId = req.user.id` (the verified
Firebase uid). A resource belonging to another tenant is indistinguishable from a
missing resource (`404`). Cross-property/cross-farm nested lookups (units,
tenancies, plots, observations) verify the parent belongs to the caller's tenant
before creating children.

### AI safety

Advisory text is generated through the provider-neutral `aiGateway`. The system
prompt forbids pesticide/chemical/dosage/regulatory instructions and requires
referral to a local agronomist. When no provider credential is configured the
service returns a clearly-worded deterministic advisory with `aiProvider =
"deterministic"` and `confidence = 0`. Advisory output is always a recommendation
and never authorises spending, repairs or tenant communication.

## 6. Gate evidence

| Gate | Evidence | Status |
|---|---|---|
| A — Domain integrity | This document: entities + lifecycle + status enums | **PASS** |
| B — RentAll slice | Property/unit/tenancy/maintenance create+list+status routes; validation tests | **PASS (unit-verified)** |
| C — FarmPlug slice | Farm/plot/observation/advisory routes; validation tests | **PASS (unit-verified)** |
| D — Isolation | All reads/writes filtered by `teamId`; nested lookups verify parent ownership | **PASS (by construction; route-level test not run)** |
| E — AI reliability | Missing credential → deterministic advisory; invalid output → fallback | **PASS (logic; provider path mocked)** |
| F — Regression | typecheck / unit / lint / build — see Gate 4 report | **PASS** |

### Explicitly NOT done

- Migration written but **not applied** (no live PostgreSQL).
- No route-level integration test through Express (service/validation covered by unit tests + typecheck).
- No notification integration — the UI states nothing was sent.
- RentAll does not yet classify/prioritise maintenance via AI (fields exist and are nullable; backlog).

