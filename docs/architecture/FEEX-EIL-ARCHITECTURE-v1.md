# FEEX Embodied Intelligence Layer (EIL) — Architecture v1

**Status:** Proposed architecture / documentation-only RFC  
**Target platforms:** FEEX WORLD and HOLOKAI  
**Reference implementation:** APEX Humanoid (evaluation only; no source or assets copied)  
**Decision:** Hybrid engineering — benchmark APEX, implement FEEX-owned components, reuse existing FEEX systems where verified.

## 1. Executive summary

FEEX EIL is a shared, versioned interaction and presentation subsystem for embodied intelligence across FEEX WORLD and HOLOKAI. It is not a new source of canonical facts and it is not an autonomous agent by itself.

The subsystem separates five concerns:

1. **Presentation:** humanoid rendering, animation, spatial UI and accessibility.
2. **Perception:** optional camera/audio input, hand/face/pose landmarks and gesture classification.
3. **Cognition:** agent orchestration, model calls, tools, voice and memory gateways.
4. **World Model:** canonical entities, relationships, evidence and provenance.
5. **Embodiment:** simulated or physical robotics through approved action contracts and a deterministic safety boundary.

**Invariant:** The LLM interprets the World Model; it does not become the World Model. The humanoid is a projection of validated state, not an authority for facts, telemetry or execution.

This RFC does not authorize robot actuation, camera recording, a new production dependency, a purchase of APEX, or a production rollout.

## 2. Repository context and integration points

The FEEX WORLD repository currently contains these relevant integration points:

- `client/components/sovereign/FeexSovereignEngine.tsx`
- `client/components/sovereign/HoloKaiInterface.tsx`
- `client/components/sovereign/HoloKaiVoiceModal.tsx`
- `src/components/holokai/HoloKaiRoboticCore.tsx`
- `src/context/HoloKaiContext.tsx`

The separate `FeexSystems/HoloKai-Systems-Labs` repository contains the HOLOKAI BFF and cognitive/voice/robotics workspaces. Changes to that repository must be proposed and reviewed separately; this PR does not modify it.

These paths are integration candidates, not a claim that every capability described in this RFC already exists or is production-ready.

## 3. Hybrid strategy and APEX boundary

APEX is an external engineering reference for evaluating particle rendering, humanoid presentation, interaction patterns and licensing. FEEX will:

- inspect source and dependency structure only through authorized access;
- record which capabilities are demonstrated, advertised or independently verified;
- benchmark rendering and interaction on named hardware profiles;
- review commercial, redistribution and OEM terms before any acquisition;
- implement original FEEX code, shaders, geometry, interaction logic and visual assets.

FEEX will not copy proprietary APEX source, artwork, shaders or assets without explicit rights. No APEX-derived code is proposed in this RFC.

## 4. Logical architecture

### 4.1 Presentation plane

Responsibilities:

- procedural particle and mechanical humanoid renderers;
- facial and body animation;
- state-driven visual effects;
- adaptive quality / particle level-of-detail;
- reduced-motion and non-visual interaction alternatives.

Initial rendering investigation should benchmark the existing Three.js implementation before introducing another renderer or framework. React Three Fiber is optional and must be justified by compatibility and measurable developer/runtime benefit.

### 4.2 Perception plane

Responsibilities:

- explicit camera and microphone permission lifecycle;
- hand, face and pose landmark acquisition;
- gesture classification and confidence thresholds;
- debouncing, interaction-mode gating and revocation;
- local processing by default.

Raw camera frames must not be sent to an LLM. Any remote media processing requires a separate explicit product/security decision, disclosure and data-retention policy.

### 4.3 Cognition plane

Responsibilities:

- typed gateway to the existing agent/oracle services;
- speech-to-text and text-to-speech adapters;
- conversation/session persistence;
- tool authorization and execution correlation;
- clear separation between model generation and successful tool execution.

The frontend must not embed provider secrets. Provider calls should go through the authenticated server-side/BFF boundary.

### 4.4 World Model plane

Responsibilities:

- canonical entity and relationship retrieval;
- evidence references and provenance;
- versioned snapshots or event references;
- authoritative operational state where available.

The renderer must not invent entity identity, telemetry, evidence, confidence or task completion. Missing data must remain missing and be represented as unavailable.

### 4.5 Embodiment plane

Responsibilities:

- typed action request and observation contracts;
- simulation-first integration;
- deterministic safety gateway;
- authorization, limits, interlocks and audit trail;
- ROS 2 / Isaac adapters where supported by the HOLOKAI robotics workspace.

No LLM may directly command motors. Physical execution remains disabled until simulation, safety review and explicit operator authorization pass.

## 5. Shared package proposal

The following is a proposed package boundary, not an assertion that these files already exist:

