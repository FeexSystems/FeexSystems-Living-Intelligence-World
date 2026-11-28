# FEEX-SORL — Phase 10 Acceptance Register & Next Actions

**Document type:** Implementation register + LLM-agent brief  
**Date:** 2026-11-27  
**Baseline audit:** FEEX-SORL Humanoid / Laboratory Audit (Live Repo, 2026-11-26)  
**Repo HEAD at audit:** `4a07b76`  
**Status:** Working baseline adopted. Physical actuation remains PROHIBITED. G6/G7 treated as frozen until explicit authorization.

This document supersedes, for decision and sequencing purposes:
- `docs/program/FEEX-SORL-PHASE9-ACCEPTANCE.md` (2026-11-24)
- `FEEX-SORL-TRIPO-GALLERY-AUDIT.md` (2026-11-25)

It does **not** claim that character quality, full clip coverage, or production promotion have been achieved.

---

## 1. Decisions Recorded (2026-11-27)

### 1.1 Character pipeline — HYBRID (selected)

| Layer | Source / tool | Role |
|-------|---------------|------|
| Anatomical / facial fidelity target | MetaHuman (anatomical realism, ARKit-compatible morph vocabulary) | Target quality bar and morph naming |
| Current authored assets | Tripo AI → Blender MCP → Mixamo retarget | Practical generation path already invested (25–26 Nov) |
| Live landing character | `public/models/.../feex-sovereign-synthetic.glb` | Active until hybrid gate is green |
| Candidate (dormant) | `feex-character-tripo.glb` | Manifest `active: false` until review + clips + morphs pass |

**Rule:**  
- New generation may continue on Tripo + Blender + Mixamo.  
- Final acceptance requires ARKit-style morph targets (12) and the required clip set (see §3).  
- MetaHuman remains the reference for facial topology, naming, and quality, not necessarily the only authoring tool.  
- No second humanoid engine. Reuse `HumanoidStage` / `EILProjectionSlot` / existing kill-switch.

**Disposition of prior “do not generate” Tripo guidance:** overridden by hybrid decision and by the engineering already present on disk.

### 1.2 Orphan media — CLEANUP AUTHORIZED

Orphaned humanoid/robotics media (~5 MB) removed from `public/media/feex/` in this PR so they stop shipping to every visitor. Assets were unreferenced by live routes (test fixtures / ingest scripts only).

### 1.3 Character quality gate — PLAN AUTHORIZED

Closing `verify-feex-humanoid-clips.mjs` is the hard remaining red gate for “Scene 01 — Humanoid”.

### 1.4 New SORL acceptance note — THIS DOCUMENT

Phase 10 register is this file. Phase 9 is historical.

### 1.5 Full unit + a11y suite

Not executable in the audit sandbox (Prisma engine egress 403). Must be run on CI or a machine with network access to `binaries.prisma.sh`.

---

## 2. Verified State at HEAD `4a07b76` (from 2026-11-26 audit)

| Gate | Result | Notes |
|------|--------|-------|
| Typecheck | Clean | Landing + effects |
| One-Canvas rule | OK | Exactly one humanoid `<Canvas>` (`HumanoidStage`) |
| Actuation honesty | OK | No unnegated physical-actuation / live-agent claims |
| Character clip/morph gate | **FAIL** (expected) | `clips=4 morphs=0 skins=1`; missing Listen, Think, Inspect, Point, Walk, Speak, Unavailable + 12 ARKit morphs |
| Manifest honesty | Strong | Null-until-verified `src`; empty `LAB_ASSET_SHA256` is intentional |
| Tripo candidate | Present, `active: false` | Correct |
| Lab furniture GLBs | 13+ generated, ground-snapped | Live under Gate-7 zones |
| Overlay disclosure | Explicit SIMULATED / NOT CONNECTED / LOCAL SIMULATION / DISABLED | Hold |

---

## 3. Character Gate Plan (Hybrid)

**Goal:** Make `node scripts/verify-feex-humanoid-clips.mjs` pass on the active humanoid GLB.

### 3.1 Required clips (minimum)

| Clip | Intent | Priority |
|------|--------|----------|
| Idle | Baseline presence | Present |
| Aware | Bounded cursor / proximity | Present |
| Acknowledge | Short acknowledgment | Present |
| Explain | Gesture while speaking content | Present |
| Listen | Listening / attention | Required |
| Think | Processing / reasoning | Required |
| Inspect | Object / evidence focus | Required |
| Point | Directed gesture | Required |
| Walk | Locomotion (bounded) | Required |
| Speak | Mouth + upper-body speaking | Required |
| Unavailable | Fallback / offline state | Required |

