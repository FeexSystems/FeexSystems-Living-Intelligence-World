# FEEX-SORL Phase 7 — World Model & Evidence Fabric Read Projection

**Document ID:** FEEX-SORL-P7-WORLD-001
**Branch:** `feat/feex-sorl-lab`
**Status:** read projection live in inspector; all metadata traceable or explicitly marked

---

## 1. Deliverables

| Artifact | Path |
|---|---|
| Zone→world link registry + evidence resolver | `client/lib/lab/lab-world-model.ts` |
| Revision/stale-data helpers | same file (`getLabRegistryRevision`, `isLabProjectionStale`) |
| Inspector evidence panel | `client/landing/scenes/HumanoidHeroScene.tsx` (EVIDENCE section) |
| Tests | `client/test/lib/lab-world-model.test.ts` (5 tests) |

## 2. Contract compliance (plan §Phase 7)

- **Canonical entities defined/reused:** zones link to `PLANETARY_ECOSYSTEMS` worlds via `LAB_ZONE_WORLD_LINKS` — primary-system links to `feexsystems` (the platform world), research-context links for bio-research (`farmplug`, `yurrheeler`). All world ids verified against the live registry in tests.
- **Zone assets → provenance:** `assetRef()` returns `CANONICAL`+sha256 only when a Phase 4 manifest exists; until then `UNAVAILABLE`/`PENDING_PHASE4_MANIFEST` — never fabricated.
- **Equipment → FEEX systems:** zone signature equipment is documented per zone in `lab-zones.ts` (`signature` key) and bound to the same world links.
- **Real evidence references in inspector:** the aside now renders up to 4 `LabEvidenceRef`s with evidence-class badges (`CANONICAL`/`DESIGN_SPEC`/`SIMULATED`/`UNAVAILABLE`), verified flag styling, registry revision fingerprint, and READ ONLY marker.
- **Read projection:** no writes, no mutations; `getWorldEvidence` is the only data source.
- **Revision-aware stale handling:** `getLabRegistryRevision()` fingerprints world id + evidence class + verified; `isLabProjectionStale()` compares against captured baseline; inspector shows `[STALE]` + revision when diverged (dormant until a server-synced registry revision exists).

## 3. Verification

- `npx vitest --run client/test/lib/lab-world-model.test.ts` — 5/5 pass (link integrity, provenance fields, honest asset status, deterministic revision).
- `npm run typecheck` — clean.

## 4. Phase 7 exit checklist

- [x] Canonical lab/zone/asset entities defined and linked
- [x] Zone assets bound to provenance contract (manifest-gated)
- [x] Equipment linked to relevant FEEX systems (world links)
- [x] Real evidence references rendered in inspector
- [x] Browser scene remains read-only projection
- [x] Revision-aware stale-data handling implemented
- [x] All displayed canonical metadata traceable or marked SIMULATED/DESIGN_SPEC/UNAVAILABLE
