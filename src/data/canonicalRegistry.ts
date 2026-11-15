import { PLANETARY_ECOSYSTEMS } from "../../client/world-model/registry/planetary-ecosystems";

export interface CanonicalMission {
  id: string;
  title: string;
  description: string;
  projectionIndex: number;
}

export interface WorldMediaAsset {
  videoUrl?: string;
  secondaryVideoUrl?: string;
  posterUrl: string;
}

export const WORLD_MEDIA_MAP: Record<string, WorldMediaAsset> = {
  '3wm': { posterUrl: '/media/surfaces/galaxy-s04-core.jpg' },
  'yurrheeler': { videoUrl: '/media/worlds/world-02-yurrheeler.mp4', posterUrl: '/media/surfaces/galaxy-s04-core.jpg' },
  'farmplug': { videoUrl: '/media/worlds/world-03-farmplug.mp4', posterUrl: '/media/surfaces/galaxy-s04-core.jpg' },
  'firehouse': { videoUrl: '/media/worlds/world-04-firehouse.mp4', posterUrl: '/media/surfaces/galaxy-s04-core.jpg' },
  'feexkeeauth': { posterUrl: '/media/surfaces/evidence-s01-keyframe.jpg' },
  'kappaxchangefin': { videoUrl: '/media/worlds/world-06-kappa.mp4', posterUrl: '/media/surfaces/galaxy-s04-core.jpg' },
  'rentall': { videoUrl: '/media/worlds/world-07-rentall.mp4', secondaryVideoUrl: '/media/worlds/world-07-rentall-interior.mp4', posterUrl: '/media/surfaces/galaxy-s04-core.jpg' },
  'feexsystems': { videoUrl: '/media/worlds/world-08-holokai.mp4', secondaryVideoUrl: '/media/holokai/holokai-env-scan.mp4', posterUrl: '/media/surfaces/galaxy-s04-core.jpg' },
  'vyralabs': { videoUrl: '/media/worlds/world-09-vyra.mp4', posterUrl: '/media/surfaces/galaxy-s04-core.jpg' },
};

export const EVIDENCE_POSTER_URL = '/media/surfaces/evidence-s01-keyframe.jpg';
export const GALAXY_POSTER_URL = '/media/surfaces/galaxy-s04-core.jpg';
export const NAVIGATOR_VIDEO_URL = '/media/surfaces/navigator-s01.mp4';
export const HOLOKAI_SCAN_VIDEO_URL = '/media/holokai/holokai-env-scan.mp4';

export function getWorldMedia(worldId: string) {
  return WORLD_MEDIA_MAP[worldId] ?? { posterUrl: GALAXY_POSTER_URL };
}

/** Canonical mission index shared by all landing projections. */
export const CANONICAL_MISSIONS: readonly CanonicalMission[] = [
  { id: "001", title: "AI Operations", description: "Provider-neutral AI orchestration with idempotent workflows and execution tracing.", projectionIndex: 0 },
  { id: "002", title: "Shared Platform", description: "Multi-tenant isolation, team RBAC, and a hardened AI gateway.", projectionIndex: 1 },
  { id: "003", title: "World Intelligence", description: "Canonical graph interpretation separates authoritative facts from model interpretations.", projectionIndex: 2 },
  { id: "004", title: "Domain Products", description: "RentAll property operations and FarmPlug smart agriculture.", projectionIndex: 3 },
  { id: "005", title: "Knowledge & Document AI", description: "SHA-256 evidence hashing and citation-validated document retrieval.", projectionIndex: 3 },
];

/** PLANETARY_ECOSYSTEMS remains the authoritative record set; this alias makes it the landing's single canonical source. */
export const CANONICAL_WORLDS = PLANETARY_ECOSYSTEMS;
export const CANONICAL_WORLD_COUNT = CANONICAL_WORLDS.length;

if (CANONICAL_MISSIONS.length !== 5 || CANONICAL_WORLD_COUNT !== 9) {
  throw new Error(`Canonical landing registry invariant failed: ${CANONICAL_MISSIONS.length} missions, ${CANONICAL_WORLD_COUNT} worlds.`);
}
