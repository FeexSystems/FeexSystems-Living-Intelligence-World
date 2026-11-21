# AGENT 09 — QA & VERIFICATION
## Test Strategy and Acceptance Criteria — REVISED (v2)

**G5 Planning Deliverable — Documentation Only**

- **Status:** PLANNING — no tests may be executed against unmerged implementation
- **Supersedes:** the first Agent 09 draft, which Agent 00 reviewed as **NOT READY** due to systematic contract mismatches (symbols, fields, and safety models that do not exist in the live EIL package)
- **Authorized by:** PR #67 (G5 planning authorization)
- **Depends on:** PR #68 (Agent 02 baseline), PR #69 (Agent 03 flow map), PR #70 (Agent 05 adapter plan — merged `72df9ea9`)
- **Implementation baseline:** PR #57 (`30fe4963`)
- **EIL implementation source baseline:** `c60d7efb2cb5bae621b5c64493f718512d40cb03` (the source baseline reviewed for this strategy; later `main` commits in this planning chain are documentation-only)

> ⚠️ **THIS DOCUMENT IS DOCUMENTATION ONLY.** No code may be written, run, or merged under this document's authority. Implementation tests require a separate G5 implementation authorization, which only the human owner may grant — Agent 00 recommends, the owner decides.

---

## 1. Scope and purpose

This strategy defines test suites and pass/fail acceptance criteria for the G5 first slice **as bounded by Agent 05 §8**: a **client-side, ephemeral EIL integration** — contract validation, local EventBus, renderer projection, speech lifecycle, Navigator response normalization — with **no** new World Model writes, EIL persistence, network requests, transports, tool execution, or robotics actions.

Every test ID below references **verified live exports** in `packages/feex-eil/` at the pinned baseline. Where the earlier draft assumed symbols that do not exist (`isValidAgentState`, `AGENT_STATE_MAX_TIER`, `PerceptionKind`, `trustLevel`, `makeStateChangeEvent`, `IHoloKaiAdapter`, `destroy()`, `agentState`/`mode`/`dpr` props), this revision either maps to the real symbol or drops the test as out-of-contract.

### 1.1 What this covers

- EIL contract unit tests (against `packages/feex-eil/contracts/` + `interaction/`)
- Renderer projection tests (against `packages/feex-eil/renderer/`)
- EventBus / agent-state-machine behavior tests
- Speech lifecycle, permission, and Navigator-normalization tests (Agent 05 §8 items 5, 8)
- Negative tests proving the client-only slice introduces no network/persistence/actuation path (Agent 05 §8 item 11)

### 1.2 What this does not cover

- Test implementation code (unauthorized until G5 implementation gate)
- E2E browser automation against production (G6)
- Performance benchmarking / 60 FPS measurement (G6)
- Physical robotics / `PHYSICAL_COMMAND` execution paths (post-G7, separate safety authorization)
- Any HoloKai backend adapter — Agent 05's first slice is client-only; a HoloKai backend contract remains an open decision (Agent 03 §6 Q3)

---

## 2. Review items and corrections to the programme record

### 2.1 EIL schema-version discrepancy — OPEN, pending Agent 02 disposition

| Source | Label |
|---|---|
| Contract file headers (`agent-state.ts:3`, `perception-event.ts:3`, etc.) | `v0.1.0` — header value; semantics unresolved |
| `contracts/schema-version.ts:12` | `EIL_SCHEMA_VERSION = "1.0.0"` — schema-version constant |

**Evidence established:** the renderer imports contract types from `packages/feex-eil/contracts/` via `../contracts/*` — **no local contract copy exists** (verified: `renderer/HumanoidStateAdapter.ts:7-8`, `HumanoidScene.tsx`). The earlier draft's "stale draft import" risk is therefore void.

**Status: UNRESOLVED — pending Agent 02 disposition.** Whether the contract-header `v0.1.0` and `EIL_SCHEMA_VERSION` value `1.0.0` denote distinct version axes or a genuine versioning defect is unresolved. This document does not assign semantics to either label or decide the governance question. Agent 02 must rule on the semantics; if a defect is found, a contract amendment requires separate approval. No schema change is proposed here.

