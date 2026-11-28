# FEEX — 3D Prompt Intelligence Mining

**Date:** 2026-11-29
**Sources mined:**
- `TripoGrowthLab/awesome-3d-prompts` — 502 catalog entries (catalog.en.1–10.md), cloned to `F:/tmp-devin/awesome-3d-prompts`
- `TripoGrowthLab/awesome-astra-prompts` — 104 catalog entries (catalog.en.md), cloned to `F:/tmp-devin/awesome-astra-prompts`
- Official Tripo Studio MCP skill docs — `F:/tmp-devin/Tripo-Studio-MCP/skills/tripo-studio-mcp/references/credit-rules.md`

**Scope:** FeexSystems-wide — landing cinematic, World Model spatial galaxy, Evidence Fabric, Navigator/Omni, Sovereign lab, dashboards, brand assets, and the Tripo→Blender character pipeline. Not limited to the SORL character.

---

## 1. What these repos actually are (read this first)

Both repos are **prompt showcases**, not prompt libraries. Important distinction:

- Each catalog entry is a *build brief* — the instruction a user gave an AI coding agent (GPT-6 Astra, Claude Opus/Fable, Kimi) to produce a Three.js scene, Blender build, or single-file demo. Most are 1–3 sentences; a few are full spec documents (e.g., Orbit Lab, Monster Block, screw-orbit sim).
- The `tripo3d.ai/3d-prompts/<slug>` link on each entry opens a detail page with the **full prompt text and live preview**. Slugs are stable and fetchable — treat them as our reference library.
- These are **not Tripo text-to-model prompts**. Feeding them verbatim into `tripo_text_to_model` will not work — they describe whole interactive applications. They ARE directly usable as briefs for our own Three.js/R3F scene work and as style-direction for Tripo generation when rewritten as object descriptions.

**Value for FEEX:** proven, peer-verified creative directions with working demos — a shortcut past "what should the World Model galaxy look like" exploration.

---

## 2. Cross-cutting craft patterns (apply everywhere)

Patterns that recur across high-quality entries — bake these into our scene briefs:

| Pattern | Evidence | FEEX application |
|---|---|---|
| **"Depth-aware particles, luminous dust, adaptive performance"** | galaxy launch hero (en.7:918) | World Model starfield + landing hero — matches our `dpr={[1,2]}` + procedural-fallback rules in AGENTS.md |
| **"Preserve text readability / restrained typography space"** | galaxy homepage (en.7:898) | Every cinematic scene must reserve negative space for HUD/copy |
| **"Loop: last frame = first frame"** | AI orb spec (en.1:1483) | All ambient background loops must be seamless — FeexSystems backgrounds loop forever |
| **"Exploded view with labeled components, staged separation"** | NVL72 rack (en.6:1312 area / en.8:787) | Evidence Fabric ledger → "exploded" repo→artifact→commit visualization |
| **"One continuous cinematic motion, not static sections"** | Lealand Tea (astra:1092) | Scrollytelling must be one camera move, not section jumps |
| **"Procedural geometry only, no external assets"** | workstation room (en.10) | Our zero-asset fallback scenes; also SORL prop placeholders |
| **"Seeded RNG for reproducible starfields"** | Orbit Lab (en.2:1219) | Deterministic World Model layouts — same graph → same galaxy every load |
| **"Click body → info panel" selection model** | Orbit Lab, Titan exhibit | Already our `/world` inspector pattern — validated |
| **Delta-time animation + pause/speed controls** | Orbit Lab, rendezvous sim | Lab camera + telemetry loops should be pauseable |
| **"Honest labels, no implied compatibility"** | Tripo expression variants (en.5:792) | Same honesty contract as our manifest — names must match reality |

---

## 3. Category map → FEEX surfaces

### 3.1 World Model spatial galaxy (`/world`, landing Scene transitions)

The core FEEX visual identity is "engineering topology as space." These entries prove the approaches:

