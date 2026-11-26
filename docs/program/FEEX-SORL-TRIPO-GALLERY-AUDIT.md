# FEEX-SORL — Tripo Gallery Audit & Character Source Assessment

**Document ID:** FEEX-SORL-TRIPO-AUDIT-001
**Date:** 2026-11-24
**Status:** DISCOVERY COMPLETE — no generation, no downloads, no asset changes made
**Implements:** FEEX CHARACTER ASSET DISCOVERY AND METAHUMAN INTEGRATION directive (Gates 0–4)

---

## Gate 0 — Gallery inventory

Source: `https://studio.tripo3d.ai/3d-model-gallery/man-with-dreadlocks`
Page advertises **151 models**; the gallery is paginated/lazy — **17 unique candidates were enumerated** from the loaded page (JSON-LD ItemList). Deep-page candidates beyond the first page were not enumerated; a fuller crawl or Tripo account search would be needed for exhaustive coverage.

All sampled model pages report the same pipeline profile: `type: image_to_model`, PBR textures, "detailed" geometry/texture quality, export formats **STL, 3MF, FBX, GLB, OBJ, USDZ**, `content_risk_level: 4`, `is_nsfw: false`. These are AI-generated static meshes — **gallery meshes are not MetaHumans and cannot be converted into one** (see Gate 2).

### Candidate inventory (visible page, ranked by name-implied suitability)

| # | Model (slug tail) | Full body? | Dreads | Skin/looks | Rigged? | Best use |
|---|---|---|---|---|---|---|
| 1 | `shirtless-deep-hair-texture-and-facial-features` | Yes (shirtless) | Yes | Facial features called out; skin tone unverified | Unrigged (verified) | **Top reference** — body, face, hair in one |
| 2 | `male-character-sheet-...-black-outfit-multiple-poses` | Sheet (turnaround + poses) | Yes | Unverified | Unverified | **Reference board** — front/side/back, pose set |
| 3 | `long-dreadlocks-wearing-graphic-shirt` | Yes | Long (past neck?) | Unverified | **Rigged by Tripo** (verified `is_rigged_by_tripo:true`) | Prototype/placeholder candidate |
| 4 | `bare-chest-medium-skin-tone-facial-hair` | Partial (bare chest) | Yes | "Medium" skin — possibly lighter than spec | Unrigged | Skin-tone check needed |
| 5 | `black-puffer-vest-chains-tattoos` | Yes | Yes | "Stylized" in title — less realistic | **Rigged by Tripo** | Secondary; stylization risk |
| 6 | `black-t-shirt-and-gray-pants-bracelets` | Yes | Yes | Clothed | Unrigged | Wardrobe/pose reference |
| 7 | `head-and-shoulder-portrait-...-brown-skin` | Bust only | Yes | "Brown skin", young man | Unverified | **Face/head reference** only |
| 8 | `torso-up-portrait-...-white-shirt` | Torso only | Yes | Unverified | Unverified | Head/shoulders reference |
| 9–17 | Portraits, bikini top,athlete jersey, sweater+chain, olive sweater, king-von portrait, caricature/stylized figures, red dreamer jersey | Mostly partial or heavily clothed/stylized | Yes | Varied | Mostly unverified | Reference pool only |

**Verified per-model (sampled 7 pages):** textured=true, HD-textured=true, PBR=true (5/7 literal-verified; 2 ambiguous due to Nuxt index compression — flagged, not claimed), content_risk_level=4, nsfw=false, formats include FBX+GLB (Blender/UE-importable in principle), `is_rigged_by_tripo` true on 2/7 sampled.

**NOT verified (do not assume):** polygon counts (not exposed on pages), exact skin tone, dreadlock length vs neck-length spec, blendshape/Facial ARKit targets (none indicated — Tripo does not produce ARKit morphs), animation libraries (only Tripo auto-rig, no clip library), download terms (gallery download flow requires Tripo account; terms not audited), UE/Blender import success (FBX/GLB export exists but untested).

## Gate 1 — Suitability vs target spec

Target: young adult Black African male · rich dark-brown skin · **neck-length** dreadlocks · realistic anatomy · natural face · graphite/titanium/obsidian cybernetic wardrobe.

