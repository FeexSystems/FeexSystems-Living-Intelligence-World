/**
 * landingAssets
 *
 * Landing-only asset registration and preloading.
 *
 * Scope (migration Phase B): this registry owns the landing scene order and
 * the cinematic scene videos/posters. Scenes rendered by other media (the
 * WebGL humanoid hero) carry no video/poster pair. It does not register
 * world imagery, world-model media, or Sovereign runtime assets — those
 * belong to their own surfaces.
 *
 * The scene ids here are the authoritative list driving both `SceneController`
 * and `AssetPreloader`, so a scene cannot exist in one and not the other.
 */

export type SceneId =
  | "humanoid-hero"
  | "hero"
  | "galaxy"
  | "systems"
  | "worlds"
  | "missions"
  | "convergence"
  | "ui-loops"
  | "architect-origin"
  | "fx-primitives"
  | "fx-webgl"
  | "fx-capabilities";

export interface SceneAsset {
  id: SceneId;
  /** Human label shown in the scene controller rail. */
  label: string;
  /**
   * Cinematic media for video-backed scenes. Scenes rendered by other media
   * (the WebGL humanoid hero) declare neither — they never enter the preload
   * manifest.
   */
  videoSrc?: string;
  posterSrc?: string;
}

/**
 * Canonical landing scene assets in authoring order.
 *
 * The order of this array IS the scene order for the whole landing — the
 * composition, the controller rail and the progress hook all derive from it.
 */
export const SCENE_ASSETS: readonly SceneAsset[] = [
  {
    // Scene 01 — Humanoid Hero: a rigged glTF character on a React Three Fiber
    // stage. It owns no video/poster pair; its media is the GLB model plus a
    // static fallback frame.
    id: "humanoid-hero",
    label: "Humanoid",
  },
  {
    // Scene 02 — Cinematic: the FEEXSYSTEMS identity film. This is the former
    // opening hero video, demoted to second position per the humanoid-first
    // scene architecture.
    id: "hero",
    label: "Cinematic",
    videoSrc: "/media/landing/scenes/hero.webm",
    posterSrc: "/media/landing/scenes/hero-poster.webp",
  },
  {
    id: "galaxy",
    label: "Galaxy",
    videoSrc: "/media/landing/scenes/galaxy.webm",
    posterSrc: "/media/landing/scenes/galaxy-poster.webp",
  },
  {
    id: "systems",
    label: "Systems",
    videoSrc: "/media/landing/scenes/systems.webm",
    posterSrc: "/media/landing/scenes/systems-poster.webp",
  },
  {
    id: "worlds",
    label: "Worlds",
    videoSrc: "/media/landing/scenes/worlds.webm",
    posterSrc: "/media/landing/scenes/worlds-poster.webp",
  },
  {
    id: "missions",
    label: "Missions",
    videoSrc: "/media/landing/scenes/missions.webm",
    posterSrc: "/media/landing/scenes/missions-poster.webp",
  },
  {
    id: "convergence",
    label: "Convergence",
    videoSrc: "/media/landing/scenes/convergence.webm",
    posterSrc: "/media/landing/scenes/convergence-poster.webp",
  },
  {
    id: "ui-loops",
    label: "UI Loops",
    videoSrc: "/media/landing/scenes/ui-loops.webm",
    posterSrc: "/media/landing/scenes/ui-loops-poster.webp",
  },
  {
    // Creator-provenance scene: Emar the Scientist, the verified architect
    // behind the nine canonical worlds. Sits between the operating scenes and
    // the interface layer so authorship closes the narrative before surfaces.
    // Poster-only scene: the section renders stills, never a decoder. The
    // registry still requires a compliant video/poster pair for the preload
    // manifest, so it borrows the galaxy cinematic assets it sits alongside.
    id: "architect-origin",
    label: "Architect",
    videoSrc: "/media/landing/scenes/galaxy.webm",
    posterSrc: "/media/landing/scenes/galaxy-poster.webp",
  },
  {
    // FeexSystems interface-systems scene: features/services/use cases over
    // the ui-loops cinematic video.
    id: "fx-primitives",
    label: "Interface",
    videoSrc: "/media/landing/scenes/ui-loops.webm",
    posterSrc: "/media/landing/scenes/ui-loops-poster.webp",
  },
  {
    // FeexSystems live-surfaces scene: service cards over the ui-loops video.
    id: "fx-webgl",
    label: "Surfaces",
    videoSrc: "/media/landing/scenes/ui-loops.webm",
    posterSrc: "/media/landing/scenes/ui-loops-poster.webp",
  },
  {
    // FeexSystems capabilities scene: canonical metrics, world index, stacks,
    // flip deck, pipeline timeline and FAQ — all FeexSystems content only.
    id: "fx-capabilities",
    label: "Capabilities",
    videoSrc: "/media/landing/scenes/ui-loops.webm",
    posterSrc: "/media/landing/scenes/ui-loops-poster.webp",
  },
] as const;

/**
 * Scene ids in authoring order — used for progress tracking and observers.
 */
export const SCENE_IDS: SceneId[] = SCENE_ASSETS.map((asset) => asset.id);

export function getSceneAsset(id: SceneId): SceneAsset | undefined {
  return SCENE_ASSETS.find((asset) => asset.id === id);
}

/**
 * Ordered list of every distinct asset URL the landing needs, posters first.
 * Posters are preloaded ahead of videos because they are the first paint the
 * user sees and are far smaller.
 */
export function getPreloadManifest(): string[] {
  // Several scenes intentionally share one asset (the three fx scenes all use
  // ui-loops), so dedupe — otherwise the preloader issues identical requests.
  const posters = SCENE_ASSETS.map((asset) => asset.posterSrc).filter((src): src is string => Boolean(src));
  const videos = SCENE_ASSETS.map((asset) => asset.videoSrc).filter((src): src is string => Boolean(src));
  return [...new Set([...posters, ...videos])];
}
