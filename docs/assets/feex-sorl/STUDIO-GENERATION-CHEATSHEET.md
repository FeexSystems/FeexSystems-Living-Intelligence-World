# FEEX-SORL — Tripo Studio Manual Generation Cheat Sheet

> **Why manual:** Studio credits (200) cannot be spent via API/CLI — separate pools.
> This sheet drives the same 13-job plan through studio.tripo3d.ai web UI.
> **Phase 1 = geometry only** (no texture add-on). Review, then Phase 2 = texture selectively.

## Studio settings (every job)

| Setting | Value |
|---|---|
| Model | **H3.1** (HD Generate — NOT Smart Mesh/P2) |
| Texture | **OFF** for Phase 1 |
| PBR / HD texture / Ultra / Parts / Quad | **OFF** |
| Face limit | default/adaptive |
| Output | download **GLB** |

## Phase 1 jobs (13)

Estimated Phase-1 cost: ~195–325 studio credits depending on current Generate pricing — check the credit cost shown on the Generate button BEFORE clicking. If it exceeds remaining balance, skip to next job and resume later.

## Job 0 — FEEX character (HERO — do this first)

- Save as `public/models/feex-sorl/character/feex-character-tripo.glb`
- Purpose: visual reference + candidate interim rigged character (auto-rig later ~20cr). NOT the final MetaHuman — no facial morph targets from Tripo.
- Prompt:

> young adult Black African male character, realistic human anatomy, rich dark-brown skin, neck-length dreadlocks, fitted graphite-black technical jacket with dark titanium armor panels, obsidian and silver accents, calm neutral expression, T-pose with arms slightly out for rigging, full body head to toe, photorealistic PBR product render, obsidian black #050505 and dark titanium #262626 palette, brushed titanium and matte graphite materials, smoked glass accents, restrained white emissive strips, no gold, no brass, no amber, no cyan, no green, no cartoon style, clean quad-dominant topology suitable for web GLB, centered origin, floor-contact base

- After download: DO NOT wire into the scene yet — it's a candidate. Devin validates and we decide interim-swap vs reference-only.

### 1. sorl-cmd-console — Sovereign command console
- Zone: `command-centre` → save as `public/models/feex-sorl/command-centre/sorl-cmd-console.glb`
- Prompt:

> futuristic sovereign command console desk, wide curved workstation with three vertical evidence display screens, black anodized aluminum frame, dark titanium surface, thin white emissive edge lighting, photorealistic PBR product render, obsidian black #050505 and dark titanium #262626 palette, brushed titanium and matte graphite materials, smoked glass accents, restrained white emissive strips, no gold, no brass, no amber, no cyan, no green, no cartoon style, clean quad-dominant topology suitable for web GLB, centered origin, floor-contact base

### 2. sorl-evidence-wall — Large evidence/intelligence display wall
- Zone: `command-centre` → save as `public/models/feex-sorl/command-centre/sorl-evidence-wall.glb`
- Prompt:

> large modular evidence display wall unit, five segmented dark glass panels in black titanium frame with faint white data glow, architectural museum-grade installation, photorealistic PBR product render, obsidian black #050505 and dark titanium #262626 palette, brushed titanium and matte graphite materials, smoked glass accents, restrained white emissive strips, no gold, no brass, no amber, no cyan, no green, no cartoon style, clean quad-dominant topology suitable for web GLB, centered origin, floor-contact base

### 3. sorl-workstation — Research workstation desk + chair
- Zone: `command-centre` → save as `public/models/feex-sorl/command-centre/sorl-workstation.glb`
- Prompt:

> compact research workstation desk, single monitor on articulated arm, keyboard, small status display, black graphite and dark titanium, minimalist laboratory furniture, photorealistic PBR product render, obsidian black #050505 and dark titanium #262626 palette, brushed titanium and matte graphite materials, smoked glass accents, restrained white emissive strips, no gold, no brass, no amber, no cyan, no green, no cartoon style, clean quad-dominant topology suitable for web GLB, centered origin, floor-contact base

### 4. sorl-humanoid-platform — Humanoid examination/calibration platform
- Zone: `humanoid-bay` → save as `public/models/feex-sorl/humanoid-bay/sorl-humanoid-platform.glb`
- Prompt:

> humanoid examination platform, low circular turntable dais with brushed titanium ring and white emissive trim, calibration anchor points, photorealistic PBR product render, obsidian black #050505 and dark titanium #262626 palette, brushed titanium and matte graphite materials, smoked glass accents, restrained white emissive strips, no gold, no brass, no amber, no cyan, no green, no cartoon style, clean quad-dominant topology suitable for web GLB, centered origin, floor-contact base

### 5. sorl-calibration-rig — Calibration arch/gantry equipment
- Zone: `humanoid-bay` → save as `public/models/feex-sorl/humanoid-bay/sorl-calibration-rig.glb`
- Prompt:

> humanoid calibration rig frame, vertical sensor gantry arch with multiple scanning heads and articulated measurement arms, dark steel and graphite, photorealistic PBR product render, obsidian black #050505 and dark titanium #262626 palette, brushed titanium and matte graphite materials, smoked glass accents, restrained white emissive strips, no gold, no brass, no amber, no cyan, no green, no cartoon style, clean quad-dominant topology suitable for web GLB, centered origin, floor-contact base

### 6. sorl-robotic-arm — Robotic arm workstation (simulation-marked)
- Zone: `robotics-sim` → save as `public/models/feex-sorl/robotics-sim/sorl-robotic-arm.glb`
- Prompt:

