# FeexSystems AI Core — Mission 001

**Status:** In progress (bounded first increment)
**Branch:** `feat/ai-core-mission-001`
**Baseline commit:** `f6f9480`

---

## 1. Purpose

This document is the Gate 1 deliverable for Mission 001: an evidence-based map of the
existing platform, the shared foundation plan for five AI products, and the
specification for the first bounded vertical slice (**Feex AI Operations**).

Nothing in this document asserts production readiness. Every claim about the
repository is traceable to a file path or a command result recorded in Gate 0/Gate 3.

---

## 2. Repository truth (Gate 0 findings)

| Area | Finding |
|---|---|
| Runtime | Node **v24.15.0** local; `package.json` engines pin **22.x** (CI uses 22) |
| Frontend | React 18 + React Router 7 + Vite 6 + TypeScript + Tailwind 4, SPA in `client/` |
| Backend | Express 5 (`server/index.ts`) + `firebase-functions` v2 export |
| Data | PostgreSQL via Prisma (`prisma/schema.prisma`, 50+ models); Firestore for realtime; Data Connect (`dataconnect/`) for World Model SQL |
| Cache/queue | Redis + Bull (`server/lib/redis.ts`, `ai-queue.service.ts`) |
| AI | Provider-neutral `aiGateway` (`server/lib/services/ai-gateway.service.ts`) → `gemini \| openai \| none`; returns `null` when no key |
| Auth | **Firebase Auth is the single source of truth**; server verifies Firebase ID tokens (`auth.middleware.ts`) |
| Validation | Zod (`server/lib/validations/*`, `zod@^3`) |
| Tests | Vitest (`unit` + `storybook` projects), Playwright (`e2e/`) |
| CI | `.github/workflows/*.yml` — test, deploy, lighthouse, living-documentation, smoke |

### Baseline command results (Gate 0)

| Command | Result |
|---|---|
| `npm run typecheck` | EXIT 0 |
| `npm run lint` | EXIT 0 — 0 errors, 859 warnings |
| `vitest --run --project unit` | EXIT 0 — 109 files passed / 6 skipped, 1280 tests passed / 69 skipped |
| `npm run build` | EXIT 0 (`dist/spa`, `dist/server/node-build.mjs`) |

> Note: `npm test` cannot run verbatim in this sandbox because the installed Node is
> 24.x while `pretest` enforces 22.x. Tests were invoked through Vitest directly.
> The `storybook` project needs a Chromium binary that is not installed here.

---

## 3. Architecture map (existing, reused — not replaced)

```
client/  ── React SPA ──► /api/*  ──► server/routes/*.ts ──► server/lib/services/*
   │                                        │                        │
   │ Firebase ID token                      │ Zod validation         │ Prisma
   ▼                                        ▼                        ▼
Firebase Auth                        auth.middleware.ts        PostgreSQL (Cloud SQL)
                                                                    │
                                            aiGateway ──► Gemini / OpenAI (optional)
```

**Conventions reused for Mission 001**

- Routes: one `express.Router()` per file, mounted in `server/index.ts`.
- Auth: `authMiddleware` from `server/lib/middleware/auth.middleware.ts`; `req.user.id` is the tenant key.
- Validation: Zod schemas in `server/lib/validations/`.
- Persistence: Prisma models in `prisma/schema.prisma` with `@@map` snake_case tables.
- AI: `aiGateway.generateObject<T>()`; `null` ⇒ deterministic fallback.
- Frontend: lazy route in `client/App.tsx`, `apiClient` for authenticated calls.
- Errors: `{ success: false, error: { type, message, code } }`.

No second architecture, no repository restructure, no new framework, no new
runtime dependency is introduced by this mission.

---

## 4. Five-product portfolio and boundaries

| # | Product | Purpose | Boundary in this repo |
|---|---|---|---|
| 1 | **Feex AI Operations** | Classify and draft responses to inbound enquiries; human-approved | **Implemented (bounded)** in this mission |
| 2 | **Feex World Intelligence** | Evidence-grounded engineering intelligence | Existing (`world-model`, `evidence`, `navigator`, `omni`) |
| 3 | **RentAll SmartOps** | Property operations | Not implemented — backlog |
| 4 | **FarmPlug AI** | Agricultural knowledge & decisions | Not implemented — backlog |
| 5 | **Feex Knowledge & Document AI** | Extraction + retrieval | Partially served by `EMBEDDINGS.md` / hybrid retrieval — backlog |

**Shared platform requirements (all five products)**

1. Firebase Auth identity; server-side authorisation on every route.
2. Tenant isolation by `req.user.id` (or an owned workspace id).
3. Zod validation at the boundary; typed contracts.
4. Prisma persistence; migrations reviewed before apply.
5. Provider-neutral AI via `aiGateway` with a deterministic fallback.
6. Canonical facts separate from model interpretation (store `aiProvider`, `aiModel`, `confidence`).
7. Idempotency for retryable writes.
8. Human approval before consequential external action.
9. Workflow state + errors recorded.
10. No secrets in browser code; no fabricated external success.

