# G5 Planning — Agent 03: Integration & Execution-Flow Map

**Status:** Planning deliverable only. No implementation, integration, deployment, or actuation authorized.
**Baseline:** `main@5aade20f5e2cf5d8bfd130217da7e5f6ccc0c7ea` · depends on Agent 02 baseline (PR #68).
**Scope:** EIL package, HoloKai surfaces, Omni-Command — the Phase 5 integration candidates.

---

## 1. Integration entry points (verified)

### 1.1 Omni-Command — the primary LLM orchestration surface

| Endpoint | File | Behavior |
|---|---|---|
| `POST /api/world-model/omni-command` | `server/routes/omni-command.ts:10` | Synchronous orchestration contract |
| `POST /api/world-model/omni-command/stream` | `server/routes/omni-command.ts:31` | SSE trace (`text/event-stream` at :40) |

Mounted at `server/index.ts:200`. Client entry: `/omni` route (Omni-Command Stage).

### 1.2 World Model read surfaces

| Endpoint group | File | Notes |
|---|---|---|
| `/api/world-model/projects`, `/graph`, `/evidence/*`, `/temporal/*`, `/navigator` | `server/routes/world-model.ts` (mount :197) | Rate-limited reads; canonical graph/evidence data |
| `/api/world-model/intelligence` | `server/routes/world-model-intelligence.ts` (mount :199) | Intelligence layer |
| `/api/world-model/telemetry` | `server/routes/world-model-telemetry-stream.ts` (mount :204) | SSE stream; `text/event-stream` at :84 |

### 1.3 HoloKai surfaces (client-side, sovereign engine)

- `client/components/sovereign/HoloKaiInterface.tsx`, `GlobalHoloKaiHotbar.tsx`, `FeexSovereignEngine.tsx`, `ExplodingArchitectureCore.tsx` — sovereign `/world` runtime UI.
- HoloKai is currently a **client-side surface**; no dedicated HoloKai API router was found. Any Phase 5 HoloKai↔backend contract is a **new** interface, not an existing route.

### 1.4 EIL package (`packages/feex-eil`)

- `contracts/`: `agent-state.ts`, `embodied-action.ts`, `evidence-reference.ts`, `interaction-event.ts`, `perception-event.ts`, `schema-version.ts`, `validation.ts` — v0.1.0 canonical contracts (Agent 02 review: CLEAN).
- `interaction/`: `EventBus.ts`, `agent-state-machine.ts`.
- `renderer/`: Humanoid rig/scene/animation components — **correctly unwired** pending G5 (browser-as-projection boundary preserved).

## 2. Real-time transport map

| Transport | Path | File | Producer → Consumer |
|---|---|---|---|
| WS `/telemetry/v1/stream` | raw upgrade handler | `telemetry-websocket.service.ts:33-36` | server telemetry → HUD clients |
| socket.io `/socket.io` | AI channel | `ai-websocket.service.ts:29` | AI provider events → clients |
| socket.io `/socket.io/deployments` | deploy events | `deployment-websocket.service.ts:56` | deploy pipeline → clients |
| socket.io `/socket.io/security` | security events | `security-websocket.service.ts:37` | security scans → clients |
| socket.io `/socket.io/teams` | team activity | `team-activity.websocket.ts:17` | activity → clients |
| WS notification service | — | `websocket-notification.service.ts` | internal fan-out |
| Redis pub/sub | — | `redis-pubsub.service.ts` | cross-instance event bus feeding WS services |

All initialized on the Express `httpServer` at `server/index.ts:320-324` — **in-process only**. There is no separate WS tier.

## 3. State ownership & event flow

- **Canonical state:** PostgreSQL via Prisma + Firestore (dual-DB per `DUAL-DATABASE-ARCHITECTURE.md`) + World Model services.
- **Event producers:** GitHub webhook (`world-model.ts:317`, HMAC-verified), world-model sync scheduler (`world-model-maintenance.service.ts`, started :57), AI services, deploy/security pipelines.
- **Consumers:** SPA projections (REST/SSE/WS), EIL contracts (currently unwired).
- **LLM boundary:** `aiService` provider-neutral adapters interpret canonical data; Omni-Command is the orchestration contract. EIL `EvidenceReference` must bind any LLM-visible claim to canonical evidence.

## 4. Failure / retry / ordering / evidence boundaries

| Concern | Current mechanism | Phase 5 requirement |
|---|---|---|
| Ordering | Redis pub/sub fan-out; no global ordering guarantee across WS namespaces | Define per-stream ordering semantics; EIL `InteractionEvent` sequence numbers if causal order matters |
| Retry | Client-side reconnect for socket.io; SSE has no replay contract | Specify replay/resume semantics for telemetry stream |
| Evidence | `EvidenceReference`/`EvidenceBundle` contracts exist (v0.1.0); `evidence-reference.ts` canonical | Every EIL-emitted claim must carry evidence ref; fictional/disclosure flags mandatory |
| Failure isolation | WS init on same httpServer — a WS service failure can affect the whole process | Phase 5 must not deepen this coupling without isolation plan |

## 5. Backend-branch assumption per flow

| Flow | Assumes Branch A (status quo) | Branch B (Supabase) gap |
|---|---|---|
| Omni-Command REST+SSE | Yes — works today | SSE not ported; route absent from edge function |
| World Model reads | Yes | ~354 routes unported |
| WS telemetry/AI/deploy/security/teams | Yes — requires persistent connections | **No WS capability in current port** — hard blocker |
| Redis pub/sub fan-out | Yes | No Redis on Supabase free tier |
| EIL contracts/renderer | Neutral — unwired; client-side | Neutral |
| HoloKai surfaces | Neutral — client-side | Neutral until a backend contract is defined |

**Conclusion for Agent 05:** every live integration flow currently assumes Branch A. Branch B requires the migration programme before ANY Phase 5 flow can target Supabase. Branch C (hybrid) is the only path where EIL could integrate incrementally — e.g., EIL renderer + contracts are branch-agnostic, but any EIL→backend event flow needs either the `api` function or a new WS-capable service.

## 6. Open questions for Agent 05 / Agent 00

1. Does Phase 5 EIL integration require server-side EIL state, or is client-side rendering + contract validation sufficient for the first integration slice?
2. Which WS namespace (if any) should carry EIL agent-state events — reuse `telemetry` or a new namespace?
3. Does HoloKai need a backend contract at all in Phase 5, or is it purely a sovereign-engine UI surface?
4. Backend-authority branch decision — still open; blocks any Supabase-targeted plan.

## Appendix — Evidence index

| Claim | Evidence |
|---|---|
| Omni mounts | `server/index.ts:197-204` |
| WS init | `server/index.ts:320-324` |
| WS paths | `telemetry-websocket.service.ts:33-36`; `ai-websocket.service.ts:29`; `deployment-websocket.service.ts:56`; `security-websocket.service.ts:37`; `team-activity.websocket.ts:17` |
| SSE headers | `omni-command.ts:40`; `world-model-telemetry-stream.ts:84`; `ai-agents.ts:333` |
| Webhook | `world-model.ts:317` (HMAC SHA-256) |
| EIL contracts | `packages/feex-eil/contracts/*.ts`; renderer unwired per Agent 02 review |
| HoloKai client-only | `client/components/sovereign/HoloKaiInterface.tsx` et al.; no HoloKai router in `server/routes/` |

*Planning artifact. Does not modify code, contracts, or gate status.*
