# FEEXSYSTEMS Landing Architecture — Bounded Migration Target

## Status

**Architecture lock:** implemented and completed  
**Base:** `main` at `8b3018bb7ff8e2ce2891bb0cf56a51f9c31b0de7`  
**Scope:** landing experience only  
**Non-scope:** Sovereign `/world` runtime, backend services, telemetry infrastructure, unrelated application surfaces

## Objective

Replace the current monolithic landing composition with a seven-scene cinematic landing architecture while preserving application routing, the canonical World Model boundary, existing production dependencies, and the ability to prove every migration step.

The landing becomes a projection of the canonical World Model:

`PLANETARY_ECOSYSTEMS → landing registry → seven scenes → React/Three.js projection`

The LLM does not become the World Model. The World Model/evidence layer remains authoritative.

## Target architecture

```text
client/landing/
├── Landing.tsx
├── scenes/
│   ├── HeroScene.tsx
│   ├── GalaxyScene.tsx
│   ├── SystemsScene.tsx
│   ├── WorldsScene.tsx
│   ├── MissionsScene.tsx
│   ├── ConvergenceScene.tsx
│   └── UILoopsScene.tsx
├── cinematic/
│   ├── CinematicVideo.tsx
│   ├── SceneController.tsx
│   ├── SceneTransition.tsx
│   └── AssetPreloader.tsx
├── world/
│   ├── WorldModel.ts
│   ├── WorldNode.tsx
│   └── WorldInspector.tsx
├── motion/
│   ├── MotionSystem.ts
│   └── useSceneProgress.ts
└── registry/
    └── landingAssets.ts
```

`client/pages/Index.tsx` becomes a thin route entry that composes `Landing`.

## Seven-scene contract

1. **HERO** — identity, signal, formation, world-model declaration
2. **GALAXY** — planetary network / ecosystem topology
3. **SYSTEMS** — Evidence, Intelligence Architecture, Navigator
4. **WORLDS** — canonical nine-world presentation and inspection
5. **MISSIONS** — selected cinematic missions and embodied systems
6. **CONVERGENCE** — ecosystem convergence / FEEXSYSTEMS reveal
7. **UI LOOPS & MOTIONS** — interaction language, motion bridges, command-surface continuity

The scenes are presentation boundaries, not independent sources of truth.

## Canonical World Model boundary

The landing must consume the canonical `PLANETARY_ECOSYSTEMS` registry.

The target registry contains nine worlds:

1. 3WM DSP SONIK
2. YURRHEELER MED-NET
3. FARMPLUG AI
4. FIREHOUSE GRILLS
5. FEEXVOLT SECURITY
6. KAPPA-X-CHANGE
7. RENTALL SMARTS HOMES
8. HOLOKAI
9. VYRA LABS

**Important:** the audited base commit contains the eight-world state. VYRA LABS must be introduced at the canonical registry/World Model layer; it must not be appended ad hoc inside `Index.tsx` or a presentation-only component.

## Bounded migration target

This PR defines the architecture and migration boundary. It does **not** perform a bulk rewrite or deletion pass.

### In scope

- Introduce the `client/landing/` architectural boundary.
- Move landing-specific cinematic primitives into the new boundary where justified.
- Extract the seven scene compositions.
- Extract scene sequencing and progress control.
- Extract landing-only asset registration/preloading.
- Converge landing world presentation on `PLANETARY_ECOSYSTEMS`.
- Preserve existing route contracts and command surfaces.
- Preserve the existing Sovereign runtime as an independent application surface.
- Keep evidence/provenance authoritative over visual telemetry.
- Replace `Index.tsx` with a thin landing route entry after the new landing reaches parity.
- Add tests/smoke coverage for landing route and canonical world projection.

### Explicitly out of scope

- No deletion based solely on filenames.
- No deletion of the 21 Sovereign files as part of landing cleanup.
- No rewrite of `FeexSovereignEngine.tsx`.
- No migration of `/world` into `client/landing/`.
- No backend/API/telemetry architecture changes.
- No lockfile/dependency churn unless required by an actual compile failure.
- No redesign of unrelated Navigator, Projects, Omni, or Evidence surfaces.
- No removal of legacy media/components until exact dependency evidence proves they are unused.
- No second merge or promotion of architectural changes before verification.

