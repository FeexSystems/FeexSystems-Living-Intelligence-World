# G5 Planning — Agent 00 Consolidated Review Index

**Purpose:** single traceability index for the merged G5 planning packet. Each acceptance dimension maps to exact document sections, repository evidence, and the specific question Agent 00 must answer.
**Baseline:** `main@ecfb58c` · **Packet:** `docs/program/g5-planning/` (PRs #67–#75) · **Status:** review aid only — no decision is recorded or implied here.

**Dispositions used:** `PASS` = evidence sufficient · `CONDITIONAL` = passable with recorded caveat · `OPEN` = unresolved, requires disposition · `NOT EVIDENCED` = claim lacks repository evidence.

---

## Dimension 1 — Architecture baseline accuracy

| | |
|---|---|
| **Source** | `AGENT-02-ARCHITECTURE-BASELINE.md` §2 (authority chain), §3 (backend branch), §5 (constraints), Appendix A (evidence index) |
| **Evidence** | `server/index.ts:268` (`api = onRequest`), `firebase.json:46-57` (rewrites), `server/index.ts:197-204` (route mounts), `server/index.ts:320-324` (WS init), `client/lib/dataconnect-client.ts` importers, zero Supabase callers (app code + env templates) |
| **Review test** | Do the authority chain, three-branch backend decision, and hard constraints (WS/SSE/Redis/Prisma/Firestore) match current `main` source? Is the Supabase zero-caller finding adequately evidenced? |
| **Disposition** | CONDITIONAL — evidence appendix is strong; route-count figure is methodology-limited (see Dimension 6) |

## Dimension 2 — Integration flow correctness

| | |
|---|---|
| **Source** | `AGENT-03-INTEGRATION-FLOW-MAP.md` §1–§5, Appendix |
| **Evidence** | `server/routes/omni-command.ts:10,31,40`; `world-model.ts:317` (HMAC webhook); `world-model-telemetry-stream.ts:84`; `ai-agents.ts:333`; socket.io paths (`ai-websocket.service.ts:29`, `deployment-websocket.service.ts:56`, `security-websocket.service.ts:37`, `team-activity.websocket.ts:17`); raw WS `/telemetry/v1/stream` (`telemetry-websocket.service.ts:33-36`); `websocket-notification.service.ts` unwired (no instantiation) |
| **Review test** | Are entry points, the five real-time transports, state ownership, and the Branch-A assumption per flow accurate? Is the "HoloKai has no backend router" finding correct? |
| **Disposition** | CONDITIONAL — transport inventory corrected post-review; Branch C wording reconciled by #75; re-verify against merged text |

## Dimension 3 — First-slice scope boundary

| | |
|---|---|
| **Source** | `AGENT-05-EIL-ADAPTER-CONTRACTS.md` §1 (recommendation), §4.1 (local event flow), §6 (transport/persistence decision), §8 (12 acceptance criteria) |
| **Evidence** | Client-only, ephemeral scope; no new World Model writes, persistence, network requests, transports, tool execution, or robotics actions |
| **Review test** | Is the client-only first slice sufficiently bounded? Does anything in the packet silently assume server-side state, a new transport, or Branch B/C infrastructure? |
| **Disposition** | OPEN — hinges on A05-01 (client-only sufficiency), which is a **human owner** decision, not Agent 00's |

## Dimension 4 — Contract fidelity

| | |
|---|---|
| **Source** | `AGENT-05-EIL-ADAPTER-CONTRACTS.md` §2 (contract inventory, invariants); `AGENT-09-TEST-STRATEGY.md` §3–§5 (tests against live exports) |
| **Evidence** | `packages/feex-eil/contracts/{agent-state,perception-event,evidence-reference,interaction-event,embodied-action,schema-version,validation}.ts`; `interaction/{EventBus,agent-state-machine}.ts`; `renderer/{HumanoidScene,HumanoidStateAdapter,HumanoidAnimationController}.tsx/ts` |
| **Review test** | Do the 84 proposed tests reference only verified live exports? Are the EpistemicStatus/ImpactLevel/authorized safety models correctly represented? |
| **Disposition** | CONDITIONAL — v2 + post-merge corrections applied; Agent 00 must re-verify symbol-level claims against source |

## Dimension 5 — Version governance

| | |
|---|---|
| **Source** | `AGENT-05-EIL-ADAPTER-CONTRACTS.md` §2.1; `AGENT-09-TEST-STRATEGY.md` §2.1; sequence proposal §6 (A05-02), §7 P-03 |
| **Evidence** | Contract headers `v0.1.0` (e.g., `agent-state.ts:3`) vs `EIL_SCHEMA_VERSION = "1.0.0"` (`schema-version.ts:12`); renderer imports `../contracts/*` — no stale copy |
| **Review test** | Are the two version labels distinct axes or a defect? **Unresolved by design** — Agent 02 must disposition before any versioned adapter work. |
| **Disposition** | **OPEN** — A05-02; blocks versioned adapter implementation only |

## Dimension 6 — Route/endpoint evidence methodology

| | |
|---|---|
| **Source** | Sequence proposal §7 (guardrail); Agent 02 Appendix A; Agent 09 §2.3 |
| **Evidence** | 391 = grep method-call matches incl. `.use()` mounts; ~292 = earlier unverified estimate; ~37 = Supabase port (method not comparable); `391−37=354` explicitly rejected as invalid |
| **Review test** | Is the guardrail correctly preventing false parity claims? Is a verified per-router endpoint inventory still required before migration planning? |
| **Disposition** | PASS (as guardrail) — the packet now forbids the invalid inference; actual inventory remains future work |

## Dimension 7 — Security, safety & negative boundaries

| | |
|---|---|
| **Source** | `AGENT-09-TEST-STRATEGY.md` §8 (SEC-01..10), §7.3 (NEG-01..05); `AGENT-05` §7 (failure/security/privacy) |
| **Evidence** | `EventBus` authorization gate (`blocked[]`, all impact levels), `isPhysicalExecutionPermitted` requestId-match invariant, `requiresOperatorAuthorization`, `disclosureForBundle` fail-closed recompute, `isPermissionRevoked`, `GESTURE_INTENT_MAP` max MEDIUM |
| **Review test** | Do security tests map to real machinery (no invented T0–T6 tiers)? Do NEG tests correctly scope to newly introduced files only? |
| **Disposition** | CONDITIONAL — symbol-level verification required; scoped correctly post-correction |

## Dimension 8 — Sequencing, rollback & decision governance

| | |
|---|---|
| **Source** | `G5-IMPLEMENTATION-SEQUENCE-AND-ROLLBACK-PROPOSAL.md` §2 (preconditions P-01..P-10), §3 (stages 0–5), §4 (observability), §5 (disable/rollback), §6 (decision register), §8 (non-claims) |
| **Evidence** | Stage gates map to contract → lifecycle → optional renderer → integrated verification → human release decision; rollback = feature-flag/disable path, no persistence to unwind |
| **Review test** | Are preconditions sufficient to prevent premature implementation? Is rollback credible for a client-only slice? Are all seven decisions (A05-01..07) preserved as OPEN? |
| **Disposition** | CONDITIONAL — structure sound; depends on Dimension 3 outcome |

---

## Preserved open items — must not be closed by this index

| Item | Status | Owner |
|---|---|---|
| A05-01 client-only sufficiency | OPEN — recommendation only | Human owner |
| A05-02 version discrepancy | OPEN | Agent 02 → human disposition |
| A05-03 NavigatorResult evidence shape | OPEN — requires server-type inspection | Agent 02/05 |
| A05-04 speech lifecycle mapping | OPEN | Agent 03/05 → human |
| A05-05 renderer wiring scope | OPEN | Agent 02/03/00 → human |
| A05-06 package import boundary | OPEN | Agent 02 |
| A05-07 server-side persistence | OPEN — recommended NO for first slice | Human owner |
| G4 Storybook exception | OPEN infrastructure issue (2 failures, disclosed) | Engineering backlog |
| G7 unrecorded deployment | Recorded exception; no retroactive authorization | Governance record |
| RTDB credential rotation | Outstanding human security action | Human owner |
| Deploy runs pending env gate | `44860333141`, `44889368617` | Human owner |

## Verification caveats carried forward

- Post-merge CI on `ecfb58c`: 4/4 verification workflows PASS incl. gate-verification (lockfile fix verified).
- Netlify preview checks remain entitlement-limited — excluded per programme §146.
- Sourcery rate-limited on several PRs; Kilo/Codex/GitGuardian clean.
- This index cites packet documents; it does not independently re-verify every repository claim — that is Agent 00's task.

---

*Review aid only. No gate status changes. G5 implementation, G6, G7 remain unauthorized/frozen.*
