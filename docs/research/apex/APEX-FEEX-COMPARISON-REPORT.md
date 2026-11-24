# APEX–FEEX Comparison Report — Gate 1 Evidence Artifact

**Task:** T-0003 · **Agent:** A3 · **Reviewer:** A1 · **Date:** 2026-11-19
**Brief executed:** `docs/architecture/APEX-INVESTIGATION-BRIEF.md`
**Rule:** APEX is an evaluation reference only. No source, shaders, or assets may be copied.

---

## 0. Subject Identification

Two unrelated products named "APEX" exist. The FEEX EIL context (humanoid interface, gesture
tracking, particle rendering) matches the **commercial APEX Humanoid Interface** sold by
Ruben Mouradian / Reznikov Engineering (Israel), not the CMU/Bosch locomotion research
project (`apex-humanoid/APEX-humanoid`, Unitree G1, BSD-3-Clause).

| Candidate | Evidence | Verdict |
|-----------|----------|---------|
| apex-eng.ai "APEX Humanoid Interface" (visual UI/UX source, $99–$399 tiers) | Vendor pages + license texts fetched 2026-11-19; live demo at `apex-humanoid.vercel.app` | **Subject of this report** |
| `github.com/apex-humanoid/APEX-humanoid` (locomotion policies, Isaac Lab) | Repo metadata + README | Out of scope — robotics locomotion, not a humanoid interface |
| `ymollard/APEX` (Poppy robot exploration, GPL-3.0) | Repo metadata | Out of scope — unrelated acronym |

## 1. Claims Register (evidence-classified)

| Claim | Source | Classification | Notes |
|-------|--------|----------------|-------|
| Particle / light-figure humanoid rendering | Vendor page + live demo bundle | **Demonstrated (demo)** | Bundle contains particle system strings; visual quality not independently benchmarked |
| Hand / face / pose tracking | Demo bundle inspection | **Demonstrated (demo)** | MediaPipe `HandLandmarker` model URL + `getUserMedia` calls present |
| Gesture vocabulary | Demo bundle inspection | **Advertised** | No gesture list published; must map to FEEX first-release set |
| Local (on-device) perception | Demo bundle inspection | **Demonstrated (demo)** | MediaPipe model fetched from `storage.googleapis.com/mediapipe-models/...`; inference runs client-side (no inference API endpoints found in bundle) |
| Licensing terms | Vendor license texts (Creator/Commercial/Studio) | **Verified (published text)** | See §5 |
| Three.js based | Demo bundle inspection | **Verified** | `THREE.*` ×154 occurrences, `react-three-fiber` + `@react-three/postprocessing` strings, "Three.js" literals |
| Telemetry / remote endpoints | Demo bundle inspection | **None found** | Only external URLs: Google Fonts, jsdelivr, esm.sh, MediaPipe model CDN, react docs links |

## 2. Dependency Inventory (from live demo bundle `index-BD7VNgkM.js`, 1,108,884 bytes)

- [x] Runtime: browser SPA (React — `reactjs.org` error-decoder strings present)
- [x] Renderer: **Three.js via react-three-fiber** + postprocessing
- [x] Physics / animation runtime: procedural/particle (no physics engine strings found)
- [x] Perception stack: **MediaPipe** (`@mediapipe`, `HandLandmarker`, hand_landmarker.task model)
- [x] Asset pipeline: bundled artwork inside ZIP (per vendor); demo serves compiled bundle only
- [x] Build / packaging: Vite-style hashed assets (`/assets/index-*.js`)
- [x] License files: `LICENSES/` directory + `THIRD_PARTY_NOTICES.md` + purchaser `APEX-LICENSE.txt` promised in ZIP (not yet inspected — requires purchase)
- [x] Telemetry / remote endpoints: **none detected** in demo bundle (static CDN model fetch only)

## 3. Rendering Architecture — answers where evidence exists

1. **Three.js?** Yes — react-three-fiber on Three.js. Satisfies the brief's hard decision gate.
2. Particle budget / LOD: not determinable from minified bundle without runtime profiling.
3. Animation driver: particle-based figure with state reactions (idle/listening/thinking/speaking
   per vendor description); bone/morph-target use unconfirmed.
4. Shaders original or derived: cannot be determined without source inspection (purchase required).
5. Pre-baked proprietary geometry: cannot be determined without source.
6. Measured FPS on named hardware: **not measured** — requires authorized demo benchmarking
   per §4 protocol. No number is claimed.

