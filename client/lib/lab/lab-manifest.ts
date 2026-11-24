/**
 * lab-manifest.ts — FEEX-SORL lab asset manifest.
 *
 * Maps zone IDs to their GLB chunks and the procedural greybox fallback.
 * Until Phase 4 exports land, every entry resolves to `src: null` and the
 * lab renders deterministic R3F primitives — the manifest is the single
 * place that flips to real assets later.
 */

import type { LabAssetEntry } from "./lab-contracts";
import type { LabZoneId } from "./lab-zones";

export const LAB_ASSETS: Record<string, LabAssetEntry> = {
  lab_shell: {
    id: "lab_shell",
    src: "/models/feex-sorl/feex_sorl_lab_v001.glb",
    sha256: undefined, // filled from .manifest.json at Phase 4 sign-off
  },
  humanoid: {
    id: "humanoid",
    src: "/models/feex-sorl/feex_sovereign_humanoid_v001.glb",
    sha256: undefined,
  },
};

/** Zone → asset binding. `null` assetId = procedural zone furniture. */
export const LAB_ZONE_ASSETS: Record<LabZoneId, string | null> = {
  "command-centre": null,
  "humanoid-bay": null,
  "robotics-sim": null,
  "ai-research": null,
  "bio-research": null,
  "engineering-workshop": null,
};

/** Public path prefix for all SORL chunks. */
export const LAB_ASSET_BASE = "/models/feex-sorl";
