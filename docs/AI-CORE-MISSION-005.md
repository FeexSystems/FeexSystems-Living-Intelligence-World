# FeexSystems AI Core — Mission 005

**Knowledge & Document AI, Cross-Product Integration & Release Readiness**
**Branch:** `feat/ai-core-mission-005` (based on Mission 004 @ `9cf9506`)
**Status:** Implementation complete; migration not applied (no live DB)

---

## 1. Gate 0 — integration baseline (verified)

| Capability | Evidence in repo | Status before 005 |
|---|---|---|
| Private storage adapter | `server/lib/services/gcs.service.ts` (`uploadArtifact`, local fallback) | Present |
| Uploads | `multer` already used in `server/routes/users.ts` | Present |
| Embeddings | `server/lib/services/embedding.service.ts` | Present (provider-dependent) |
| Hybrid retrieval | `server/lib/services/hybrid-retrieval.service.ts` | Present (World Model only) |
| Document models | none found in `prisma/schema.prisma` | **Missing → added** |
| Operations | `OperationsEnquiry` + approval (Mission 001) | Present |
| World Intelligence | `WorldModelInterpretation` (Mission 003) | Present |
| RentAll / FarmPlug | Mission 004 models + services | Present |
| Platform | tenant context, workflow, audit/usage, AI gateway (Mission 002) | Present |

---

## 2. Implemented (Mission 005)

| Area | File |
|---|---|
| Contracts | `shared/knowledge.ts` |
| Validation | `server/lib/validations/knowledge.ts` |
| Pure retrieval primitives | `server/lib/services/knowledge-retrieval.ts` |
| Document service | `server/lib/services/knowledge.service.ts` |
| Routes | `server/routes/knowledge.ts` |
| Schema + migration | `prisma/schema.prisma`, `20261018013000_knowledge_mission_005` |
| Tests | `server/lib/services/__tests__/knowledge-retrieval.test.ts` (10) |

### Ingestion behaviour

1. MIME allow-list: `text/plain`, `text/markdown`, `application/pdf`.
2. Size limit: **5 MB** (enforced by multer and again in the service).
3. SHA-256 content hash for integrity / duplicate detection.
4. Stored via the existing `gcsService.uploadArtifact` (private; local fallback when GCS is unavailable).
5. `text/*` → real native extraction + deterministic chunking with page refs.
6. `application/pdf` → **`EXTRACTION_UNAVAILABLE`** with an explicit error. No OCR provider is configured, so extraction is **never** claimed.

### Evidence-linked Q&A

- Retrieves up to 8 tenant-scoped chunks (optionally restricted to given document ids).
- Model output is schema-validated.
- **Citations are validated against the retrieved chunk ids**; fabricated ids are dropped and counted in `limitations`.
- No model / invalid model → deterministic **extractive** answer citing a real chunk, or an explicit refusal when nothing matches.

### Prompt-injection containment

- Document text is wrapped in `<excerpt chunkId=…>` delimiters.
- The system prompt states the excerpts are **UNTRUSTED DATA**, must be treated as text, and any instructions inside them ignored.
- Test coverage asserts the delimiter and the instruction.

### Security controls

- Every route requires a verified Firebase ID token; tenant is `req.user.id`.
- All reads/writes scoped by tenant — one tenant's chunks can never be returned to another.
- File type and size validated server-side; private storage (no public bucket).
- Structured, redacted errors (no stack traces or provider internals to clients).
- No claim of malware scanning or encryption-at-rest configuration (not verified).

---

## 3. Cross-product integration matrix

| Capability | Operations | World Intelligence | RentAll | FarmPlug | Knowledge |
|---|---|---|---|---|---|
| Firebase auth + `req.user.id` tenant | ✅ | ✅ (auth on `/intelligence`) | ✅ | ✅ | ✅ |
| Zod validation at boundary | ✅ | ✅ | ✅ | ✅ | ✅ |
| Provider-neutral `aiGateway` | ✅ | ✅ | — (fields unused) | ✅ | ✅ |
| Deterministic fallback | ✅ | ✅ | — | ✅ | ✅ |
| Schema-validated model output | ✅ | ✅ | — | partial | ✅ |
| Evidence/citation validation | — | ✅ | — | — | ✅ |
| Human approval gate | ✅ | — | status transitions | advisory review | — |
| Idempotency | ✅ | — | maintenance (time-window) | advisory (time-window) | content hash |
| Audit/usage events | via platform (Mission 002) | usage event | — | — | — |
| Workflow lifecycle | — | — | — | — | — |

Legend: ✅ implemented · partial = implemented with limits · — not applicable / not implemented.

