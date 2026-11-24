# FEEX-SORL Phase 1 — Design Brief, Scene Plan & Renderer Architecture

**Document ID:** FEEX-SORL-P1-DESIGN-001
**Branch:** `feat/feex-sorl-lab` · **Base:** `9f68ac2`
**Authority:** FEEX-SORL-MEGA-IMPLEMENTATION-PLAN v1.0.0, Phase 1

---

## 1. Design brief (frozen pending human approval — §18.1 gate)

**Experience:** A monochromatic noir research laboratory at night. The FEEX Sovereign humanoid stands inside a six-zone instrument environment. The visitor controls a single camera that travels between zones; each zone surfaces a different projection of the same World Model. The character is an instrument, not a mascot.

**Palette — FEEX Noir** (`client/landing/config/noir.ts`):
- Surfaces: `void #050505`, `graphite #0b0b0c`, `panel #141416`
- Neutrals: `silver #e8e8e6`, `ash #b8b8b4`, `smoke #6f6f6b`
- Signal: `signal #fafafa` (active/selection only), `rim #d4d4d0` (silhouette separation)
- **Forbidden:** amber, brass, gold, teal, mint, and any chromatic accent in decorative surfaces. Semantic error/success colors exist only inside lab contracts for state badges, never as decoration.

**Typography:** existing mono (`font-mono`, tracking-widest) label system; no new typefaces.

**Honesty contract (unchanged):** every visible status string reflects real component state. Simulation is labeled SIMULATED; missing evidence is UNAVAILABLE; no live agent, actuation, or persistence is implied.

## 2. Scene plan — one Canvas, six zones

The lab is a **single R3F Canvas** mounted by `HumanoidHeroScene` (Scene 01). Zone changes are camera/waypoint transitions inside that Canvas — never new mounts, never route changes.

| Zone | Purpose | Anchor content |
|---|---|---|
| Z0 THRESHOLD | Arrival, identity | Character + entry copy |
| Z1 OBSERVATION | Character close-up, morph detail | Head/shoulder rig focus |
| Z2 REPOSITORY | World Model read projection | Project/repo graph panels |
| Z3 EVIDENCE | Evidence Fabric projection | Commit-SHA ledger cards |
| Z4 INTELLIGENCE | Navigator/Omni read-only | Query trace panels |
| Z5 OPERATIONS | System health projection | Status instruments |

Navigation is a deterministic waypoint graph (`client/lib/lab/lab-zone-graph.ts`, Phase 5). Scroll/keyboard/click all resolve to the same `LabNavigationState` — no parallel state owners.

## 3. Renderer architecture

```
HumanoidHeroScene (DOM overlay + state owner)
└── HumanoidStage (single <Canvas>, frameloop-gated)
    ├── LabEnvironment      — noir blockout geometry (Phase 2)
    ├── SovereignCharacter  — rigged GLB + morph targets (Phase 4)
    ├── LabZoneSet          — per-zone instruments/hotspots
    ├── WaypointRig         — camera path + zone transitions
    └── EILProjectionSlot   — read-only EIL presentation fragment
                              (unchanged contract; accent → noir)
```

**One-Canvas rule (enforced):**
- Scene 01 owns the only landing humanoid Canvas.
- `HeroScene` (Scene 02) retains cinematic video + DOM disclosure only — **no WebGL**.
- `/world` and sovereign surfaces keep their own independent Canvas — SORL does not merge or restyle them.
- Kill switches preserved: `EIL_PROJECTION_ENABLED`, `frameloop` gating, reduced-motion `disabled` state, capability gate (`webgl/saveData/lowPower/coarsePointer`).

## 4. Phase 1 changes landed

- `client/landing/config/noir.ts` — FEEX_NOIR token module (new).
- `client/landing/config/humanoid.config.ts` — `HUMANOID_PALETTE` retokened to noir (amber `#f0b45c` removed).
- `client/landing/components/humanoid/HumanoidLighting.tsx` — key/fill/rim/ambient/hemisphere/environment/sparkles retokened from warm-amber to neutral silver/graphite.
- `client/landing/components/HumanoidHeroOverlay.tsx` — reduced from lazy-WebGL overlay to **DOM-only disclosure** (OpenJarvis adoption panel + SIMULATED badge). Mount gate simplified to `EIL_PROJECTION_ENABLED && scene visible`.
- `client/landing/components/HumanoidHeroCanvas.tsx` — **deleted** (second landing Canvas removed).
- `client/test/components/HumanoidHeroOverlay.test.tsx` — rewritten for DOM-disclosure contract.

**Deferred to Phase 5:** EIL presentation consolidation into the Scene 01 character adapter (the deleted canvas's `useEILAgentRuntime` demo cycle is intentionally not re-created yet — the lab gets a real state owner then). `humanoidHeroIntent.ts` retained for reuse by lab intents; its unit test still passes.

## 5. Boundary restatements

- World Model remains canonical/read-only; the lab **projects** it, never mutates it.
- EIL contracts (`packages/feex-eil/*`) untouched — presentation vocabulary preserved verbatim.
- No OpenJarvis connection: all OpenJarvis references remain NOT CONNECTED disclosure copy.
- `feex-sovereign-synthetic.glb` retained as rollback asset until Phase 4 ships the authored character.

## 6. Phase 1 exit checklist

- [x] Noir token module created and adopted by hero lighting/config
- [x] Second landing Canvas removed; overlay reduced to DOM disclosure
- [x] EIL contracts and kill switches preserved
- [x] Honesty copy preserved (SIMULATED / NOT CONNECTED / NO PHYSICAL ACTUATION)
- [ ] Human design approval (§18.1) — pending; does not block Phase 2 blockout
- [ ] Typecheck + unit tests green — verified below
