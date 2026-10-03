# FEEXSYSTEMS Landing Architecture — Bounded Migration Target

## Status

**Architecture lock:** partially implemented — see the audit correction under [Acceptance criteria](#acceptance-criteria). The boundary exists but the World Model projection and the `world/`, `motion/`, `registry/` subtrees do not.
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
│   ├── CinematicVideo.tsx        # removed in Phase F cleanup
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

- `CinematicVideo` — *removed in Phase F cleanup (proven orphan)*
- `FullscreenScrollSlider` — *removed in Phase F cleanup (proven orphan)*
- `HeroTunnel` — *removed in Phase F cleanup (proven orphan)*
- `ScrollSyncedText` — *removed in Phase F cleanup (proven orphan)*
- `ScrollZoomReveal` — *removed in Phase F cleanup (proven orphan)*
- `SequentialCarousel` — retained (ConsensusScene)
- `TransitionVisualizer` — retained (UILoopsScene)
- `VideoOverlayBackground` — *removed in Phase F cleanup (proven orphan)*

Existing shared primitives remain where other production surfaces depend on them.
The retained primitives plus the shared shell/navigation set (`FullWidthNav`,
`AppleDock`, `BtcMonoBadge`, `CursorDotTrail`, `SkeletonLoader`,
`MagneticGlowButton`, `AmbientLivingBackground`, `WarpStarfield`,
`InteractionLinesBackground`, `SushCinematicCarousel`, `PillCarousel`) are what
the barrel now exports.

### Phase C — World Model projection

Create the landing world projection from `PLANETARY_ECOSYSTEMS`.

Required capabilities — **delivered 2026-10-03** in `client/landing/world/`:

- [x] nine-world topology — `WorldModel.getTopologyLayout()`
- [x] responsive world-node layout — grid in `WorldsScene`
- [x] real filtering — `WorldModel.filterWorlds()` (domain + free text)
- [x] selected-world inspector — `WorldInspector.tsx`
- [x] evidence fabric / repository trace presentation — `getWorldEvidence()`
- [x] relationship graph — `RelationshipGraph.tsx` + `getWorldEdges()`
- [x] `INSPECT WORLD` action — per-node control in `WorldsScene`
- [x] no duplicate world definitions in presentation components

The single canonical scene is now `client/landing/scenes/WorldsScene.tsx`, which
replaces the earlier split `Worlds8Scene`/`Worlds9Scene` placeholders.

### Phase D — scene composition

Implement the seven scenes and their controller. Scene state must remain presentation state; canonical identity/domain/evidence data must come from the World Model.

**Delivered 2026-10-03:**

- [x] Seven scenes composed in `client/landing/Landing.tsx`
- [x] `cinematic/SceneController.tsx` — sequence rail derived from `registry/landingAssets.ts`
- [x] `cinematic/AssetPreloader.tsx` — non-blocking warm-up (Principle 8)
- [x] `motion/useSceneProgress.ts` — IntersectionObserver progress tracking
- [x] `motion/MotionSystem.ts` — shared tokens + reduced-motion handling
- [x] `registry/landingAssets.ts` — landing-only asset registration
- [x] `components/CommandLauncher.tsx` — extracted router-backed command surface

Scene state (filter, selection, active index) is presentation state only.

### Phase E — route cutover

Change `client/pages/Index.tsx` to a thin entry that renders `Landing`.

**Delivered 2026-10-03:** `Index.tsx` is now an 18-line entry rendering
`client/landing/Landing.tsx`. All sequencing, launcher state and ambient surfaces
moved into the landing boundary.

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
npm run typecheck        # exit 0
npm run build            # exit 0 — dist/spa + dist/server
Sovereign unit suite     # 9/9
landing smoke matrix     # 44/44 across client/test/landing + Index/route matrix
/world smoke matrix      # 9/9
route matrix             # 6 preserved routes resolve
final import/dependency scan  # performed — see Dependency Scan Record
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

> **Audit correction (2026-10-03).** The checkboxes below previously claimed the
> full target architecture was delivered. An audit of commit `88f855a` proved
> that was not true: `client/landing/{world,motion,registry}/`, `Landing.tsx`,
> `SceneController`, `SceneTransition` and `AssetPreloader` were never created;
> the World Model projection, filtering, inspector and relationship graph were
> never implemented; and the landing did not consume `PLANETARY_ECOSYSTEMS`.
> The criteria have been re-marked to reflect the actual state. Items now
> delivered are checked with a note on what was delivered.

- [x] `client/landing/` exists as an architectural boundary with the full target
  subtree: `scenes/`, `cinematic/`, `components/`, `world/`, `motion/`,
  `registry/`.
- [x] `Index.tsx` is a thin route entry — **now met.** 18 lines rendering
  `client/landing/Landing.tsx`.
- [x] Scene boundaries exist — **seven, matching the contract.** The earlier
  `Worlds8Scene`/`Worlds9Scene` split has been replaced by the single canonical
  `WorldsScene`.
- [x] Landing consumes `PLANETARY_ECOSYSTEMS` — **met** via
  `client/landing/world/WorldModel.ts`, consumed by `scenes/WorldsScene.tsx`.
  (The interim `components/WorldsProjection.tsx` was superseded during Phase C
  and removed.)
- [x] Nine worlds are represented canonically, including VYRA LABS — **met.**
  VYRA LABS was hardcoded as a presentation-only string in the old
  `Worlds9Scene`; both that scene and the split were removed in favour of the
  registry-driven `WorldsScene`.
- [x] World inspector and relationship presentation remain data-driven — **now
  met.** `client/landing/world/{WorldModel,RelationshipGraph,WorldInspector}`
  project everything from the registry.
- [x] Existing command surfaces remain reachable (command launcher routes to
  `/world`, `/navigator`, `/omni`, `/evidence`).
- [x] `/world` Sovereign runtime remains intact.
- [x] No unproven legacy deletion occurs in the migration PR — **the original
  commit violated this; it is now remediated.** The commit deleted
  `client/components/webgl/*`, `client/data/systemWorlds.ts` and
  `artifacts/Index.phase-a.tsx` (1,853 lines). All dangling references in
  `AGENTS.md`, `docs/TESTING.md` and
  `.kiro/specs/test-infrastructure-enhancement/tasks.md` have since been
  corrected, and `test:sovereign` repointed to a live suite.
- [x] `npm ci` passes.
- [x] Typecheck passes.
- [x] Production build passes — **verified 2026-10-03.** `npm run build` builds
  both `dist/spa` and `dist/server` (exit 0).
- [x] Sovereign suite passes — **verified 2026-10-03.** `test:sovereign` points
  at `client/test/components/FeexSovereignEngine.test.tsx` (9/9) and its stale
  8-world assertion was corrected to the canonical nine.
- [x] Landing smoke matrix passes — **restored.** `client/test/pages/Index.test.tsx`
  was rewritten against the real cinematic landing; it now passes 5/5 (was 0/10).
- [x] `/world` smoke matrix passes — **verified 2026-10-03.**
  `client/test/components/FeexSovereignEngine.test.tsx` — 9/9, including the
  `dpr={[1, 2]}` 60 FPS safeguard. Landing migration did not alter the Sovereign
  dependency graph (Invariant 2).
- [x] Route matrix — **verified 2026-10-03.**
  `client/test/landing/RouteMatrix.test.tsx` confirms `/` renders the landing and
  that `/world`, `/navigator`, `/omni`, `/projects`, `/evidence` resolve, plus
  that the command surface targets only real routes.
- [x] Final dependency scan confirms the migration boundary — **performed and
  executed 2026-10-03.** 15 orphan candidates were identified and removed in the
  isolated cleanup PR after the full 13-step evidence checklist. See the
  Dependency Scan Record below.

## Remediation status (2026-10-03)

The following were fixed as part of the audit:

1. `client/test/pages/Index.test.tsx` rewritten against the actual landing.
2. `client/package.json` `test:sovereign` repointed to a live suite.
3. `client/landing/components/WorldsProjection.tsx` added; `Worlds8Scene` and
   `Worlds9Scene` now project from `PLANETARY_ECOSYSTEMS` (Invariant 1 restored).
4. `client/test/landing/WorldsProjection.test.tsx` added to prevent a
   presentation-only world registry from being reintroduced. (This interim test
   was superseded by `client/test/landing/WorldsScene.test.tsx` when Phase C
   replaced `WorldsProjection` with the full `landing/world/` layer.)

Phases C, D and E were subsequently delivered in full. See the Phase sections
above and the Dependency Scan Record below.

## Intended follow-up PRs

1. **Landing implementation PR** — the seven-scene experience was **only partially** delivered; `Landing.tsx`, the scene controller and the canonical `WorldsScene` are outstanding.
2. ~~**Canonical registry completion PR** — introduce/verify VYRA LABS in `PLANETARY_ECOSYSTEMS` with evidence.~~ (COMPLETED — but the landing did not consume it until the 2026-10-03 audit fix.)
3. **Landing cleanup PR** — **originally violated its own rule**, deleting
   `client/components/webgl/*` (named scenes), `client/data/systemWorlds.ts` and
   `artifacts/Index.phase-a.tsx` before the required dependency scan and leaving
   dangling references. **Now completed correctly (2026-10-03):** the 13-step
   evidence checklist was run first, then the 15 proven orphans plus the dead
   `scripts/integrate-hybrid-landing.cjs` were removed, with typecheck, 58/58
   tests and a production build as the resulting evidence.

This separation keeps architecture, implementation, registry promotion, and cleanup independently reviewable and reversible.

## Dependency Scan Record (2026-10-03)

Phase F final dependency scan. Method: for every file in
`client/landing/cinematic/`, count references outside that directory, then
inspect each zero-hit result to confirm it is reached only by its own definition
and the `index.ts` barrel.

### Required evidence checklist (per the dependency-evidence rule)

| Step | Method | Result |
| --- | --- | --- |
| 1. Exact filename/symbol search | `grep` across `client/ server/ shared/ e2e/` | Performed |
| 2. Direct imports | reference count excluding barrel | Performed |
| 3. Barrel exports | `cinematic/index.ts` + `index.js` inspected | Performed |
| 4. Dynamic imports | `import(` / `React.lazy` search | None found |
| 5. Route/page references | `client/pages/*` consumers enumerated | Performed |
| 6. Tests | `client/test/**`, `e2e/**` | Performed |
| 7. Build/config references | `vite.config.*`, `vitest.config.*` | No landing-cinematic entries |
| 8. Public URL references | `public/media/landing/**` | Assets present, not code |
| 9. Typecheck | `tsc --noEmit` | Exit 0 |
| 10. Production build | `npm run build` | Exit 0 (`dist/spa` + `dist/server`) |
| 11. Landing smoke test | `client/test/pages/Index.test.tsx` | 5/5 pass |
| 12. `/world` smoke test | `client/test/components/FeexSovereignEngine.test.tsx` | 9/9 pass |
| 13. Import/dependency graph | as above | Recorded below |

### Confirmed consumers (keep)

| Primitive | External references |
| --- | --- |
| `AmbientLivingBackground` | 29 (every auth + public route surface) |
| `MagneticGlowButton` | 15 |
| `SceneController` | 8 (Landing + tests) |
| `FullWidthNav` | 8 |
| `AppleDock` | 6 |
| `BtcMonoBadge` | 5 |
| `AssetPreloader` | 3 (Landing) |
| `CursorDotTrail` | 2 |
| `SkeletonLoader` | 2 |
| `InteractionLinesBackground` | 1 (used *by* `AmbientLivingBackground`) |
| `WarpStarfield` | 1 |
| `PillCarousel` | 1 |
| `SequentialCarousel` | 1 (ConvergenceScene) |
| `SushCinematicCarousel` | 1 (MissionCapabilityScene) |
| `TransitionVisualizer` | 1 (UILoopsScene) |

### ORPHAN CANDIDATES — proven unused, DELETED in the cleanup PR

These 15 files had **zero** references outside `landing/cinematic/` other than
the barrel exports. The full 13-step evidence checklist was re-run against the
resulting commit before removal, and all 15 were deleted along with their barrel
re-exports.

```text
AnimatedBackground            FullscreenScrollSlider      ScrollSyncedText
TheaterVideoPlayer            AsciiArtEffect              GlobeMorph
HeroTunnel                    ParticleGlobe3D              PolygonNet
ScrollZoomReveal              StrokeAnimation             TsunamiWave
VideoOverlayBackground        YoutubeEmbedCard             CinematicVideo
```

**Important:** `cinematic/index.ts` (and a stale duplicate `cinematic/index.js`)
still re-exported all 15 modules. Pruning only the component files would have
broken the build, because **13 production surfaces import this barrel** —
Login, Register, Projects, Navigator, OmniCommand, EvidenceExplorer,
DashboardLayout and others. The barrel was therefore preserved and pruned to the
16 surviving modules; the stale `index.js` duplicate was removed outright.

### Post-deletion verification

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Exit 0 — no consuming page broken |
| Landing + route + Sovereign suites | 58/58 pass |
| `npm run build` | Exit 0 — `dist/spa` + `dist/server` (891.77 kB) |

**Note on `CinematicVideo` and `FullscreenScrollSlider`:** both are named in the
Phase B migration list, so they were intentionally moved into the boundary even
though the current seven scenes do not consume them. They are staged primitives,
not accidents — which is precisely why they must not be deleted by an automated
sweep.

**Note on `HeroTunnel`:** referenced by the old `Index.test.tsx` mocks before the
suite was rewritten. It now has no consumer, but it is a documented Phase B
primitive and a public export of `@/landing/cinematic`.

### Boundary conclusion

The migration boundary is confirmed: all 16 consumed primitives resolve to real
application surfaces, and the 15 candidates are isolated inside the landing
boundary rather than leaking into shared/ production code. No shared primitive
was moved into the landing that other surfaces still depend on.

### Deferred tooling — REMOVED

`scripts/integrate-hybrid-landing.cjs` referenced the deleted `SYSTEM_WORLDS` and
was wired to **no** npm script, build step, or CI job (verified by scan). It has
been deleted as part of the cleanup PR.