### 2.2 HoloKai adapter interface — not finalized, by design

Agent 05 §9 (A05-01..07) describes **logical responsibilities**, not approved TypeScript declarations. Tests in this strategy therefore target **contract-level behavior** (EventBus routing, evidence requirements, disclosure derivation) rather than assumed adapter method signatures (`onInteractionEvent`, `emitKnowledgeQuery`, `IHoloKaiAdapter` — none exist). Adapter-shape tests are deferred until an implementation proposal defines the interface.

### 2.3 Route-count reconciliation

- Earlier estimate "~292 Express registrations" — unverified approximation.
- Agent 02 baseline: **391** `router./app.` method-call matches at `main@5aade20` — includes `.use()` middleware mounts, not just endpoint handlers.
- **Methodology note:** the 391 figure counts call expressions, not distinct HTTP endpoints. Migration planning must use per-router file inventory (`server/routes/` — 32 files, mounts at `server/index.ts:197-204` et al.), not either bare number. Both figures are superseded by file-level evidence.

### 2.4 Backend-branch alignment

Agent 05's first slice is **client-only and ephemeral**: it consumes existing Navigator/REST responses and local browser APIs. It introduces **no new backend integration**, so it operates within **Branch A (status quo)** without assuming Branch B or C. The Agent 03 conclusion that "Branch C is the only incremental path" applies to *server-side* integration flows; the client-only first slice does not reach that decision point. This is now explicit.

### 2.5 Existing test assets — extend, don't duplicate

| Existing file | Coverage | Tests |
|---|---|---|
| `packages/feex-eil/tests/contracts.test.ts` | Contract schemas/validators | — |
| `packages/feex-eil/tests/agent-state-machine.test.ts` | State machine transitions | — |
| `packages/feex-eil/tests/humanoid-renderer.test.ts` | Renderer projection | — |
| **Total existing** | | **58** (verified: 58/58 pass in G4 exact-SHA run) |

New tests **extend these files** (or add sibling files in `packages/feex-eil/tests/`). No new `__tests__/` or `__integration__/` directory is created without justification — the existing Vitest projects already cover contracts, interaction, and renderer. The 58 existing tests must remain green; new tests extend, not replace.

---

## 3. Contract unit tests

**Location:** extend `packages/feex-eil/tests/contracts.test.ts` (and siblings). Runner: existing Vitest config. Every symbol below was verified against source at `main@c60d7ef`.

### 3.1 AgentState (`contracts/agent-state.ts`, `contracts/interaction-event.ts`)

| ID | Test | Real API under test | Pass criterion |
|---|---|---|---|
| AS-01 | All 9 states valid | `AGENT_STATES` (9 members), `AgentState` union | 9/9 members recognized |
| AS-02 | Transition table complete & frozen | `VALID_TRANSITIONS` — `Object.isFrozen` at module + per-state level | Frozen; every `AgentState` key present |
| AS-03 | Legal transitions accepted | `isValidAgentStateTransition(from,to)` e.g. IDLE→LISTENING, THINKING→RESPONDING, EXECUTING→IDLE | `true` |
| AS-04 | Illegal transitions rejected | e.g. IDLE→EXECUTING, OFFLINE→THINKING, EXECUTING→OFFLINE | `false` |
| AS-05 | Evidence-required states | `EVIDENCE_REQUIRED_STATES` = `["RESPONDING","EXECUTING"]`; `transitionRequiresEvidence(to)` | Exact set match |
| AS-06 | AgentStateEvent schema | `agentStateEventSchema`, `parseAgentStateEvent` — valid payload parses; missing `eventId`/`agentId`/`state`/`previousState`/`timestamp`/`source`/`evidenceRefs` rejected | Accept/reject per schema |
| AS-07 | EvidenceRefs required on RESPONDING/EXECUTING events | `parseAgentStateEvent` with `state:"RESPONDING"`, `evidenceRefs:[]` | Rejected (contract rule: non-empty required) |
| AS-08 | Confidence omission honored | Event without `confidence` parses; no default injected | `confidence === undefined` |
| AS-09 | Animation guidance map | `AGENT_STATE_ANIMATION` (`interaction-event.ts:115`) — 9 keys, one per `AgentState` | Full coverage, values are strings |
| AS-10 | Impact levels | `IMPACT_LEVELS` = `["LOW","MEDIUM","HIGH"]`; `requiresConfirmation(event)` true iff `impactLevel==="HIGH"` | Exact |