```text
packages/feex-eil/
  contracts/
    agent-state.ts
    perception-event.ts
    gesture-event.ts
    evidence-reference.ts
    interaction-event.ts
    embodied-action.ts
  renderer/
    HumanoidScene.tsx
    ParticleHumanoid.tsx
    HumanoidFace.tsx
    MechanicalHumanoid.tsx
    ParticleField.tsx
    shaders/
  perception/
    CameraController.ts
    HandTracker.ts
    FaceTracker.ts
    PoseTracker.ts
    GestureClassifier.ts
    PermissionManager.ts
  interaction/
    InteractionMachine.ts
    GestureRouter.ts
    AudioController.ts
    EventBus.ts
  cognition/
    AgentGateway.ts
    VoiceGateway.ts
    MemoryGateway.ts
  adapters/
    FeexWorldAdapter.ts
    HoloKaiAdapter.ts
  tests/
```

The package should be introduced only after workspace/package-manager compatibility is confirmed. If the repositories cannot safely share a package, publish a versioned internal package or use a pinned Git dependency rather than copying implementation files between repositories.

## 6. Initial contracts

### 6.1 Agent state

```ts
export type AgentState =
  | "IDLE"
  | "LISTENING"
  | "PERCEIVING"
  | "THINKING"
  | "RESPONDING"
  | "SPEAKING"
  | "EXECUTING"
  | "ERROR"
  | "OFFLINE";

export interface AgentStateEvent {
  eventId: string;
  agentId: string;
  state: AgentState;
  timestamp: string;
  source:
    | "voice"
    | "perception"
    | "cognition"
    | "world-model"
    | "robotics";
  correlationId?: string;
  evidenceRefs: string[];
}
```

State changes must be emitted from actual subsystem events. A model response being generated is not proof that a tool is executing. A tool request being submitted is not proof that it succeeded.

### 6.2 Perception

```ts
export interface Landmark3D {
  x: number;
  y: number;
  z?: number;
}

export interface PerceptionEvent {
  eventId: string;
  timestamp: string;
  modality: "hand" | "face" | "pose" | "audio";
  confidence: number;
  landmarks?: Landmark3D[];
  gesture?: string;
  interactionAllowed: boolean;
}
```

Confidence must be calibrated for the relevant classifier and test set. It must not be fabricated or substituted with a constant.

### 6.3 Evidence

```ts
export interface EvidenceReference {
  evidenceId: string;
  entityId: string;
  source: string;
  epistemicStatus:
    | "ESTABLISHED"
    | "SCHOLARLY_DEBATE"
    | "TRADITION"
    | "ESOTERIC"
    | "SPECULATIVE"
    | "FICTIONAL";
  confidence?: number;
  verifiedAt?: string;
}
```

The evidence vocabulary above is a proposed interface contract and must be reconciled with the canonical registry before implementation. Confidence is optional and must only be populated by a defined evidence-evaluation process.

### 6.4 Contract requirements

- Runtime validation at network and persistence boundaries.
- Explicit schema versioning and backwards-compatibility policy.
- Stable event IDs and correlation IDs.
- Timestamps in ISO 8601 UTC.
- No secrets or raw biometric media in event payloads.
- Unknown, stale and unavailable states represented explicitly.

## 7. Visual and interaction specification

Two renderer modes share the same contracts:

- **Holographic mode:** original FEEX particle humanoid with face, neck and upper-body forms.
- **Mechanical mode:** extension of the existing HoloKai mechanical-core visual language.

Proposed visual states:

| State | Visual response |
|---|---|
| IDLE | restrained breathing / ambient motion |
| LISTENING | audio-reactive listening indicator |
| PERCEIVING | tracking indicators with permission status |
| THINKING | restrained neural/particle circulation |
| RESPONDING | response transition |
| SPEAKING | speech-synchronized facial animation |
| EXECUTING | task-specific animation only after execution event |
| ERROR | explicit error indicator |
| OFFLINE | subdued static state |

Initial gesture candidates (subject to usability testing):

- Open palm: activate interaction.
- Closed fist: pause interaction.
- Index point: select a visible object.
- Two-finger gesture: navigate.
- Palm rotation: rotate a 3D scene.
- Both hands open: expand spatial interface.

Gestures must be gated by confidence, dwell/debounce rules and explicit interaction mode. High-impact actions must never be triggered by gesture alone.

## 8. Platform integration

### FEEX WORLD

Candidate integration points:

- `FeexSovereignEngine.tsx`: composition boundary.
- `SovereignScene`: renderer host.
- `SovereignHUD`: state and evidence presentation.
- `SovereignControls`: keyboard, pointer, voice and gesture controls.
- `SovereignTelemetry`: real telemetry events only.
- `HoloKaiInterface`: shared interaction surface.

The World Model remains the canonical source for ecosystem identity, relationships and evidence.

### HOLOKAI

Candidate integration points in FEEX WORLD and the separate HOLOKAI repository:

- extend the existing procedural robotic core rather than replacing it;
- connect voice through the authenticated BFF services;
- connect Oracle/RAG and memory through typed gateways;
- map only verified events into visual agent states;
- route robotics through existing action contracts and a deterministic safety gateway.

