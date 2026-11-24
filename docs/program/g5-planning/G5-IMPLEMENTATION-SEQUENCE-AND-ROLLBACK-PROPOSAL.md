# G5 Planning — Sequenced First-Slice Implementation and Rollback Proposal

**Status:** Planning proposal only. This document does not authorize implementation, integration, production changes, deployment, release, or actuation.  
**Planning baseline:** G5 planning artifacts PRs #67–#73, reconciled in branch `docs/g5-final-reconciliation-2026-11-21`.  
**EIL source baseline:** `c60d7efb2cb5bae621b5c64493f718512d40cb03`.  
**Decision posture:** Conditional planning proposal; seven architecture decisions remain open.

---

## 1. Purpose and recommended scope

This document consolidates the proposed sequence, preconditions, acceptance gates, failure handling, disable/rollback strategy, and observability requirements for a possible first EIL slice.

**Recommended first slice:** client-side, ephemeral EIL validation and presentation on the existing Branch A architecture. It consumes actual client/browser lifecycle events, validates against existing EIL contracts, maintains local state only, and projects validated state through the existing host scene/HUD.

It does not introduce:
- a new backend route, server-side EIL state, persistence, database write, or event history;
- a new WebSocket, SSE stream, distributed event bus, or cross-device synchronization;
- new Navigator request behavior or a HoloKai-specific backend API;
- tool execution, external side effects, robotics commands, or physical actuation;
- canonical EIL schema/version changes.

The existing HoloKai `POST /api/world-model/navigator` request is pre-existing behavior and remains unchanged.

## 2. Preconditions before any implementation authorization

All preconditions below must be satisfied or explicitly dispositioned by the human owner before implementation begins.

| ID | Precondition | Evidence required | Stop condition |
|---|---|---|---|
| P-01 | Human owner separately authorizes G5 implementation scope | Explicit written authorization naming the approved first-slice scope and exclusions | No implementation without it |
| P-02 | A05-01 client-only sufficiency decision recorded | Human decision accepting or rejecting ephemeral client-only state | No architecture assumption |
| P-03 | A05-02 version discrepancy dispositioned | Agent 02 evidence-based decision for contract headers `v0.1.0` vs `EIL_SCHEMA_VERSION = 1.0.0`; no unilateral version edit | Stop versioned adapter work if unresolved |
| P-04 | A05-03 Navigator evidence shape inspected | Server result type/tests establish whether stable typed evidence references actually exist | No fabricated EvidenceBundle |
| P-05 | A05-04 browser speech mapping approved | Explicit lifecycle-to-state mapping tied to real browser callbacks and permission states | No optimistic LISTENING/SPEAKING states |
| P-06 | A05-05 renderer wiring scope decided | Decide validation-only vs renderer projection; map to current host Canvas boundary | No renderer wiring by assumption |
| P-07 | A05-06 package import boundary decided | Supported package export/import path documented or relative import explicitly accepted as temporary | No broad package refactor |
| P-08 | A05-07 persistence requirement confirmed | Human decision that first slice needs no server-side history, or a separately scoped design if that changes | No persistence added implicitly |
| P-09 | Trust-boundary controls verified for every touched boundary | Route/middleware and client input review; no claim that the architecture diagram itself proves enforcement | Stop on authorization bypass or trust-boundary ambiguity |
| P-10 | Baseline and regression suite pinned | Exact source SHA, lockfile, test commands, existing 58 EIL tests, smoke and build commands | No acceptance against moving/unpinned source |
| P-11 | Privacy and diagnostic handling reviewed | No raw camera frames/biometric media, secrets, or sensitive payloads in logs | Stop on unintended collection/exfiltration |
| P-12 | Rollback/disable path tested in non-production | Feature flag or composition-level disable path; previous renderer/UI behavior remains usable | No production enablement without verified disable path |

## 3. Proposed implementation sequence

Each stage is conditional on a separate human G5 implementation authorization. A stage passing does not authorize the next stage, production enablement, or release.

### Stage 0 — Baseline freeze and decision closure

**Work proposal**
- Pin the exact main/source SHA and dependency lockfile.
- Record A05-01 through A05-07 dispositions.
- Confirm the first-slice boundary and list every file permitted to change.
- Record current EIL test baseline: 58 tests across the three existing contract/state-machine/renderer test files.
- Preserve known unrelated test exceptions and infrastructure failures as separately classified.

**Acceptance**
- Decision register complete or explicitly marked as an owner-approved deferred blocker.
- No schema, backend, transport, or persistence change is included in scope.
- Baseline can be recreated from a clean install.

**Failure response**
- Stop. Do not begin code changes while source baseline, decision owner, or scope is ambiguous.

### Stage 1 — Pure contract and local adapter validation

**Work proposal**
- Add only the minimum client-side adapter boundary needed to consume actual source events.
- Validate payloads with existing canonical parsers/schemas.
- Preserve legal transitions, event identity, timestamp ordering, explicit permissions, and evidence requirements.
- Omit confidence unless a calibrated source supplies it.
- Do not generate placeholder evidence references.