*Correction vs. draft:* `isValidAgentState`, `isValidTransition`, `AGENT_STATE_MAX_TIER`, `AGENT_STATE_ANIMATION`-in-agent-state, T0–T6 tiers — **none exist**. Safety is expressed via `ImpactLevel` + `authorized` + `isPhysicalExecutionPermitted`, not tier maps.

### 3.2 PerceptionEvent (`contracts/perception-event.ts`)

| ID | Test | Real API | Pass criterion |
|---|---|---|---|
| PE-01 | Required fields enforced | `perceptionEventSchema`/`parsePerceptionEvent`: `eventId`, `timestamp`, `modality`, `confidence`, `interactionAllowed` | Valid parses; each missing field rejected |
| PE-02 | Modality vocabulary | `PERCEPTION_MODALITIES` = `["hand","face","pose","audio"]` | Exact set; invalid modality rejected |
| PE-03 | `interactionAllowed` never defaults | Event without the field → parse failure; `PermissionSnapshot.interactionAllowed` explicit | Rejected when absent |
| PE-04 | Confidence required & ranged | `confidence` missing → reject; `<0` or `>1` → reject | Schema enforcement |
| PE-05 | GestureEvent linkage | `gestureEventSchema`: `sourceEventId`, `durationMs`, `bimanual`, inherited `interactionAllowed` | Valid/invalid parse |
| PE-06 | Permission revocation semantics | `isPermissionRevoked(status)` — true for `REVOKED`,`DENIED`,`ERROR`; false for `GRANTED`,`PROMPT` | Exact per state |
| PE-07 | Landmark shape | `Landmark` `{x,y,z?,visibility?}` optional fields | Type-level + schema |

*Correction vs. draft:* fields are `eventId`/`timestamp`/`modality`/`confidence`/`interactionAllowed` — not `id`/`sessionId`/`PerceptionKind`/`PERCEPTION_CONFIDENCE_THRESHOLD`.

### 3.3 Evidence (`contracts/evidence-reference.ts`)

| ID | Test | Real API | Pass criterion |
|---|---|---|---|
| ER-01 | Epistemic vocabulary | `EPISTEMIC_STATUSES` — 6 values: ESTABLISHED, SCHOLARLY_DEBATE, TRADITION, ESOTERIC, SPECULATIVE, FICTIONAL | Exact set |
| ER-02 | EvidenceReference required fields | `evidenceReferenceSchema`/`parseEvidenceReference`: `evidenceId`, `entityId`, `source` (non-empty), `epistemicStatus` | Missing/empty rejected |
| ER-03 | Bundle computation | `buildEvidenceBundle(correlationId, refs)` → `lowestEpistemicStatus`, `containsFictional`, `requiresDisclosure` | Computed correctly |
| ER-04 | Lowest-status ranking | `lowestStatus(refs)` via `EPISTEMIC_RANK`; empty refs → `"SPECULATIVE"` | Exact |
| ER-05 | Disclosure derivation | `disclosureForBundle(bundle)` — FICTIONAL→REQUIRED; SPECULATIVE/ESOTERIC→PROMINENT; weaker-than-ESTABLISHED→SUBTLE; all-ESTABLISHED→NONE | Exact per case; **recomputed from references, not trusted flags** (fail-closed, per docstring) |
| ER-06 | Bundle schema round-trip | `evidenceBundleSchema`, `parseEvidenceBundle` | Valid parses; tampered flags don't weaken disclosure |
| ER-07 | FICTIONAL labeling invariant | Any bundle containing FICTIONAL ref → `requiresDisclosure`/`disclosureForBundle` REQUIRED | Always |