Current live: 4/11. Target: 11/11 (or the exact set asserted by the verify script).

### 3.2 Required morph targets

12 ARKit-style facial morphs (names must match the verifier / EIL presentation contract). Live: 0/12.

### 3.3 Hybrid execution sequence

1. Review Tripo candidate (`feex-character-tripo.glb`) — visual quality, topology, licensing, rig.
2. Author or retarget missing clips (prefer Mixamo / Blender on chosen mesh).
3. Bake / transfer ARKit morphs (MetaHuman-compatible naming).
4. Update manifest only after SHA-256 recorded and file tracked; set `active: true` only when verify is green.
5. Regression: re-run clip gate, one-canvas, actuation-honesty; extend `HumanoidLabAudit.test.tsx` if needed.
6. Keep SIMULATED / NOT CONNECTED disclosure until a later explicit gate.

**Out of scope:** physical actuation, live agent network calls, production claim of full conversational embodiment.

---

## 4. Orphan Media Cleanup (executed in this PR)

Deleted (unreferenced by live routes):

- `public/media/feex/feex-humanoid-fullbody.mp4`
- `public/media/feex/feex-humanoids.mp4`
- `public/media/feex/feex-robotics.mp4`
- `public/media/feex/feex-robotics-poster.webp`
- `public/media/feex/robotics-biomechanics.webp`

Kept (live):

- `public/media/feex/yurrhealer-lab.webp`

The cinematic component tests use test-only media URLs and do not require the removed production assets. PowerShell ingest destinations remain source asset mappings; they do not ship these orphan files to visitors. The media rename is covered by `CinematicHero.test.tsx` and `LutPipelineCanvas.test.tsx`.

---

## 5. Phase 10 Acceptance Criteria

1. Hybrid pipeline decision recorded (this document).
2. Orphan media disposition executed (delete path in this PR).
3. Character gate green **or** explicit human waiver with residual risk.
4. Manifest continues to refuse non-verified assets.
5. Actuation honesty and one-canvas gates remain green.
6. Overlay continues to disclose SIMULATED / NOT CONNECTED / no hardware control.
7. Register carries SHA anchors for any newly activated GLB.

**Does not authorize:** production promotion of “full humanoid” claims, G6 RC, G7 production, physical actuation, Firebase deploy of character quality claims beyond live gates.

---

## 6. Full Unit + Accessibility Suite

| Item | Status |
|------|--------|
| Audit sandbox | Prisma engine download blocked — cannot run full Vitest |
| Required action | Run `npm run test:unit` and a11y suite on CI / capable host |
| SORL-specific | `client/test/landing/HumanoidLabAudit.test.tsx` remains the regression suite |

---

## 7. Work Order

| Order | Work item | Status |
|-------|-----------|--------|
| A | Phase 10 register in docs/program | This PR |
| B | Orphan media delete | This PR |
| C | Character pipeline (clips + morphs) | Plan authorized; activation gated |
| D | Manifest + active flag after green gate | Evidence required |
| E | Full unit + a11y on capable runner | Measurement |
| F | G6 / production claim | Explicit separate authorization |

---

## 8. LLM Agent Instructions (Copy Block)

```text
BASELINE: FEEX-SORL Phase 10 (2026-11-27). HEAD reference 4a07b76 audit.
PIPELINE: HYBRID — Tripo/Blender/Mixamo generation allowed; MetaHuman quality bar + ARKit morph naming for acceptance.
LIVE CHARACTER: feex-sovereign-synthetic.glb (4 clips, 0 morphs) until verify-feex-humanoid-clips.mjs is green.
TRIP O CANDIDATE: feex-character-tripo.glb active:false until review + gate pass.
ORPHANS: deleted from public/media/feex/ (humanoid/robotics unreferenced media).
HONESTY: Keep null-until-verified manifest, empty-not-placeholder SHA map, actuation CI gate, SIMULATED disclosure.
FORBIDDEN: physical actuation, live hardware control, production overclaim of full clip/morph set, second humanoid Canvas/engine.
NEXT: close character gate, re-run full unit+a11y on capable host, register SHA anchors when GLBs land.
```

---

## 9. Evidence Anchors

| Artifact | SHA / path | Notes |
|----------|------------|-------|
| Audit baseline HEAD | `4a07b76` | 2026-11-26 live verification |
| Active humanoid GLB | _TBD after gate_ | |
| Tripo candidate | `public/models/feex-sorl/character/...` | active:false |
| This register | `docs/program/FEEX-SORL-PHASE10-ACCEPTANCE-AND-NEXT-ACTIONS.md` | 2026-11-27 |

**End of Phase 10 register.**  
No deployment, character activation, or actuation is authorized solely by this document.