**Acceptance**
- Contract tests: 100% pass.
- Invalid, stale, duplicate, unauthorized, and evidence-deficient events fail closed.
- RESPONDING/EXECUTING cannot be emitted without valid evidence references.
- No new network, database, storage, WebSocket, SSE, tool, or actuation behavior.
- Existing EIL tests remain green.

**Failure response**
- Reject the event and retain only a redacted, bounded diagnostic classification.
- Do not retry invalid payloads as if they were transient.
- Fix or remove the adapter change; do not weaken canonical validation.

### Stage 2 — Browser lifecycle and Navigator normalization

**Work proposal**
- Map browser speech state only from actual SpeechRecognition lifecycle callbacks and explicit permission state.
- Normalize the existing Navigator response envelope without changing its request path or server contract.
- Preserve ERROR, FALLBACK, UNAVAILABLE, and provider labels as display metadata.
- Construct evidence bundles only from actual stable typed references returned by the source.

**Acceptance**
- Browser tests prove no optimistic LISTENING state before the real start callback.
- Denied/revoked/error permission cannot be represented as permission granted.
- Existing `POST /api/world-model/navigator` behavior is unchanged.
- A grounded-evidence count, summary, provider label, or confidence value alone never becomes an EvidenceReference.
- No new EIL-originated request is present in the changed-file diff.

**Failure response**
- Display unavailable/error state; do not fabricate successful response or evidence.
- Leave the existing Navigator consumer unchanged if normalization cannot be proven safe.

### Stage 3 — Optional renderer projection

**Work proposal**
- Proceed only if A05-05 explicitly selects renderer projection.
- Feed parsed AgentStateEvent values into the existing renderer adapter.
- Keep EIL scene fragments inside the host React Three Fiber Canvas.
- Preserve reduced-motion behavior and stale-event rejection.

**Acceptance**
- Renderer tests pass at 100%.
- No second Canvas/WebGLRenderer, independent animation clock, or new render loop.
- No canonical state is inferred from animation.
- Reduced-motion and OFFLINE states preserve the documented neutral-pose behavior.
- Existing sovereign scene remains functional when the EIL projection is disabled.

**Failure response**
- Disable the EIL projection and restore the prior host scene path.
- Do not create a fallback renderer or duplicate Canvas to mask integration failure.

### Stage 4 — Integrated client-only verification

**Work proposal**
- Run the full contract, EventBus, state-machine, adapter, browser lifecycle, security, and renderer suites.
- Run typecheck, build, route/browser smoke matrix, and documentation verification as applicable to the touched code.
- Review the final diff for forbidden network, persistence, tool, and actuation surfaces.

**Acceptance**
- All new first-slice tests pass with zero skips.
- Existing EIL baseline tests remain green.
- No unauthorized API, storage, transport, or actuation surface appears in diff or runtime observation.
- Test evidence is attached to the exact candidate SHA.
- Independent review confirms no boundary expansion.

**Failure response**
- Stop and classify each failure as product defect, regression, environment/infrastructure failure, or unsupported assumption.
- Do not convert infrastructure failures into product passes or silently waive hard security/safety criteria.
- Return to the earliest failing stage.

### Stage 5 — Human review and separate release decision

This stage is a decision checkpoint, not an automatic deployment stage.

**Acceptance**
- Human owner reviews implementation evidence, open risks, rollback proof, and exact diff.
- Any production or release activity receives a separate G7 authorization.
- G6/G7 remain frozen until their own criteria and approvals are met.

**Failure response**
- Keep the feature disabled and unmerged/unreleased as directed by the human owner.
- No production deployment is implied by G5 test success.

## 4. Observability and diagnostics requirements

For the proposed client-only slice, observability must remain local and privacy-minimizing.

| Concern | Requirement |
|---|---|
| Correlation | Preserve existing `eventId` and `agentId`; use a correlation identifier only where a real source supplies or explicitly defines one. Do not invent a distributed trace. |
| Ordering | Record timestamp and event identity; document that current renderer freshness is timestamp-based per agent and equal timestamps do not establish order. |
| Validation failures | Classify as malformed, stale, illegal transition, missing evidence, unauthorized, or permission denied. Do not log full sensitive payloads. |
| Provider failures | Distinguish network/provider error, fallback, unavailable, and malformed response. Do not relabel failure as success. |
| Redaction | Never log credentials, access tokens, raw camera frames, biometric media, or full user speech transcripts by default. |
| Persistence | No EIL telemetry persistence, browser storage, database writes, or server-side event history in the first slice. |
| Retention | Ephemeral in-memory diagnostics only; clear on adapter/feature teardown. Any durable retention requires a separate privacy, ownership, deletion, and retention decision. |
| Retry | No automatic retry for schema-invalid or unauthorized events. Transient browser/provider retry behavior must remain owned by the existing subsystem and must not duplicate EIL events. |
| Health signal | Expose local adapter availability/error state to the UI; do not claim backend health from a client-only signal. |
| Audit | Test output and review artifacts must identify exact commit SHA and test command; runtime diagnostics are not a substitute for CI evidence. |

