# FEEX Master Implementation Register

**Status:** Living register — updated as gates close. Every entry cites verifiable
evidence (commit SHA, file path, CI run). Proposed architecture is never recorded
as implemented capability.

**Last updated:** 2026-11-19 · `main` @ `5043414`; Phase 3 implementation is isolated on `feat/feex-eil-humanoid-renderer`.

---

## 1. Programme sequence and gate status

| # | Phase | Status | Evidence |
|---|-------|--------|----------|
| 0 | Repository Audit | ✅ Done | Orchestrator reality report (2026-11-19): repo `main` @ `a4c5b07`, PR inventory verified via GitHub API |
| 0 | CI Baseline (Gate 0) | ✅ Green | PR #53 merged `edc5f73`; all checks passed on merge commit: unit-tests, type-check, integration-tests, e2e-tests, lighthouse, production-smoke, world-smoke, docs-verification, gate-verification, coverage-report |
| 1 | EIL Contract Hardening | ✅ Done | PR #54 merged `514685d` — all 22 PR #52 review findings resolved, 47/47 EIL tests |
| 1b | Evidence-integrity follow-ups | ✅ Done | PR #55 merged `42ffc92` — navigator envelope unwrap, robotics facet filters, atomic metadata merge |
| 2 | `docs/program` register | ✅ This document | — |
| 3 | Humanoid Renderer | 🟡 Implemented on feature branch; CI gate pending | State adapter, rig resolver, R3F scene fragment, particle/mechanical procedural renderers, 7 focused tests; see `feat/feex-eil-humanoid-renderer` |
| 4 | Perception | ⬜ Not started | Contracts exist (`perception-event.ts`); no implementation |
| 5 | FEEX WORLD integration | ⬜ Not started | `client/components/sovereign/` exists (FeexSovereignEngine, HoloKaiInterface, HoloKaiVoiceModal); not wired to EIL contracts |
| 6 | HOLOKAI integration | ⬜ Not started | Separate repo `FeexSystems/HoloKai-Systems-Labs` — not yet inspected |
| 7 | Advanced Intelligence | ⬜ Not started | — |
| 8 | Robotics Simulation | ⬜ Not started | `server/routes/robotics.ts` + `client/features/robotics/` exist (catalog UI); no simulation |
| 9 | Commercialisation | ⬜ Not started | — |

**Dependency rule:** phases are strictly serial until the Renderer gate closes.
Contract changes require regression tests; runtime claims require browser or CI
evidence, not static inspection.

---

## 2. EIL implementation inventory (verified)

### Contracts — `packages/feex-eil/contracts/` (hardened in #54)

| Contract | File | State |
|---|---|---|
| Agent state machine + transition policy | `agent-state.ts` | Implemented; `VALID_TRANSITIONS` frozen at load |
| Runtime validation (Zod) | `validation.ts` | Implemented; UUID IDs, evidence provenance, bundle consistency enforced |
| Evidence reference/bundle + disclosure | `evidence-reference.ts` | Implemented; disclosure derived from references, fails closed |
| Interaction event + gesture vocabulary | `interaction-event.ts` | Implemented |
| Perception event | `perception-event.ts` | Contract only |
| Embodied action request/observation/safety gate | `embodied-action.ts` | Implemented; HIGH-impact physical commands never auto-permitted; decision↔request correlation enforced |
| Schema versioning | `schema-version.ts` | Implemented; strict semver |

### Interaction plane — `packages/feex-eil/interaction/` (hardened in #54)

| Component | File | State |
|---|---|---|
| EventBus | `EventBus.ts` | Implemented; boundary validation, eventId dedup, deep-freeze, unauthorized blocked at all impact levels, error isolation, ordered re-entrant dispatch |
| AgentStateMachine | `agent-state-machine.ts` | Implemented; event-sourced, frozen events, defensive history, replay rejects forged/truncated logs |

### Renderer — `packages/feex-eil/renderer/`