Repository-specific implementation must be delivered in a separate HOLOKAI PR after the shared contracts are agreed.

## 9. Trust, privacy and safety requirements

1. Camera and microphone permissions are explicit, visible and revocable.
2. Camera processing is local by default.
3. No recording or retention by default.
4. Raw frames and biometric landmarks are not sent to an LLM.
5. Data retention and deletion rules are documented before any persistence.
6. Provider credentials remain server-side.
7. Tool calls require authenticated authorization and auditable correlation.
8. Agent states reflect real events, not animation timers.
9. Operational telemetry is never fabricated.
10. Physical robotics is simulation-first and protected by deterministic safety controls.
11. Accessibility includes keyboard alternatives and reduced-motion support.
12. Failures and unavailable services are visible; no success-shaped fallback messages.

## 10. Verification plan and proposed targets

Targets below are acceptance goals, not measured results:

| Area | Proposed target |
|---|---|
| State contract | 100% valid transitions in contract tests |
| Gesture precision | >=95% on a documented controlled test set |
| False gesture activations | <1 per 10 minutes in the same test protocol |
| UI interaction latency | P95 <100 ms on named desktop hardware |
| Desktop rendering | 60 FPS target on named reference hardware |
| Mobile rendering | adaptive 30 FPS target on named mobile hardware |
| Evidence traceability | every grounded factual response has traceable evidence references |
| Camera privacy | local by default; permission revocation tested |
| Accessibility | keyboard alternatives and reduced-motion tests |
| Robotics | simulation and safety tests pass before physical execution |

Benchmark reports must identify browser, OS, CPU, GPU, memory, viewport, particle count and test protocol. Do not report a target as achieved without captured measurements.

## 11. Delivery gates

### Gate 0 — Repository/CI integrity

- Investigate the existing FEEX WORLD `npm ci` failure.
- Restore deterministic dependency installation.
- Run typecheck, lint, unit tests, build and production browser smoke.
- Record exact commit SHA and logs.

**No implementation promotion before this gate passes.**

### Gate 1 — APEX technical/IP evaluation

- Authorized source and dependency inspection.
- Capability classification: advertised, demonstrated, independently verified.
- License and OEM review.
- Hardware benchmark and IP provenance register.

### Gate 2 — EIL foundation

- Agree contracts and schema versioning.
- Implement state machine and event validation.
- Add contract, unit and integration tests.

### Gate 3 — Renderer

- Build original FEEX particle renderer.
- Extend mechanical mode.
- Add adaptive quality and reduced-motion support.
- Benchmark on named hardware.

### Gate 4 — Perception and voice

- Permission lifecycle.
- Hand/face/pose tracking.
- Gesture classifier.
- Voice adapters and speech synchronization.
- Privacy and failure-mode tests.

### Gate 5 — Intelligence integration

- Authenticated agent and voice gateways.
- World Model retrieval.
- Evidence-grounded answers.
- Persistent sessions and memory.
- Live state and telemetry verification.

### Gate 6 — Robotics

- Simulation-only action integration.
- Deterministic safety gateway.
- Isaac/ROS 2 observation loop.
- Physical trials only after formal safety review and operator approval.

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Existing CI instability | Gate 0 before implementation |
| Renderer performance | LOD, adaptive particle budgets and hardware benchmarks |
| Camera privacy | Local processing, explicit permission and no default recording |
| Gesture false positives | Confidence thresholds, debounce and interaction gating |
| Hallucinated status | Event-sourced state and explicit unavailable status |
| Evidence drift | Canonical World Model and provenance references |
| Provider outage | Explicit degraded/offline state |
| Cross-repository drift | Versioned package and compatibility tests |
| IP infringement | Original assets/code and documented license review |
| Unsafe robot actuation | Simulation-first, deterministic safety gateway, operator authorization |

## 13. Scope of this RFC

This PR is documentation-only. It:

- records the proposed hybrid architecture;
- identifies current integration candidates;
- defines initial contracts and safety invariants;
- sets staged implementation and verification gates.

It does not:

- change application code or dependencies;
- create the `packages/feex-eil` implementation;
- alter the World Model registry;
- modify the HOLOKAI repository;
- purchase or incorporate APEX source/assets;
- enable camera capture, remote media processing or robot actuation;
- claim that any proposed acceptance target has been met.

## 14. Acceptance checklist

- [ ] Architecture reviewed by FEEX WORLD maintainers.
- [ ] Canonical evidence vocabulary reconciled with the World Model.
- [ ] Package/workspace strategy approved.
- [ ] Security and privacy review accepted.
- [ ] APEX license and IP review completed before any reuse.
- [ ] Gate 0 CI integrity restored and recorded.
- [ ] Contracts approved before implementation begins.
- [ ] Separate HOLOKAI integration PR planned.

---

**Architectural principle:** One intelligence layer. Two worlds. Multiple embodiments.