## 5. Disable and rollback strategy

The first slice must be removable without changing canonical World Model state or backend behavior.

1. **Feature disable:** provide a single composition-level switch/feature flag that prevents EIL adapter subscription and renderer projection.
2. **Unsubscribe:** every EventBus subscription must retain and invoke its explicit unsubscribe function. Do not rely on garbage collection or a nonexistent EventBus destroy method.
3. **State reset:** clear ephemeral adapter/state-machine state on disable/unmount; do not persist it.
4. **Renderer fallback:** when disabled or initialization fails, render the existing host scene/HUD path with no EIL projection.
5. **Navigator preservation:** do not roll back or alter the pre-existing HoloKai Navigator request as part of EIL rollback.
6. **Code rollback:** revert only the first-slice commits if disablement is insufficient; do not roll back unrelated architecture, lockfile, or backend work.
7. **Verification:** after disable/revert, rerun typecheck, build, focused EIL tests, and the relevant smoke route(s) against the rollback SHA.
8. **Production:** no production rollout is in scope. If a later separately authorized release occurs, the release plan must add environment-level disable and deployment rollback steps.

**Rollback triggers**
- Any unauthorized event reaches a handler.
- Any invalid/missing evidence is represented as grounded evidence.
- Any client event mutates canonical World Model state.
- Any new network, persistence, tool, or actuation behavior appears without approval.
- Any regression creates a second Canvas/render loop or breaks reduced-motion.
- Any privacy boundary is violated or sensitive data is emitted to diagnostics.

## 6. Seven-decision register

All decisions remain open unless the human owner records a disposition.

| ID | Decision | Current recommendation / evidence | Decision owner | Blocks |
|---|---|---|---|---|
| A05-01 | Is client-only ephemeral EIL sufficient for the first slice? | Agent 05 recommends yes; no server state or new transport required for the bounded first slice | Human owner, informed by Agent 00 | Overall first-slice architecture |
| A05-02 | Reconcile contract headers `v0.1.0` and `EIL_SCHEMA_VERSION = 1.0.0` | Conflict remains unresolved; do not assign semantics or edit version without evidence | Agent 02 recommendation; human owner disposition | Versioned adapter implementation |
| A05-03 | Does NavigatorResult return stable typed evidence references? | HoloKai consumer currently does not construct EIL EvidenceReference/EvidenceBundle; inspect server result type/tests | Agent 02/05; human owner if contract change | Evidence mapping |
| A05-04 | Which browser speech lifecycle callbacks map to local AgentState transitions? | Must reflect real callbacks and permissions; no optimistic state | Agent 03/05; human owner disposition | Speech adapter |
| A05-05 | Does first slice wire renderer, or stop at validation/event contracts? | Renderer is currently unwired; optional projection requires explicit scope | Agent 02/03/00 recommendation; human owner | Renderer stage |
| A05-06 | What import boundary should client consumers use for EIL? | Existing relative imports are a coupling point, not proof of stable package API | Agent 02; human owner if package refactor needed | Adapter package boundary |
| A05-07 | Is server-side EIL event history/persistence required? | No for recommended first slice; revisit only with concrete continuity/audit requirement and separate data policy | Human owner, informed by Agent 00 | Any persistence/distributed event design |

## 7. Route-count and architecture interpretation guardrail

The planning evidence must not present grep expression counts as endpoint counts:

- **391** = matched router/app method-call expressions, including `.use()` middleware mounts.
- **Approximately 292** = earlier unverified programme estimate.
- **Approximately 37** = reported Supabase Edge Function route handlers; its counting method is not demonstrated to be directly comparable to the Express grep.
- None of these figures establishes the distinct HTTP endpoint count or route parity.
- `391 - 37 = 354` is not a valid estimate of unported endpoints.
- A verified per-router endpoint inventory, with HTTP method, mount path, route path, middleware, and duplicate/parameterized-route handling, is required before making parity claims.

## 8. Explicit non-claims

This proposal does not claim:
- that any adapter or integration code has been implemented;
- that all seven decisions are resolved;
- that the EIL version discrepancy is resolved;
- that the route inventory is complete;
- that all trust-boundary controls have been runtime-verified;
- that Navigator supplies stable evidence references;
- that the client EventBus is distributed or durable;
- that the proposed rollback has been implemented or tested;
- that G5 implementation, G6, G7, production deployment, or physical actuation is authorized.

---

**Gate statement:** This document completes a planning deliverable only. G5 implementation remains **NOT AUTHORIZED** until the human owner issues separate explicit authorization. G6/G7 remain frozen. Physical actuation remains prohibited.