---

## 5. Feex AI Operations — first vertical slice (Gate 2 spec)

**Goal:** accept an enquiry, classify it, draft a response, and require an explicit
human approval — without ever performing an external action (no email, booking or
payment) and without fabricating success.

### Workflow

```
POST /api/operations/enquiries
  → validate (Zod)
  → persist (idempotent on tenantId + idempotencyKey)
  → classify + draft (aiGateway, else deterministic fallback)
  → status: PENDING_APPROVAL (or FAILED on error)
  → record events

POST /api/operations/enquiries/:id/approve | /reject
  → owner-only
  → status: APPROVED | REJECTED
  → record event (+ approvedBy, approvedAt)
  → NO external side effect
```

### API contract (`/api/operations`)

All routes require a Firebase ID token (`Authorization: Bearer <idToken>`).

| Method | Path | Body / Query | Result |
|---|---|---|---|
| `POST` | `/enquiries` | `{ contactName, contactEmail, company?, subject, message, source?, idempotencyKey }` | `201` created · `200` replayed · `400` invalid |
| `GET` | `/enquiries` | `?status=&limit=` | tenant-scoped list |
| `GET` | `/enquiries/:id` | — | `200` · `404` if not owned |
| `POST` | `/enquiries/:id/approve` | `{ note? }` | `200` · `409` if not `PENDING_APPROVAL` |
| `POST` | `/enquiries/:id/reject` | `{ note? }` | `200` · `409` if not `PENDING_APPROVAL` |
| `GET` | `/health` | — | `{ authMode: "firebase", ai: "configured" \| "deterministic-fallback" }` |

Response envelope matches existing routes:
`{ success: true, data, timestamp }` / `{ success: false, error: { type, message, code } }`.

### Data model (Prisma)

```
OperationsEnquiry
  id, tenantId, idempotencyKey, source,
  contactName, contactEmail, company?, subject, message,
  status (RECEIVED|PENDING_APPROVAL|APPROVED|REJECTED|FAILED),
  category?, priority (LOW|NORMAL|HIGH|URGENT), confidence?,
  summary?, draftResponse?, aiProvider?, aiModel?, error?,
  approvedAt?, approvedBy?, createdAt, updatedAt
  @@unique([tenantId, idempotencyKey])
  @@index([tenantId, createdAt]) @@index([status])

OperationsEnquiryEvent
  id, enquiryId, type, fromStatus?, toStatus?, detail?, createdAt
```

`tenantId` is the Firebase-authenticated user id. `aiProvider` / `confidence` record
model provenance so an interpretation is never confused with a canonical fact.

### Security model

- **Authorisation:** every route sits behind `authMiddleware`; `tenantId` comes from
  the verified token, never from the request body.
- **Tenant isolation:** all reads/writes filtered by `tenantId`; cross-tenant access → `404`.
- **Input validation:** Zod at the boundary; message length bounded.
- **No secrets in the browser:** the AI key is read only server-side by `aiGateway`.
- **No fabricated actions:** approval records a decision only; no email or external mutation.
- **Idempotency:** `(tenantId, idempotencyKey)` uniqueness prevents duplicate processing.
- **Auditability:** every transition writes an `OperationsEnquiryEvent`.

### Acceptance criteria

1. Valid enquiry → persisted, classified, `PENDING_APPROVAL`.
2. Same `idempotencyKey` → same record returned, no duplicate.
3. Missing/invalid fields → `400` validation error.
4. No AI credentials → deterministic classification + templated draft (`aiProvider = "deterministic"`).
5. With AI credentials → output validated; invalid output falls back deterministically.
6. Approve/reject by owner → status changes; event recorded; no external call.
7. Cross-tenant access → `404`.
8. Failure paths record `status = FAILED` + error event.
9. UI shows status, category, priority, draft, provider badge, and errors.

---

## 6. Implementation backlog (post-Mission 001)

| Priority | Item |
|---|---|
| P0 | Public (anonymous) intake with tenant routing + anti-abuse |
| P0 | Apply the Prisma migration to staging/production (reviewed) |
| P1 | In-app notification when an enquiry needs approval |
| P1 | Audited outbound email adapter triggered only after approval |
| P1 | Pagination + full-text search over enquiries |
| P2 | RentAll SmartOps, FarmPlug AI, Document AI slices reusing this contract |
| P2 | Per-tenant rate limits and quotas |
| P2 | OTel spans per workflow stage |

---

## 7. Gaps and risks (explicit)

- **Migration not applied.** Schema changes are committed but no live database was
  available; `prisma migrate deploy` must run before the feature works in any environment.
- **No public intake.** The slice is authenticated-only; anonymous customer intake is backlog.
- **No external action.** By design the approval step performs no email/booking/payment.
- **Sandbox verification limits.** Node 24 vs pinned 22; no Chromium for storybook/Playwright;
  no live Postgres/Redis/Firebase.
- **AI output is an interpretation.** `aiProvider`/`confidence` are stored, and the draft
  requires human approval before it can ever be used.