## Dependency-evidence rule

**Application dependency evidence outranks filenames.**

Before any legacy asset/component is removed, verify:

1. exact filename and symbol search
2. direct imports
3. barrel exports
4. dynamic imports
5. route/page references
6. tests
7. build/config references
8. public URL references
9. typecheck
10. production build
11. landing smoke test
12. `/world` smoke test
13. final import/dependency graph

Only then may an item be classified as an actual orphan.

The previously audited 98-file matrix remains a migration inventory, not a deletion manifest. Items marked **ORPHAN CANDIDATE** require this final proof.

## Migration sequence

### Phase A — boundary

Create `client/landing/` and establish the landing composition without changing the canonical registry.

### Phase B — cinematic primitives

Move/adapt only primitives demonstrated to belong to the landing experience:

- `CinematicVideo`
- `FullscreenScrollSlider`
- `HeroTunnel`
- `ScrollSyncedText`
- `ScrollZoomReveal`
- `SequentialCarousel`
- `TransitionVisualizer`
- `VideoOverlayBackground`

Existing shared primitives remain where other production surfaces depend on them.

### Phase C — World Model projection

Create the landing world projection from `PLANETARY_ECOSYSTEMS`.

Required capabilities:

- nine-world topology
- responsive world-node layout
- real filtering
- selected-world inspector
- evidence fabric / repository trace presentation
- relationship graph
- `INSPECT WORLD` action
- no duplicate world definitions in presentation components

### Phase D — scene composition

Implement the seven scenes and their controller. Scene state must remain presentation state; canonical identity/domain/evidence data must come from the World Model.

### Phase E — route cutover

Change `client/pages/Index.tsx` to a thin entry that renders `Landing`.

Preserve:

- `/`
- `/world`
- `/navigator`
- `/omni`
- `/projects`
- `/evidence`

### Phase F — verification and cleanup

Run:

```text
npm ci
npm run typecheck
npm run build
Sovereign unit suite
landing smoke matrix
/world smoke matrix
route matrix
final import/dependency scan
```

Only after the above passes may cleanup of proven-unused landing assets/components be considered in a separate isolated cleanup PR.

## Architectural invariants

### Invariant 1 — World Model authority

`PLANETARY_ECOSYSTEMS` is canonical. Scene components cannot define competing world registries.

### Invariant 2 — Sovereign isolation

The Sovereign engine remains an independent runtime for `/world`. Landing migration cannot weaken or silently alter its dependency graph.

### Invariant 3 — evidence over decoration

Evidence/provenance classes are authoritative. Design metrics, animation counters, and visual telemetry are not canonical ecosystem truth.

### Invariant 4 — no speculative deletion

A filename that looks legacy is insufficient evidence for deletion.

### Invariant 5 — bounded change

The landing migration must not become an application-wide refactor.

### Invariant 6 — verifiable promotion

No architectural promotion is complete until the actual CI/build/Sovereign/landing evidence exists against the resulting commit.

## Acceptance criteria

- [x] `client/landing/` exists with the target boundaries above.
- [x] `Index.tsx` is a thin route entry.
- [x] Seven scene boundaries exist.
- [x] Landing consumes `PLANETARY_ECOSYSTEMS`.
- [x] Nine worlds are represented canonically, including VYRA LABS.
- [x] World inspector and relationship presentation remain data-driven.
- [x] Existing command surfaces remain reachable.
- [x] `/world` Sovereign runtime remains intact.
- [x] No unproven legacy deletion occurs in the migration PR.
- [x] `npm ci` passes.
- [x] Typecheck passes.
- [x] Production build passes.
- [x] Sovereign suite passes.
- [x] Landing smoke matrix passes.
- [x] `/world` smoke matrix passes.
- [x] Final dependency scan confirms the migration boundary.

## Intended follow-up PRs

1. ~~**Landing implementation PR** — build the seven-scene experience inside this boundary.~~ (COMPLETED)
2. ~~**Canonical registry completion PR** — introduce/verify VYRA LABS in `PLANETARY_ECOSYSTEMS` with evidence.~~ (COMPLETED)
3. ~~**Landing cleanup PR** — remove only assets/components proven orphaned by the final dependency scan.~~ (COMPLETED)

This separation keeps architecture, implementation, registry promotion, and cleanup independently reviewable and reversible.
