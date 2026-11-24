# G5 Stage 5 — Review Findings Correction Record

**Date:** 22 November 2026
**Correction head:** `57f98b227797221903d925f5f606476785f8e625` (branch `fix/g5-stage5-review-corrections`, base `main@fa0e443a50f4436b26b36be86bce97ac02c2713f`)
**Scope:** the five Stage 5 human-review findings. Stage 5 remains OPEN pending re-review; G6/G7 frozen.

## 1. Finding dispositions

| # | Finding | Disposition |
| --- | --- | --- |
| 1 | Permission revocation overwritten by `aborted`/`onend` | FIXED — `useSpeechNavigation.ts` preserves `denied`/`unsupported`/`error` through the full callback sequence; regression tests simulate revoke → abort → `onerror("aborted")` → `onend` |
| 2 | Same-millisecond transitions discarded by renderer ordering | FIXED — `AgentStateMachineImpl.nextTimestamp()` emits strictly increasing ISO timestamps when the injected clock does not advance; stale/backwards clocks still cannot move timestamps backwards; renderer strict-ordering unchanged |
| 3 | Missing `llm` provenance mislabeled `LIVE` | FIXED — `LIVE` requires an affirmative non-empty, non-`none` `llm.provider`; explicit `usedFallback`/`provider:"none"` stays `FALLBACK`; absent provenance is `UNAVAILABLE` |
| 4 | Forbidden-surface audit command not reproducible | FIXED — corrected pattern executed; exact command, SHAs and output recorded in §4 below and in the Stage 4 record amendment |
| 5 | Rollback semantics undocumented; no automated rollback tests | FIXED — shared `EILProjectionSlot` on both surfaces; rollback tests for `FeexSovereignEngine` and `/world` (`SpatialWorld`); precise semantics documented in §5 |

## 2. Additional defect found by the new rollback tests

The `FeexSovereignEngine` enabled-path test exposed a real Stage 3 ordering bug: `HoloKaiVoiceModal`'s `applySignals` effect (child) commits `OFFLINE → IDLE` **before** `useEILAgentRuntime`'s subscribe effect (parent) runs. The boot event was never delivered, the hook's own `IDLE` transition was then rejected (`IDLE → IDLE` illegal), and `event` stayed `undefined` — the humanoid projection could never mount on that surface. `useEILAgentRuntime` now seeds the latest committed event from `adapter.stateEvents` at subscribe time and only emits its boot transition when the machine is still `OFFLINE`. Regression test: child-effect-first ordering in `useEILAgentRuntime.test.tsx`.

## 3. Verification evidence (head `57f98b2`)

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit -p tsconfig.json` | PASS (exit 0) |
| Targeted suites | `npx vitest run --project unit` over 12 files (EIL contracts/state-machine/EventBus/renderer/adapter, speech hook, projection, runtime, HoloKaiVoiceModal, FeexSovereignEngine, EILProjectionSlot, OmniCommandBar, SpatialWorld) | **136/136 PASS, zero skips** |
| Production build | `npm run build` | PASS — client 5257 modules, server 160 modules; only pre-existing chunking/zod warnings |

New/updated test coverage: speech revocation sequence (2), monotonic + stale-clock timestamps (2), child-first effect seeding (1), provenance LIVE/UNAVAILABLE/FALLBACK (3), projection slot enable/disable (3), engine projection mount/hide (2), `/world` projection mount/hide (2), OmniCommandBar denied-mic regression (1).

## 4. Corrected forbidden-surface audit

The Stage 4 record's pattern contained an unescaped `(` in `fetch(` and was not executable. Corrected audit, actually run:

```bash
git diff 48bc70aecd7859774877e28c2f3d274230ce0637..57f98b227797221903d925f5f606476785f8e625 \
  -- 'client/**' 'packages/**' \
  | grep -E '^\+' | grep -vE '^\+\+\+' \
  | grep -nE 'fetch\(|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|sendBeacon|axios|socket\.io|actuat|motor|servo'
```

**Actual output (1 line):**

```
1021:+ * performs no network, storage, transport, tool, or actuation work.
```

Single hit is a documentation comment in `EILProjectionSlot.tsx` — **zero executable forbidden-surface additions**. The prior zero-match claim is superseded by this reproducible result.

## 5. Rollback semantics — precise statement

`EIL_PROJECTION_ENABLED` (`client/lib/eil/projectionConfig.ts`) is a **source-level constant compiled into the bundle**, not a remotely switchable runtime flag.

- Setting it `false` (or reverting the Stage 3 PRs) **hides the humanoid renderer projection only**.
- `useEILAgentRuntime()` is still instantiated on both surfaces; the ephemeral `LocalEILAdapter` can still process local signals and commit state-machine events.
- The runtime holds no canonical state, performs no I/O, and is garbage-collected with the component — but "projection disabled" must **not** be described as "EIL disabled".
- Full EIL disablement would additionally require not instantiating/passing the runtime (not implemented; unnecessary for an ephemeral client-only slice).
- Automated coverage: `EILProjectionSlot.test.tsx` (3), `FeexSovereignEngine.test.tsx` mount/hide (2), `SpatialWorld.test.tsx` mount/hide (2).

## 6. Carried-forward open items

- **A05-02 remains OPEN** — `v0.1.0` contract headers vs `EIL_SCHEMA_VERSION = 1.0.0`; requires explicit decision or recorded risk acceptance before release gates.
- Stage 5 human re-review of this correction slice is required before acceptance.
- G6/G7 frozen; no deployment, promotion, or actuation implied.
