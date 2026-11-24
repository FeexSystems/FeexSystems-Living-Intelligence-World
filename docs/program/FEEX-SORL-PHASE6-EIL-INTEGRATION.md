# FEEX-SORL Phase 6 — EIL Presentation Integration Report

**Document ID:** FEEX-SORL-P6-EIL-001
**Branch:** `feat/feex-sorl-lab`
**Status:** presentation→clip contract delivered and tested; no new state authority introduced

---

## 1. Deliverables

| Artifact | Path |
|---|---|
| Presentation→clip resolver (pure) | `client/lib/lab/lab-presentation.ts` |
| State-to-animation tests | `client/test/lib/lab-presentation.test.ts` (10 tests) |
| Missing-clip dev diagnostic | `client/landing/components/humanoid/HumanoidModel.tsx` |

## 2. Contract compliance (plan §Phase 6)

- **Validated AgentStateEvent inputs preserved** — resolver accepts the existing `AgentState` union; ordering/validation stays in `packages/feex-eil` (`isNewerAgentStateEvent`, `parseHumanoidStateEvent` untouched).
- **`resolvePresentationState` reused verbatim** — test asserts `resolveLabPresentation(s).presentation === resolvePresentationState(s)` for all 9 agent states.
- **Fail-closed semantics kept** — ERROR/OFFLINE → UNAVAILABLE → `Unavailable` clip even with ambient intents; tested.
- **EXECUTING restrictions kept** — EXECUTING → GESTURING → `Explain` clip (never a fabricated speech/actuation pose); tested.
- **Evidence separation kept** — `resolveEvidenceStatus` reused; absent evidence reports `EVIDENCE_UNAVAILABLE` diagnostic but never overrides the pose.
- **No fabricated agent states** — the only non-agent input is `PresentationIntent`; tests confirm intents cannot produce agent-driven states (IDLE+aware→AWARE only).
- **Missing-clip honesty** — contract clips absent from the current GLB fall back to `Idle` with a once-per-clip dev diagnostic (`clipLikelyMissing` + `console.warn` in `HumanoidModel`).

## 3. Presentation → clip map

| Presentation | Clip |
|---|---|
| IDLE | `Idle` |
| AWARE / PERCEIVING | `Aware` |
| THINKING | `Think` |
| LISTENING | `Listen` |
| SPEAKING | `Speak` |
| GESTURING (EXECUTING) | `Explain` |
| INSPECTING | `Inspect` |
| UNAVAILABLE | `Unavailable` |

`Point`/`Walk` are navigation/locomotion clips driven by waypoint state, not presentation states.

## 4. Verification

- `npx vitest --run client/test/lib/lab-presentation.test.ts` — 10/10 pass.
- `npm run typecheck` — clean.
- `verify-no-physical-actuation-surface.mjs` — still passing (no new claims).

## 5. Phase 6 exit checklist

- [x] State-to-animation mapping defined and tested
- [x] Fail-closed / precedence / EXECUTING semantics verified by tests
- [x] No new state authority (pure function over existing contracts)
- [x] Missing clips degrade honestly to Idle + diagnostic
- [ ] Live EIL event feed on the landing lab — deferred until an approved runtime exists (Phase 8 gate); the resolver is ready to consume `AgentStateEvent.state` when one does.