*Correction vs. draft:* the live model is `EpistemicStatus`/`EvidenceReference`/`EvidenceBundle`/`disclosureForBundle` — **not** `trustLevel`, `VERIFIED/GROUNDED/ASSERTED/SYNTHETIC`, `canWriteToWorldModel`, `makePREvidence`, `EIL_RENDERER_MERGE_EVIDENCE`, or `groundingReferences`. Those symbols do not exist and are removed.

### 3.4 InteractionEvent + embodied action (`contracts/interaction-event.ts`, `embodied-action.ts`)

| ID | Test | Real API | Pass criterion |
|---|---|---|---|
| IE-01 | Event schema | `interactionEventSchema`/`parseInteractionEvent`: `eventId`, `timestamp`, `channel`, `intent`, `impactLevel`, `authorized` | Valid parses; missing required rejected |
| IE-02 | Channel vocabulary | `INTERACTION_CHANNELS` = voice/gesture/keyboard/system/telemetry | Exact set |
| IE-03 | HIGH-impact confirmation | `requiresConfirmation(event)` | true iff HIGH |
| IE-04 | Gesture→intent map | `GESTURE_INTENT_MAP` (6 registered gestures) — all intents dot-notation, impactLevels within LOW/MEDIUM | Map integrity; no HIGH gesture intent in first release |
| IE-05 | Action categories | `ACTION_CATEGORIES`; `ACTION_AUTHORIZATION_STATES` | Exact sets |
| IE-06 | Physical execution invariant | `isPhysicalExecutionPermitted(request, decision)` — requires category PHYSICAL_COMMAND + authorization AUTHORIZED + **decision.requestId === request.requestId** + maxImpactLevel ≠ HIGH + decision.allowPhysical | Each clause independently falsifiable |
| IE-07 | Operator authorization required | `requiresOperatorAuthorization(request)` — PHYSICAL_COMMAND or maxImpactLevel HIGH | Exact |

---

## 4. Interaction-layer tests (`interaction/`)

**Location:** extend `packages/feex-eil/tests/agent-state-machine.test.ts` + new sibling for EventBus.

### 4.1 EventBus (`interaction/EventBus.ts`)

| ID | Test | Verified behavior | Pass criterion |
|---|---|---|---|
| EB-01 | Schema validation on emit | `emit` runs `parseInteractionEvent` — malformed payloads rejected | Throw/reject, never dispatch |
| EB-02 | Authorization gate | `authorized:false` → pushed to `bus.blocked`, **not delivered at any impact level** | `blocked.length` grows; handler count 0 |
| EB-03 | Event-ID dedup | Same `eventId` twice → second skipped, recorded in `bus.duplicates` | Dispatch once; `duplicates` audit |
| EB-04 | Deep freeze | Dispatched event frozen; handler mutation attempts fail/no-op | Object.isFrozen deep |
| EB-05 | Wildcard subscription | `on("*", h)` receives all channels | All emitted kinds received |
| EB-06 | Channel routing | `on("voice", h)` does not receive `gesture` events | Isolation exact |
| EB-07 | Re-entrant emit ordering | Handler that emits → outer event fully delivered to all subscribers before nested | Ordering guarantee per docstring |
| EB-08 | Handler error isolation | One throwing handler doesn't starve others; errors collected, rethrown after delivery as aggregate | Later handlers still ran; aggregate error thrown |
| EB-09 | Unsubscribe | `on()` returns unsub; `once()` auto-removes | No calls after unsub |
| EB-10 | Lifecycle = explicit unsubscribe only | **Correction:** `EventBus` has no `destroy()`/teardown; `globalEventBus` is a module singleton that persists for the process lifetime. Tests must call the unsubscribe function returned by `on()`/`once()` and assert listener removal — cleanup must never rely on GC of a shared singleton | Unsub removes handler; no dangling subscriptions |

### 4.2 AgentStateMachine (`interaction/agent-state-machine.ts`)

