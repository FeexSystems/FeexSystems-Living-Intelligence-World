# FEEX-SYNTHETIC-ACCEPTANCE-REPORT

Plan: FEEX-SOVEREIGN-SYNTHETIC-IMPLEMENTATION-PLAN v2.1.0 — Phase 6 (acceptance
evidence). No merge/release authorized by this report.

## Executed checks

| Check | Result |
|---|---|
| `npm run typecheck` | PASS (tsconfig.landing + tsconfig.effects) |
| `npx vitest run client/test/landing/LandingComposition.test.tsx` | PASS — 13/13 |
| `npm run build` (client + server) | PASS (pre-existing chunking/PostCSS warnings only) |
| Playwright `e2e/humanoid-hero.spec.ts` (Chromium, serial) | PASS — 5/5 |
| GLB loads in real landing hero | PASS — GREET enables on `onLoaded`; model renders |
| Scene order (humanoid → cinematic) | PASS — DOM order + `.snap-y > section` ids asserted |
| Interaction (GREET→Acknowledge, EXPLAIN→Explain) | PASS — state labels + visible arm-raise pose diff |
| Pointer gaze on `Head` bone | PASS — existing additive gaze path unchanged |
| Glyph pulse | PASS — `GlyphAccent` emissiveIntensity driven in `useFrame`, ~0.35 Hz, boosted on one-shots, dimmed when disabled |
| Reduced motion | PASS — `clip=null` → static frame via `InvalidateOnReady`; controls disabled |
| Kill switch / capability gates | PRESERVED — no EIL boundary code touched |
| SIMULATED / NO PHYSICAL ACTUATION | PRESERVED — status strip + inspector unchanged |
| Mobile 390×844 | PASS — character center-frame, head/visor visible, `scrollWidth == clientWidth` (no overflow) |
| Desktop 1600×900 | PASS — full-body figure, warm amber rim + glyph visible |

## Screenshot evidence (this session)

- `synthetic-hero-3.png` — idle, lit figure with glowing amber visor band
- `synthetic-greet2.png` — Acknowledge arm-raise mid-clip
- `synthetic-mobile.png` — 390×844 composition
- `scripts/authoring/render-check.png` — Blender Cycles sanity render

## Acceptance-table mapping (plan §12)

| Requirement | Status |
|---|---|
| Stylized, clearly synthetic, non-photoreal | PASS — geometric masked form, no skin/face realism |
| FEEX pattern/silhouette language | PASS — brass inlay bands, obsidian/graphite, glyph visor |
| Complete stylized body | PASS — head, torso, arms, hands, legs, feet all present |
| Head/glyph presence system | PASS — emissive amber visor, pulse + state boost |
| Honeycomb at joints | PASS — forearm + shin lattice panels (alpha texture) |
| Warm restrained lighting | PASS — warm-white key, amber rim/env, no clinical white |
| Idle sway + glyph pulse | PASS |
| State mapping only via local deterministic hook | PASS — `useHumanoidState` unchanged; no invented agent state |
| GLB in actual landing scene | PASS |
| Desktop/mobile screenshots | PASS (above) |
| Kill switch / reduced motion / disclosures | PASS (preserved) |
| Performance measurements | PASS — 201 KB GLB, ~1.1k tris, 4 clips |
| Provenance | PASS — `FEEX-SYNTHETIC-ASSET-PROVENANCE.md` |

## Outstanding defects / deferred gates

- **Gate A final visual approval** — pending human review of screenshots.
- **Gate C visual approval** — pending human review of composition.
- Phase 5 (visual refinement) — NOT authorized; not started.
- Honeycomb texture is procedural alpha, not scanned geometry (documented).
- Playwright suite requires `--workers=1` on this machine (parallel WebGL
  contexts cause teardown timeouts — environmental, assertions unaffected).
- `.blend` artifact is generated next to the GLB path by the script; moved to
  `scripts/authoring/` manually after each run.