| Pick | Source | Essence | FEEX use |
|---|---|---|---|
| **Galaxy from real orbital physics** | en.3:773 — [prompt](https://www.tripo3d.ai/3d-prompts/gpt-6-astra-2101055500599054437) | "a galaxy from real orbital physics, 320,000 stars, one flight through it" | World Model = real graph topology rendered as galaxy; flight-through = navigator camera move |
| **Interactive Three.js galaxy homepage** | en.7:898 — [prompt](https://www.tripo3d.ai/3d-prompts/interactive-three-js-galaxy-homepage-2095806515579879457) | Particles form a subtle silhouette; scroll+pointer response; readability + weak-device fallback | Direct template for landing hero galaxy — particle count should encode real entity counts |
| **Real-time WebGL galaxy launch hero** | en.7:918 — [prompt](https://www.tripo3d.ai/3d-prompts/real-time-webgl-galaxy-launch-hero-2095805694603673631) | Depth-aware particles, luminous dust, smooth pointer, adaptive perf | Performance contract wording — adopt verbatim for our perf budget |
| **Living universe in one HTML file** | en.9:325 — [prompt](https://www.tripo3d.ai/3d-prompts/living-universe-in-one-html-file-2095054116372508955) · [demo](https://genesis-demo.tinyfrontier.xyz/) | Ambitious minimal brief → rich generative universe | Proof that terse briefs + strong model = whole systems; good for rapid scene prototyping |
| **Interactive dual-ring energy core** | en.5:754 — [prompt](https://www.tripo3d.ai/3d-prompts/interactive-dual-ring-energy-core-2096551010089263181) | Blender energy core → Three.js viewer w/ orbit+pulse controls | Omni-command "core" visual — a FEEX sovereign core asset candidate |
| **3D Screw-Orbit solar sim** | astra:2201 — [prompt](https://www.tripo3d.ai/3d-prompts/solar-system-3d-screw-orbit-simulation) | Extremely detailed HUD spec: helical trails, waveform monitor, bilingual labels, 16:9 dark layout | Best-in-catalog example of **specifying a data-dense HUD** — model for our Sovereign Engine HUD briefs |
| **Voxel Codex** | en.2:955 — [prompt](https://www.tripo3d.ai/3d-prompts/gpt-6-astra-2102956340482289944) | "make yourself in threejs using voxels, everything from scratch" | Stylized fallback for World Model if PBR galaxy perf fails — voxel aesthetic is distinctive and cheap |
| **Living voxel medieval kingdom** | en.9:721 | Procedural voxel world w/ NPC life | Alternate art direction study |

### 3.2 Landing cinematic & scrollytelling (`/` scenes 01–07)

| Pick | Source | Essence | FEEX use |
|---|---|---|---|
| **Scroll-Driven 3D Website (Lealand Tea)** | astra:1092 — [prompt](https://www.tripo3d.ai/3d-prompts/lealand-tea-scroll-driven-3d-website) | One continuous camera dive through a product story; "not separate static sections" | THE reference brief for our scrollytelling — rewrite with FEEX narrative (evidence → intelligence → sovereign) |
| **Bioluminescent deep-sea landing page** | en.6:364 | Three.js water FX + dark glass UI + scroll motion | Noir aesthetic precedent — validates our dark-glass + emissive-signal lab language |
| **Scroll-driven 3D studio website** | en.6:484 | Reference image → Three.js scene; camera+type+section transitions coordinated | Method: design frames first, then brief the scene around them |
| **The Last Train cyberpunk megacity** | en.2:1266 | Complete Blender megacity: hero train, procedural arch, rain, volumetrics, multi-cam sequence | Scale reference for "living world" scenes; Blender-side cinematic pipeline |
| **Starry Night streets you can stroll** | en.7:938 | Six paintings → one explorable town via portals, coherent scale | Concept for FEEX "worlds" — multiple branded environments as portals (Living Intelligence World!) |
| **Totality Engine: Cinematic Eclipse Cathedral** | en.5:316 | Single-subject cinematic setpiece | Beat-sheet model for our 7-scene arc climaxes |

### 3.3 Evidence Fabric & data visualization (`/evidence`, `/navigator`, dashboards)

| Pick | Source | Essence | FEEX use |
|---|---|---|---|
| **Exploding AI server rack (NVL72/GB300)** | en.8:787 — [prompt](https://www.tripo3d.ai/3d-prompts/) | Labeled components, staged separation, technical lighting, smooth camera transitions | Evidence ledger → "explode" a repo into commits/artifacts/workflows; staged separation = evidence depth drill-down |
| **Exploded interactive human anatomy** | en.6:744 | Body → individually inspectable systems | Same interaction grammar for project→service→artifact hierarchies |
| **Tesla Model X exploded view** | en.7:332 | Pull-apart assemblies, inspect + reassemble | Product-page treatment for platform architecture |
| **Interactive Smartphone Exploded View** | en.5:154 | Slider-driven explode, click-to-isolate + explain each part | Closest UX spec — per-component explanations map to evidence cards |
| **Exploded desktop-computer atlas** | en.5:416 | 29 components, animated disassembly + explanations | Scale target: our ecosystem has more entities than 29 |
| **55-second data center-to-atom scene** | en.1:1420 — [prompt](https://www.tripo3d.ai/3d-prompts/) | Camera flies DC→rack→GPU→chip→transistors→atom; scale rail in meters; labels in client's language; single-file browser | **Signature FEEX shot** — "from ecosystem to commit SHA" zoom narrative; scale rail = our evidence granularity story |
| **Interactive globe dashboard** | en.6:1312 | Three.js globe dashboard w/ day/night, readable geo data, functional controls | Dashboard viz reference for global ecosystem view |
| **Schematic PDF → PCB → 3D** | en.6:1332 | Doc→CAD→render pipeline | Evidence ingestion metaphor — documents becoming spatial artifacts |
| **Interactive Titan science exhibit** | en.7:470 | Educational sim + information layer for physical features | `/evidence` exhibit pattern — artifact + explanation layer |
| **Interactive educational jet engine** | astra:1260 | "Build an interactive educational 3D jet engine in the browser" (minimal brief → rich result) | Pattern for `/navigator` explainer artifacts |
| **Gaming mouse explainer** | astra:2181 | "show me how X works, from hand to computer" | Navigator query → interactive causal-chain explainer |
| **Orbit Lab spec** | en.2:1219 — [prompt](https://www.tripo3d.ai/3d-prompts/) | Full engineering spec: seeded starfield, delta-time, selection→info panel, keyboard+mobile, pixel-ratio cap, WebGL fallback msg, README+verification report | **Best-written spec in the corpus** — steal its requirements structure for our scene contracts |

### 3.4 Character & rig pipeline (SORL + future avatars)

Directly applicable to `feex-character-*` work:

| Pick | Source | Essence | FEEX use |
|---|---|---|---|
| **Texture and rig a Tripo character** | en.5:596 | "Take a Tripo Smart Mesh character into Blender. Apply textures, build usable body rig, then facial expressions" | Validates our exact pipeline order: Smart Mesh → texture → body rig → expressions (morphs last) |
| **Switchable character expressions in Blender** | en.5:792 | Expression variants aligned, inactive ones shrunk inside head; "do not imply smooth blending or VRM compatibility" | Alternative to shape-key morphs: discrete expression meshes — honest, cheap; good fallback if ARKit shape keys underdeliver |
| **Automatic character rig and kung fu moves** | en.6:1003 | Rig + walk/run/moves; "inspect for broken joints and unstable poses" | QA checklist for our retargeted clips |
| **Hair and Face Texture Generation + UV Transfer** | en.4:2164 | Flat-shaded hairless face render → texture gen → parallel-projection UV transfer | Technique for skinning Tripo faces: render flat → generate texture → UV-project back |
| **Textured 3D asset production workflow** | en.9:741 | Reference image → clean asset → fix normals/materials in Blender → Substance Painter textures | Our Phase-2 texturing fallback path formalized |
| **Assemble and animate generated 3D assets** | en.5:952 | "Generate optimized assets with Tripo P2, assemble in Blender, rig+animate, review spatial fit" | Multi-asset scene assembly playbook — same as our 13-prop lab |
| **Create animated environment + character from reference images** | en.3:1524 | Reference images → character+environment | Image-to-3D path if text prompts plateau |
| **2D logo → animated character** | en.5:674 | Logo becomes animated character | Brand-mark → mascot pipeline option for FEEX avatar |

### 3.5 Product reveal, brand & motion (`/navigator` hero, marketing)

| Pick | Source | Essence | FEEX use |
|---|---|---|---|
| **Cinematic 3D ORBIT smartwatch reveal** | astra:1240 | "12s cinematic 3D product reveal film" | Template length/structure for platform reveal videos |
| **30-second branded motion graphics** | en.1:914 | Branded 3D motion piece | Brand film pacing reference |
| **Kiiwi 30s motion-graphics promo** | en.1:1438 | Dynamic promo | Same |
| **Polished 15-second motion-design showreel** | en.1:1793 | Showreel structure | Demo reel assembly |
| **Photoreal 3D product mockup studio** | en.8:405 | Product mockup stage | Dashboard/app screenshot → 3D device mockups for marketing |
| **Transforming car → humanoid robot (x-ray + exploded)** | en.1:1026 / astra:287 | Mode-switching product viz | Platform "transformation" narrative — SaaS ↔ sovereign engine |

### 3.6 AI orb / Omni-command presence

| Pick | Source | Essence | FEEX use |
|---|---|---|---|
| **AI orb UI motion spec** | en.1:1483 — [prompt](https://www.tripo3d.ai/3d-prompts/) | The most technically dense spec in the corpus: GLSL fluid orb, morphing shape states, beat-locked 120BPM, closed-form springs, seamless loop, Playwright frame verification, ffmpeg pipe | Direct reference for an **Omni-command presence orb** — and its verification methodology (pixel-diff loop check, beat offset <10ms) is adoptable for our media QA |

### 3.7 Advanced capture & spatial UI

| Pick | Source | Essence | FEEX use |
|---|---|---|---|
| **Photoshop for Gaussian Splats** | astra:1411 | Interactive splat editor request | Watch this space — splats could be our "photogrammetry world model" ingest format |
| **3D Views in 2D UI with Nested UI** | astra:3339 | 3D content in 2D UI + 2D UI inside 3D space, IME/keyboard focus, interactive glTF extensions | Exactly our `/world` + inspector overlay problem — validates nested-UI-in-canvas approach |
| **Interactive 3D camera lens light-path demo** | en.1 (post-1483) | "how light travels through a lens to sensor" explainer | Educational-explainer format for technical deep-dives |
| **Mech robot blueprint prompt set** | en.10:119 | Multi-turn agent-driven mechanical design with real math/physics constraints | Prompting pattern for complex multi-system generation — relevant to our agentic pipelines |

---

## 4. Adapted FEEX prompt fragments (ready to use)

### 4.1 Tripo text-to-model briefs (for `tripo_text_to_model`, geometry-only)

Rewrite pattern from catalog: *named materials + palette + construction + display context*. Examples for future props:

```
Sovereign evidence monolith: a tall brushed-black monolith slab (2.4m) with a recessed
emissive data layer, anodized aluminum frame edges, quarter-turn fasteners visible,
 matte graphite powder-coat, thin cyan status strip along the left edge. Museum-display
pedestal base, studio product photography, three-quarter view, pure dark background.
Single object, clean quad-dominant topology, no text, no logos.
```

```
Sovereign command console: wide angular desk console, dark smoked glass top surface,
two tiered control decks with recessed touch strips, anodized aluminum chassis,
visible cable raceways underneath, matte black polymer panels. Product visualization,
three-quarter view, dark studio background. Single object, clean topology.
```

### 4.2 Scene briefs (for our Three.js/R3F work or coding agents)

Steal Orbit Lab's requirement structure — it is the best spec in the corpus:

```
Build "FEEX World Model" as a real-time Three.js galaxy:
1. Nodes = canonical World Model entities (PROJECT/REPOSITORY/ARTIFACT/TECHNOLOGY),
   positioned by seeded-RNG layout so identical graph → identical galaxy.
2. Edges = typed relationships, rendered as curved luminous links with evidence-count
   thickness. Node size ∝ artifact count. Color reserved for entity type only.
3. Camera: slow orbital drift + pointer parallax + scroll-driven dive toward selection.
   Preserve typography space: HUD occupies right 30%, canvas must not render behind it.
4. Selection: click node → inspector panel with evidence ledger; ESC/deselect returns.
5. Performance: dpr clamp [1,2], instanced particles, adaptive quality on weak devices,
   procedural fallback when WebGL unavailable — label it, never fake it.
6. Loop: any ambient motion must be seamless (last frame = first frame).
```

```
Scrollytelling scene brief (pattern: Lealand Tea):
"One continuous camera move through three acts — Evidence (macro: commit SHA grain),
Intelligence (meso: graph constellation forming), Sovereign (pull-back: the whole
living world). No cuts, no section breaks; typography fades in negative space only."
```

### 4.3 Character pipeline (next iteration, after credits)

From en.5:596 + en.5:792 — the community-validated order:

```
1. tripo_text_to_model: Smart Mesh P1 (35cr) — quad topology survives skinning
2. tripo_texture_model or bake in Blender (PBR pass, ~5cr)
3. tripo_rig_model biped/mixamo (20cr)
4. tripo_retarget_model — FREE motion library clips
5. Blender: expression variants as discrete meshes OR ARKit shape keys (our current path)
6. Contract authoring for any missing clips/morphs → verify-feex-humanoid-clips.mjs
```

---

## 5. Gaps & honest limitations

- **No Tripo T2M prompt corpus exists in these repos.** All 606 entries are app/scene build briefs. For actual text-to-3D prompts, the detail pages occasionally include them, but the catalog itself is scene-direction material.
- **Quality varies.** Many entries are 1-sentence briefs that produced impressive results — the *model* did the work. Treat entries as proof-of-possibility + direction, not as specs to copy verbatim.
- **License:** prompts are community-contributed; outputs' rights depend on the generator used (Tripo vs Claude vs GPT). Check `RIGHTS.md` before commercial reuse of any specific output.
- **Not yet mined:** non-EN catalogs (de/es/fr/ja/ko/pt/ru/tr/it) — same entries translated; the zh-CN README has additional context. `outputs/` dir in 3d-prompts may contain rendered results worth browsing visually.

## 6. Recommended next actions

1. **Scene 01 hero:** adapt the galaxy-homepage brief (§3.1) — it's the closest proven match to our World Model landing.
2. **Evidence page:** prototype the exploded-view drill-down (§3.3) on one real repo's artifact graph.
3. **Omni orb:** the AI-orb spec (§3.6) is a masterclass — worth a dedicated design doc if we build a presence indicator.
4. **Character:** wait for Studio credits, then follow §4.3 order exactly — it's the community-validated pipeline.
5. **Bookmark the slug URLs** — each `tripo3d.ai/3d-prompts/<slug>` page has the full untruncated prompt + live demo.