| ID | Test | Pass criterion |
|---|---|---|
| SM-01 | `transition()` enforces `VALID_TRANSITIONS`; invalid → rejected/unchanged | Per transition table |
| SM-02 | `subscribe()` returns unsubscribe fn | Post-unsub, no events |
| SM-03 | Emitted `AgentStateEvent` carries `eventId`, `agentId`, `previousState`, `timestamp`, `source`, `evidenceRefs` | Schema-valid output |
| SM-04 | Evidence-required transitions without refs rejected | RESPONDING/EXECUTING blocked |
| SM-05 | Event IDs unique per transition (UUID) | No collision across N transitions |

---

## 5. Renderer projection tests (`renderer/`)

**Location:** extend `packages/feex-eil/tests/humanoid-renderer.test.ts`.

*Corrections vs. draft:* `HumanoidScene` props are `{ event: AgentStateEvent; style?: "particle"|"mechanical"; reducedMotion?: boolean; accentColor? }` — **not** `agentState`, `mode`, `dpr`, or animation-string props. Motion values come from `HumanoidAnimationState` (`idle`, `listening`, `thinking`, …) via `HumanoidStateAdapter`.

| ID | Test | Real API | Pass criterion |
|---|---|---|---|
| HR-01 | Valid event → animation state | `adaptAgentStateEvent`/`mapAgentStateToHumanoid` — all 9 states map to defined `motion`/`indicator` | 9/9 mappings, no undefined |
| HR-02 | Invalid event rejected at boundary | `parseHumanoidStateEvent(garbage)` throws — renderer never sees invalid state | Throws before render |
| HR-03 | Monotonic event order | `isNewerAgentStateEvent` — stale/out-of-order events don't regress visual state | Older event rejected |
| HR-04 | Style prop selects rig | `style="mechanical"` → `MechanicalHumanoid`; default/`"particle"` → `ParticleHumanoid` | Correct component |
| HR-05 | Motion suppression honored | `HumanoidAnimationController`: `motionSuppressed = reducedMotion ?? systemReducedMotion` (media-query fallback); when suppressed **or** `!animation.animated` (OFFLINE), the `useFrame` callback resets position.y and rotation.y to 0, sets scale to 1, then returns without applying animated deltas or calling `invalidate()` | Suppressed → neutral transforms, no animated deltas or demand-loop invalidation; OFFLINE → `animated:false` |
| HR-06 | Intensity bounded | `intensity` ∈ [0,1] normalized visual emphasis — **not** a confidence score | Range check |
| HR-07 | No state invention | Renderer output derives only from validated event; no fabricated `DataSourceLabel` | No SIMULATED/FALLBACK without label |
| HR-08 | Canvas boundary | Component renders inside host Canvas; no `dpr` prop on EIL components — DPR clamp `[1,2]` is a **host-app** responsibility per AGENTS.md §9 | Boundary respected |

---

## 6. Agent 05 §8 acceptance criteria — traceability matrix

The twelve criteria from `AGENT-05-EIL-ADAPTER-CONTRACTS.md` §8 map to suites as follows:

| §8 criterion | Covered by |
|---|---|
| 1. Valid/invalid AgentStateEvent parse | AS-06, AS-07 |
| 2. Transitions follow VALID_TRANSITIONS | AS-03, AS-04, SM-01 |
| 3. RESPONDING/EXECUTING require evidenceRefs | AS-05, AS-07, SM-04 |
| 4. Confidence omitted when uncalibrated | AS-08, PE-04 |
| 5. Navigator envelope normalization | N-01..N-04 (§7 below) |
| 6. Grounded-count without refs → no EvidenceBundle | ER-03, N-05 |
| 7. Disclosure via `disclosureForBundle` | ER-05, ER-07 |
| 8. Speech lifecycle reflects real callbacks/permissions | SP-01..SP-04 (§7) |
| 9. Duplicate event IDs dispatched once | EB-03 |
| 10. Unauthorized events never reach handlers | EB-02, SEC-02 |
| 11. **No** network/DB/WS/SSE/tool/robotics added | NEG-01..NEG-05 (§7) — static + runtime assertions |
| 12. Renderer inside host Canvas, reduced-motion | HR-05, HR-08 |

---

## 7. New suites required by Agent 05 §8

### 7.1 Navigator normalization (N-*)