**Shared identifiers are stable** (`teamId` = Firebase uid; `documentId`, `chunkId`, `projectId` are cuid/uuid). No product reads another product's tables directly.

**Integration gaps (explicit):**
- RentAll's `aiRecommendation` / `confidence` fields exist but maintenance requests are **not** AI-classified yet.
- No cross-product object linking (e.g. attach a Knowledge document to a RentAll property or a FarmPlug advisory). Contracts exist; wiring is backlog.
- Operations/World Intelligence do not yet surface Knowledge citations in their UIs.

---

## 4. Release-readiness matrix

Status vocabulary: **PASS** · **PARTIAL** · **BLOCKED** · **FAIL** · **NOT RUN**

### Feex AI Operations
| Dimension | Status | Note |
|---|---|---|
| Functional slice | PASS | intake → classify/draft → approve/reject |
| API / UI | PASS | `/api/operations`, `/operations` |
| Persistence / migration | BLOCKED | migration written, not applied |
| Authorization / isolation | PASS | tenant from token |
| AI + evidence | PARTIAL | deterministic fallback proven; no live model run |
| Automated tests | PASS | unit |
| Build / CI | PASS (local) / NOT RUN (CI on this SHA) | — |
| Risks | — | endpoint contract is authenticated-only |

### Feex World Intelligence
| Dimension | Status | Note |
|---|---|---|
| Functional slice | PASS | canonical context → interpretation with validated citations |
| API / UI | PARTIAL | API done; no inspection UI added |
| Persistence / migration | BLOCKED | migration not applied |
| Authorization / isolation | PASS | auth on interpretation routes |
| AI + evidence | PARTIAL | fabrication dropped; live model not verified |
| Automated tests | PASS | unit |
| Build / CI | PASS (local) / NOT RUN (CI) | — |
| Risks | — | `aiGateway` provider payloads typed `any` |

### RentAll SmartOps
| Dimension | Status | Note |
|---|---|---|
| Functional slice | PASS | property/unit/tenancy/maintenance |
| API / UI | PASS | `/api/rental`, `/rental` |
| Persistence / migration | BLOCKED | migration not applied |
| Authorization / isolation | PASS (by construction) | no cross-tenant route test |
| AI + evidence | NOT RUN | classification not wired |
| Automated tests | PARTIAL | validation only; no service/route tests |
| Build / CI | PASS (local) / NOT RUN (CI) | — |

### FarmPlug AI
| Dimension | Status | Note |
|---|---|---|
| Functional slice | PASS | farm/plot/observation/advisory |
| API / UI | PASS | `/api/farm`, `/farm` |
| Persistence / migration | BLOCKED | migration not applied |
| Authorization / isolation | PASS (by construction) | no cross-tenant route test |
| AI + evidence | PARTIAL | advisory fallback + safety prompt; no citations |
| Automated tests | PARTIAL | validation only |
| Build / CI | PASS (local) / NOT RUN (CI) | — |

### Knowledge & Document AI
| Dimension | Status | Note |
|---|---|---|
| Functional slice | PASS | ingest → chunk → evidence-linked Q&A |
| API / UI | PARTIAL | API done; **no UI** |
| Persistence / migration | BLOCKED | migration not applied |
| Authorization / isolation | PASS (by construction) | no cross-tenant route test |
| AI + evidence | PARTIAL | citation validation proven; no live model |
| Automated tests | PASS | 10 primitives tests (chunking, citations, injection) |
| Build / CI | PASS (local) / NOT RUN (CI) | — |
| Risks | — | PDF extraction unavailable (no OCR); no vector search for docs |

---

## 5. Final validation (executed)

| Command | Result |
|---|---|
| `npx prisma generate` | EXIT 0 |
| `npm run typecheck` | EXIT 0 |
| `vitest --run --project unit` | EXIT 0 — see Gate 4 report for counts |
| `npm run lint` | EXIT 0 — 0 errors |
| `npm run build` | EXIT 0 |
| `prisma migrate deploy` | **NOT RUN** (no live PostgreSQL) |
| `npm run test:e2e` | **NOT RUN** (no Chromium) |

## 6. Known risks

1. **All four missions' migrations are unapplied** — no feature works against a real database yet.
2. **No route-level integration/E2E tests** — authorization is enforced by construction and reviewed, not asserted.
3. **PDF/OCR is unavailable** and reported as such; no document vector search.
4. **No live AI provider verification** — only deterministic and mocked-provider paths.
5. **CI on these commits is NOT RUN** — local checks only.
6. No blanket production-readiness declaration is made.