> industrial robotic arm, six-axis articulated manipulator, matte graphite links with dark titanium joints, cable-managed, simulation display tag, photorealistic PBR product render, obsidian black #050505 and dark titanium #262626 palette, brushed titanium and matte graphite materials, smoked glass accents, restrained white emissive strips, no gold, no brass, no amber, no cyan, no green, no cartoon style, clean quad-dominant topology suitable for web GLB, centered origin, floor-contact base

### 7. sorl-sim-platform — Simulation testing platform + safety barrier
- Zone: `robotics-sim` → save as `public/models/feex-sorl/robotics-sim/sorl-sim-platform.glb`
- Prompt:

> robotics simulation testing platform, circular floor pad with white emissive ring markings, low safety railing segments, anchor posts, photorealistic PBR product render, obsidian black #050505 and dark titanium #262626 palette, brushed titanium and matte graphite materials, smoked glass accents, restrained white emissive strips, no gold, no brass, no amber, no cyan, no green, no cartoon style, clean quad-dominant topology suitable for web GLB, centered origin, floor-contact base

### 8. sorl-server-rack — Server rack / AI compute cabinet
- Zone: `ai-research` → save as `public/models/feex-sorl/ai-research/sorl-server-rack.glb`
- Prompt:

> AI server rack cabinet, tall black enclosure with vertical ventilation slats, tiny white status LEDs, brushed titanium doors, photorealistic PBR product render, obsidian black #050505 and dark titanium #262626 palette, brushed titanium and matte graphite materials, smoked glass accents, restrained white emissive strips, no gold, no brass, no amber, no cyan, no green, no cartoon style, clean quad-dominant topology suitable for web GLB, centered origin, floor-contact base

### 9. sorl-lab-bench — Materials analysis workstation
- Zone: `bio-research` → save as `public/models/feex-sorl/bio-research/sorl-lab-bench.glb`
- Prompt:

> scientific laboratory workbench, white-dark stone countertop on black steel frame, integrated sink and instrument shelf, photorealistic PBR product render, obsidian black #050505 and dark titanium #262626 palette, brushed titanium and matte graphite materials, smoked glass accents, restrained white emissive strips, no gold, no brass, no amber, no cyan, no green, no cartoon style, clean quad-dominant topology suitable for web GLB, centered origin, floor-contact base

### 10. sorl-lab-instrument — Laboratory examination instrument
- Zone: `bio-research` → save as `public/models/feex-sorl/bio-research/sorl-lab-instrument.glb`
- Prompt:

> laboratory examination instrument, precision microscope-like device with articulated arm and small display, white and graphite body, photorealistic PBR product render, obsidian black #050505 and dark titanium #262626 palette, brushed titanium and matte graphite materials, smoked glass accents, restrained white emissive strips, no gold, no brass, no amber, no cyan, no green, no cartoon style, clean quad-dominant topology suitable for web GLB, centered origin, floor-contact base

### 11. sorl-sample-storage — Sample storage cabinet
- Zone: `bio-research` → save as `public/models/feex-sorl/bio-research/sorl-sample-storage.glb`
- Prompt:

> laboratory sample storage cabinet, tall refrigerated unit with glass-door compartments and digital temperature display, photorealistic PBR product render, obsidian black #050505 and dark titanium #262626 palette, brushed titanium and matte graphite materials, smoked glass accents, restrained white emissive strips, no gold, no brass, no amber, no cyan, no green, no cartoon style, clean quad-dominant topology suitable for web GLB, centered origin, floor-contact base

### 12. sorl-fab-bench — Precision engineering workbench
- Zone: `engineering-workshop` → save as `public/models/feex-sorl/engineering-workshop/sorl-fab-bench.glb`
- Prompt:

> precision engineering workbench, heavy steel table with vise, tool rail, and small CNC milling attachment, dark titanium and graphite, photorealistic PBR product render, obsidian black #050505 and dark titanium #262626 palette, brushed titanium and matte graphite materials, smoked glass accents, restrained white emissive strips, no gold, no brass, no amber, no cyan, no green, no cartoon style, clean quad-dominant topology suitable for web GLB, centered origin, floor-contact base

### 13. sorl-observation-deck — Observation gallery platform + evidence displays
- Zone: `observation-gallery` → save as `public/models/feex-sorl/observation-gallery/sorl-observation-deck.glb`
- Prompt:

> architectural observation gallery deck section, wide balcony platform with glass railing and back-wall evidence display panels, overlooking a dark laboratory below, photorealistic PBR product render, obsidian black #050505 and dark titanium #262626 palette, brushed titanium and matte graphite materials, smoked glass accents, restrained white emissive strips, no gold, no brass, no amber, no cyan, no green, no cartoon style, clean quad-dominant topology suitable for web GLB, centered origin, floor-contact base

## After download

Drop each GLB into `public/models/feex-sorl/<zone>/<asset-id>.glb` (create dirs as needed). Then tell Devin — Gate 5 validation (GLB parse, dims, provenance) runs on the files.

## Phase 2 (only on approved geometry)

Re-open each kept model in Studio → Texture Gen (+10cr, +5cr PBR optional). Budget ~130–195cr — will exceed the free 200, so texture only hero assets first (command console, evidence wall, humanoid platform, robotic arm, observation deck ≈ 50–75cr).

## Reuse assets (no generation needed)

- `sorl-diagnostic-console` → reuse `sorl-workstation`
- `sorl-net-cabinet` → reuse `sorl-server-rack`
- `sorl-component-rack` → reuse `sorl-fab-bench`