| Candidate | Verdict |
|---|---|
| #1 shirtless + facial features | **Best overall reference** — closest to spec on body+face+hair; classify REFERENCE/PROTOTYPE (unrigged, AI-mesh topology, no morphs) |
| #2 character sheet | **Best turnaround reference** — multiple poses, black outfit near our palette direction |
| #3 long-dreadlocks (rigged) | **Best placeholder/prototype** — only rigged full-body candidate sampled; dreads may exceed neck-length (verify visually) |
| #7 head/shoulders brown-skin | **Face reference** for likeness pass |
| #4 bare-chest medium-skin | Skin tone likely too light — deprioritize |
| #5 puffer vest | Stylized tag — deprioritize for realism |
| Rest | Reference pool; none meet spec as final character |

**No gallery candidate is production-ready as the final character** — all lack facial blendshapes, contract clip set, and MetaHuman topology. Per directive, they are classified reference/prototype, not final assets.

## Gate 2 — MetaHuman compatibility assessment

- Tripo gallery meshes are `image_to_model` outputs — photographic-scan-style dense meshes, not MetaHuman-compatible topology. **Direct conversion to MetaHuman is not technically possible**; MetaHuman requires Creator-sculpted meshes + MetaHuman skeleton + DNA calibration.
- Approved uses per directive: visual reference (likeness, dreadlock silhouette, wardrobe), prototype/placeholder in greybox, hair/appearance reference, static scene dressing.
- MetaHuman pipeline remains authoritative: facial rig, skeleton, animation, and the 12 morph targets + 11 clips contract are unchanged.
- The existing export path (`scripts/authoring/build_feex_humanoid_web_export.py` → GLB → `verify-feex-humanoid-clips.mjs`) remains the validation gate. Current synthetic GLB stays live until a MetaHuman export passes.

## Gate 3 — Credit optimization

- Gallery browsing: free, no credits spent. ✅ zero cost so far.
- Downloads: gallery models typically require a Tripo account; download/print flow terms were **not audited** — do not assume free commercial use. Verify license terms on the specific model page before any download.
- **No generation credits needed for Gates 0–2.** Reference/prototype use of existing gallery assets covers discovery.
- Only genuinely-missing items would need generation later: e.g., a neck-length-dreadlock variant if #3's length fails spec, or wardrobe pieces — estimate before any spend, per directive.

## Gate 4 — Runtime preservation (confirmed, no changes made)

- `HumanoidHeroScene` / `HumanoidStage` / `HumanoidModel` / `HumanoidFallback` untouched.
- `feex-sovereign-synthetic.glb` remains the live model; one-canvas rule intact.
- `@vastai/tripo-sdk@0.5.0` was installed by user into `package.json`/`package-lock.json` (uncommitted) — needed only if/when generation endpoints are used; recommend keeping the change **out of the SORL PR** or committing separately.

## Recommended character source

**Primary reference bundle:** #1 (shirtless+features) + #2 (character sheet) + #7 (head/shoulders) — together they cover body, turnaround, and face for the MetaHuman likeness pass.
**Placeholder/prototype:** #3 (rigged long-dreadlocks) — only if its silhouette survives visual review; otherwise greybox procedural character remains.

## Revised production pipeline (delta vs CHARACTER-PRODUCTION-PLAN)

- P3C (groom/likeness) now has **concrete visual references** — Tripo #1/#2/#7 replaces "search for reference" step.
- TurboSquid dreadlock hair model ($49, Standard RF) remains an alternative groom-source candidate pending purchase decision.
- Base meshes (CC BY-SA body + CC0 head) still needed for MetaHuman-adjacent first-party fallback route.
- MetaHuman Creator remains the authoritative authoring environment (license review still open).

## Credit-saving recommendations

1. Do **not** generate a new character — gallery references + MetaHuman authoring cover the need.
2. Before any generation: produce the likeness/dreadlock reference board from #1/#2/#7 (free) and confirm with §18.1 reviewer whether gaps remain.
3. If generation becomes necessary, scope it to the missing element only (e.g., neck-length hair variant), with cost estimate approved first.
4. Rotate the `TRIPO_API_KEY` exposed in terminal/session before any API use — it is compromised by exposure.

## Open items / next actions

- [ ] User: verify Tripo download/license terms for #1/#2/#3 (account required)
- [ ] Visual review of #1/#2/#3/#7 renders (gallery embeds) against spec — needs human eyes
- [ ] Decide: TurboSquid $49 hair model vs Tripo references vs Blender-authored groom
- [ ] MetaHuman license/EULA review (still the authoritative-pipeline gate)
- [ ] Blender 4.5 LTS install decision (still blocking all DCC work)
- [ ] Rotate exposed Tripo API key