## 4. Benchmark Protocol — status

**NOT EXECUTED.** No authorized demo session was run in this task. The protocol in the brief
(3× median, 60 s idle+interaction, named CPU/GPU/RAM/OS/browser, DevTools capture, reduced-motion
pass) remains open. No performance figure may be quoted until this is completed.

## 5. Licence / IP Register (published license texts, fetched 2026-11-19)

Seller: Ruben Mouradian / Reznikov Engineering, licensed dealer 317554178, Kfar Saba, Israel.
License version dated 2026-09-11.

| Tier | Price (per product) | Commercial use | Redistribution | Notes |
|------|--------------------|----------------|----------------|-------|
| Creator | $99 | **Prohibited** (no SaaS/subscription/paid product) | Prohibited | Personal/non-commercial only |
| Commercial | $199 | One commercial End Product, unlimited users, no revenue cap | Prohibited | Employees/contractors may develop |
| Studio | $399 | Multiple End Products, client work | Client delivery under Studio terms | Agency/freelancer tier |
| Enterprise/OEM | Contact | SDK distribution, OEM, white-label, redistribution | Negotiated | Required for FEEX multi-product or redistribution scenarios |

Key restrictions (Creator text; Commercial/Studio grant broader but still prohibit
redistribution of the Software itself):
- No selling, sublicensing, or publishing the Software or substantial reusable portions.
- No uploading to public repositories; no packaging as template/starter/UI kit.
- APEX name/logo/branding not licensed.
- AI coding tools may be used to modify/integrate for permitted uses.
- "As is", no warranty; liability capped per Israeli-law-governed terms.

## 6. Verdict Table

| Capability | Advertised | Demonstrated in demo | Independently verified by FEEX | Notes |
|------------|------------|----------------------|--------------------------------|-------|
| Particle humanoid | Yes | Yes (demo bundle) | Partial — stack confirmed Three.js+R3F; visuals not benchmarked | |
| Gesture recognition | Yes | Partial — hand-landmarker model loaded; gesture set unknown | No | |
| Local camera/mic processing | Yes | Yes — getUserMedia + on-device MediaPipe | Partial — no server inference endpoints in bundle | |
| Three.js foundation | n/a | Yes | **Yes** | Decision gate passed |
| Adaptive LOD | Unknown | Unknown | No | Needs profiling |
| Reduced-motion support | Unknown | Unknown | No | Needs source/demo check |
| No telemetry | n/a | Yes (no endpoints found) | Partial — minified bundle only | |

## 7. Decision (per brief §8)

```
Three.js-based?  YES (react-three-fiber) → continue licence/IP/benchmark review
├─ Redistribution rights: Commercial tier covers ONE End Product.
│   FEEX WORLD + HOLOKAI + FEEX EIL may count as multiple products → Studio ($399)
│   or Enterprise/OEM may be required. CONFIRM product boundary definition with counsel.
├─ Benchmarks: NOT RUN → Gate 1 cannot fully exit on performance evidence.
└─ Verdict: CONDITIONAL — license terms are real and published; technical stack is
   compatible (Three.js, MediaPipe, no telemetry). Purchase decision still requires
   (a) source inspection of the ZIP for shader/asset originality, and (b) the §4
   benchmark protocol on named hardware. Per brief §7, FEEX implements original
   components regardless; APEX is reference/evaluation only.
```

## 8. Open Items / Risks

- Source ZIP not inspected — shader originality, asset formats, NOTICE obligations unknown.
- Whether FEEX's product surface counts as one or multiple "End Products" is a licensing
  question that may push the required tier to Studio or Enterprise.
- Demo bundle is minified; absence of telemetry endpoints is suggestive, not proof for the
  purchased source (which may differ).
- The unrelated `apex-humanoid/APEX-humanoid` research repo must not be conflated with this
  commercial product in future reports.

## Evidence Index

- E-APEX-1: `https://apex-eng.ai/apex/humanoid/buy` — tier table + prices (fetched 2026-11-19)
- E-APEX-2: `https://apex-eng.ai/apex/humanoid/license/creator` — Creator license full text (fetched 2026-11-19)
- E-APEX-3: `https://apex-humanoid.vercel.app` + `/assets/index-BD7VNgkM.js` — bundle inspection (fetched 2026-11-19)
- E-APEX-4: `https://github.com/apex-humanoid/APEX-humanoid` — disambiguation (fetched 2026-11-19)