| ID | Test | Pass criterion |
|---|---|---|
| N-01 | Success envelope → normalized result, no invented fields | Exact field mapping |
| N-02 | Error envelope → explicit ERROR label, not success-shaped | `DataSourceLabel.ERROR`/equivalent |
| N-03 | Legacy response shape → normalized or explicitly UNAVAILABLE | No silent fabrication |
| N-04 | Missing evidence refs → no `EvidenceBundle` produced | Bundle only from real refs |
| N-05 | `groundedCount>0` without `references[]` → no bundle | Fail-closed |

### 7.2 Speech lifecycle (SP-*)

| ID | Test | Pass criterion |
|---|---|---|
| SP-01 | LISTENING entered only on real `SpeechRecognition` start callback | No optimistic state |
| SP-02 | Permission DENIED/REVOKED/ERROR → `isPermissionRevoked` path, no LISTENING claim | State honest |
| SP-03 | Speech end/error → transition per `VALID_TRANSITIONS` (LISTENING→IDLE/THINKING/ERROR) | Legal transitions only |
| SP-04 | `interactionAllowed=false` → perception events cannot drive state | Gate honored |

### 7.3 Negative boundary tests (NEG-*) — Agent 05 §8.11

| ID | Test | Pass criterion |
|---|---|---|
| NEG-01 | Static: no `fetch`/`XMLHttpRequest`/`WebSocket`/`EventSource` **in newly introduced EIL client-slice files** | Import audit scoped to new/changed files only — the existing Navigator request path is pre-existing app behavior, not part of this slice | Grep/import audit on diff scope |
| NEG-02 | Static: no Prisma/Firestore/Redis imports in `packages/feex-eil/` | Import audit |
| NEG-03 | Runtime: EventBus emits produce zero network calls (MSW/spy) | Zero requests |
| NEG-04 | No persistence: no `localStorage`/`indexedDB`/`caches` writes for EIL state | Storage audit |
| NEG-05 | No actuation: no `PHYSICAL_COMMAND` request constructible from adapter surface | API absence + `requiresOperatorAuthorization` gate |

---

## 8. Security and permission tests

Mapped to **real** safety machinery — `ImpactLevel`, `authorized`, `isPhysicalExecutionPermitted`, `disclosureForBundle`, `isPermissionRevoked`. **No T0–T6 tiers exist.**

| ID | Test | Pass criterion | Severity |
|---|---|---|---|
| SEC-01 | Unauthorized HIGH-impact event blocked | `authorized:false`+`impactLevel:"HIGH"` → `bus.blocked`, zero handler calls | Hard blocker |
| SEC-02 | Unauthorized LOW/MEDIUM also blocked | Same at LOW — no smuggling via mislabeled impact | Hard blocker |
| SEC-03 | `isPhysicalExecutionPermitted` rejects mismatched decision.requestId | Decision for request A never authorizes B | Hard blocker |
| SEC-04 | PHYSICAL_COMMAND + maxImpactLevel HIGH → `requiresOperatorAuthorization` true; `isPhysicalExecutionPermitted` false even with allowPhysical | Contract invariant | Hard blocker |
| SEC-05 | FICTIONAL evidence → disclosure REQUIRED in every bundle | `disclosureForBundle` | Hard blocker |
| SEC-06 | SPECULATIVE/ESOTERIC → PROMINENT; weaker-than-ESTABLISHED → SUBTLE | Disclosure ladder | Required |
| SEC-07 | Tampered bundle flags (containsFictional:false but FICTIONAL ref present) → still REQUIRED | Recomputed, fail-closed | Hard blocker |
| SEC-08 | Gesture alone cannot reach HIGH impact | `GESTURE_INTENT_MAP` max MEDIUM; HIGH requires separate authorized InteractionEvent | Hard blocker |
| SEC-09 | `interactionAllowed` absent/false → perception cannot authorize interaction | Permission gate | Required |
| SEC-10 | No secrets in emitted events | Event payloads carry no credential fields | Required |

---

## 9. Failure, retry, ordering

Scoped to what **exists**: EventBus dedup/freeze/re-entrancy, state-machine transition legality, renderer monotonic ordering. The draft's invented behaviors (30s AgentGateway timeout, World Model write retries, action queues, session-tier escalation) are **removed — no such mechanisms exist in the client-only slice**.