| Component | State |
|---|---|
| `DataSourceBadge.tsx` | Implemented |
| `HumanoidStateAdapter.ts` | Implemented on feature branch; validates incoming events and maps canonical states to deterministic presentation channels |
| `HumanoidRig.ts` | Implemented on feature branch; configurable names, optional rig nodes degrade gracefully |
| `HumanoidAnimationController.tsx` | Implemented on feature branch; uses the host R3F frame loop, no owned renderer/RAF |
| `HumanoidScene.tsx` | Implemented on feature branch; scene fragment only, no nested Canvas |
| `ParticleHumanoid.tsx` / `MechanicalHumanoid.tsx` | Implemented on feature branch; procedural, asset-free variants |

### Tests — `packages/feex-eil/tests/`

- `contracts.test.ts` — 26 tests
- `agent-state-machine.test.ts` — 21 tests
- Existing contract/interaction baseline: **47 passing** on the prior verified gate.\n- Renderer branch adds 7 focused adapter/rig tests; execution result is pending CI and is not yet counted as passing.

---

## 3. External consumers of EIL contracts

| Consumer | Imports | Notes |
|---|---|---|
| `client/components/sovereign/HoloKaiVoiceModal.tsx` | `DataSourceBadge`, `DataSourceLabel` type | Renders provenance badges; navigator envelope unwrap fixed in #55 |
| `server/lib/marketing/content-os.service.ts` | own local `VALID_TRANSITIONS` (unrelated copy) | Not an EIL consumer |

No production code path yet routes events through `EventBus` or
`AgentStateMachine` — the interaction plane is contract-complete but not yet
wired into the sovereign runtime. That wiring is part of the FEEX WORLD
integration phase (Phase 5), not assumed done.

---

## 4. Known debt and risks (honest register)

| Item | Severity | Status |
|---|---|---|
| Full Playwright E2E suite (`npm run test:e2e`) contains stale pre-redesign specs and service-dependent tests | Medium | CI runs smoke matrix only (`test:e2e:smoke`); full suite repair is separate work |
| Lighthouse performance on cinematic landing ~0.3–0.5 (warn-level assertion only) | Low | Acceptable for Gate 0; revisit before commercialisation claims |
| Dependabot: 19 vulnerabilities on default branch (8 high) | Medium | Reported by GitHub on every push; not yet triaged |
| Netlify deploy-preview checks (Redirect/Header/Pages rules) fail on PRs | Low | Non-blocking; production deploy pipeline needs separate attention |
| `pnpm-lock.yaml` stray file alongside `package-lock.json` | Low | Package-manager ambiguity; reconcile or remove |
| Perception plane absent | — | Blocks Phases 4–6 |

---

## 5. Evidence anchors

- Gate 0 merge: PR #53 → `edc5f73` (2026-11-19)
- Contract hardening: PR #54 → `514685d`
- Integrity follow-ups: PR #55 → `42ffc92`
- EIL package introduced: PR #51/#52 (`feat/feex-eil-architecture-v1`)
- React 19 / R3F compatibility fix (production blank-screen root cause): `0e75179`
- CI repair chain: `cf081cd`, `0e75179`, `53bc4f7`, `f8bf1bf`, `ff9a0ac`, `6618397`

---

## 6. Next actions (ordered)

1. **Renderer plane (Phase 3):** implementation is on `feat/feex-eil-humanoid-renderer`; next gate is typecheck, renderer tests, full EIL tests, build and PR CI. No third-party humanoid GLB is bundled because its asset rights have not been independently verified.
2. **Perception plane (Phase 4):** implement producers for
   `PerceptionEvent`/`GestureEvent` with `LabeledDatum` provenance.
3. **FEEX WORLD wiring (Phase 5):** route sovereign-runtime events through
   `EventBus` + `AgentStateMachine`; wire `HoloKaiVoiceModal` provenance to
   EIL disclosure requirements.
4. **Triage Dependabot highs** before any commercialisation surface.
