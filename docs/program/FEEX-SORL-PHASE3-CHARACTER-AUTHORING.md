# FEEX-SORL Phase 3 — Character Authoring Report

**Document ID:** FEEX-SORL-P3-CHARACTER-001
**Branch:** `feat/feex-sorl-lab`
**Status:** contract + tooling delivered; **asset production gated on MetaHuman license review and §18.1 visual approval (human/legal)**

---

## 1. Character direction (recorded per Phase 1 requirement)

The young Black African male humanoid with neck-length dreadlocks and monochromatic technical wardrobe + restrained cybernetics is recorded as the **explicit human-approved successor** to the v2.1.0 faceless synthetic direction — *pending the §18.1 signature*. The prior synthetic (`feex-sovereign-synthetic.glb`) is retained as rollback/reference and must not be deleted.

## 2. Deliverables (agent-completable portion)

| Artifact | Path |
|---|---|
| GLB clip/morph/skeleton contract | `docs/program/FEEX-SORL-CHARACTER-CONTRACT.md` |
| Blender export validator | `scripts/authoring/validate_feex_humanoid_export.py` |
| Versioned humanoid GLB exporter + manifest | `scripts/authoring/build_feex_humanoid_web_export.py` |
| Node GLB clip/morph verifier | `scripts/verify-feex-humanoid-clips.mjs` |

Contract highlights: 11 named clips (`Idle`…`Unavailable`), minimum 12-channel facial morph set, ARKit-compatible naming preferred, groom-as-cards rule, LOD budgets, fail-to-`Idle` fallback with diagnostics.

## 3. Verification evidence

`node scripts/verify-feex-humanoid-clips.mjs public/models/feex-sovereign-synthetic.glb` → exit 1, correctly reporting the rollback asset lacks `Listen/Think/Inspect/Point/Walk/Speak/Unavailable` clips and all facial morphs (it ships 4 clips, 0 morphs, 1 skin). Tooling proven against a real GLB.

## 4. Human/legal gates (cannot be agent-completed)

1. **MetaHuman license/EULA review** — required before any MetaHuman-derived texture/mesh/groom ships to the web (§4.3). Credential/key rotation for BlendSwap also outstanding.
2. **MetaHuman Creator authoring** — character sculpt, dreadlock groom, wardrobe, animation authoring happen in Epic's tool.
3. **Visual identity approval (§18.1)** — human sign-off on the character before Phase 4 assembly.
4. **Fallback route:** if MetaHuman export rights are denied, produce a first-party independent browser character to the same approved direction (contract already supports this — it constrains the GLB, not the authoring tool).

## 5. Phase 3 exit checklist

- [x] Character direction recorded as successor direction
- [x] GLB clip/morph contract defined and machine-verifiable
- [x] Export + validation tooling delivered and smoke-tested
- [ ] MetaHuman Creator session → character source asset — **human gate**
- [ ] Dreadlock groom (neck-length, LOD-consistent) — **human gate**
- [ ] License disposition recorded — **human/legal gate**
- [ ] Rig + animation reports — produced after authoring