| ID | Test | Pass criterion |
|---|---|---|
| FR-01 | ERROR→IDLE recovery follows `VALID_TRANSITIONS` (ERROR→[IDLE,OFFLINE] only) | Legal path only |
| FR-02 | Duplicate `eventId` redelivery → dedup, not re-dispatch | EB-03 invariant |
| FR-03 | Concurrent emits from two channels → each channel's handlers see own events; wildcard sees all, order = emission order | Deterministic |
| FR-04 | Handler throws mid-dispatch → others still run; aggregate error after | EB-08 |
| FR-05 | Stale `AgentStateEvent` (older timestamp for the same agent) → `isNewerAgentStateEvent` rejects; a different agent starts a separate presentation stream | Strictly newer timestamp required for the same agent; no sequence-number assumption |
| FR-06 | Malformed runtime payload (deserialized JSON) → `parseInteractionEvent` rejects at bus boundary | Trust-nothing boundary |

---

## 10. Acceptance criteria summary

### 10.1 Hard blockers (any failure blocks G5 completion claim)

SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-07, SEC-08 · EB-02, EB-03 · SM-01, SM-04 · NEG-01..NEG-05 · HR-02, HR-05, HR-08

### 10.2 Pass rates

| Suite | Tests | Required |
|---|---|---|
| Contract units (§3) | 31 (AS-01..10, PE-01..07, ER-01..07, IE-01..07) | 100% |
| Interaction/EventBus/machine (§4) | 15 (EB-01..10, SM-01..05) | 100% |
| Renderer (§5) | 8 (HR-01..08) | 100% |
| Navigator/speech/negative (§7) | 14 (N-01..05, SP-01..04, NEG-01..05) | 100% |
| Security (§8) | 10 (SEC-01..10) | 100% |
| Failure/ordering (§9) | 6 (FR-01..06) | 100% |
| **Total** | **84** | **100%, zero skips** |

### 10.3 Process criteria

- Agent 00 dispositions recorded for §2.1 (version axes) and §2.2 (adapter interface deferred).
- Route-count methodology (§2.3) and backend-branch statement (§2.4) acknowledged in consolidated plan.
- No implementation tests merged before explicit human G5-implementation authorization.
- Existing EIL tests (58 across 3 files) must remain green; new tests extend, not replace.

---

## 11. Environment & sequencing

Runtime: Node `22.x || 24.x` and npm `>=10`, as declared in the repository root `package.json`; `npm ci`/`typecheck`/`build` clean, project Vitest. Sequencing: contract units → interaction/machine → renderer → N/SP/NEG → security → failure/ordering. Security may parallel §7 after contracts green.

## 12. Out of scope

E2E/Playwright (G6), perf benchmarks (G6), WCAG (G6), load testing (G6), T5/T6-equivalent physical actuation (post-G7), ROS 2/Isaac Sim (post-G7), HoloKai **backend** adapter (undecided — Agent 03 Q3), server-side EIL persistence (Agent 05 A05-07: none for first slice).

## 13. Provenance & revision note

| Field | Value |
|---|---|
| Author | Agent 09 — QA & Verification (revised) |
| Revision | v2 — rewritten against live contract source after Agent 00 NOT-READY review |
| Corrections applied | Real exports only; EpistemicStatus model; ImpactLevel/authorized safety; actual EventBus semantics (dedup, blocked audit, freeze, re-entrant queue, no destroy); actual renderer props (`event`/`style`/`reducedMotion`); Agent 05 §8 twelve criteria as spine; existing test files extended not duplicated; invented backend behaviors removed |
| Depends on | PRs #67–#71 merged; EIL implementation source baseline `c60d7efb2cb5bae621b5c64493f718512d40cb03` |
| Status | DRAFT v2.1 — post-merge factual corrections; pending Agent 00 independent re-review |
| Next action | Agent 00 independent re-review; G5 implementation authorization remains a **human owner** decision |

**G6 / G7: FROZEN. Physical actuation: PROHIBITED.**
