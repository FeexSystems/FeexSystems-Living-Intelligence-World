/**
 * landingAssets
 *
 * Landing-only asset registration and preloading.
 *
 * Scope (migration Phase B): this registry owns ONLY the seven cinematic scene
 * videos and their posters. It does not register world imagery, world-model
 * media, or Sovereign runtime assets — those belong to their own surfaces.
 *
 * The scene ids here are the authoritative list driving both `SceneController`
 * and `AssetPreloader`, so a scene cannot exist in one and not the other.
 */

export type SceneId =
  | "hero"
  | "galaxy"
  | "systems"
  | "worlds"
  | "missions"
  | "convergence"
  | "ui-loops";

export interface SceneAsset {
  id: SceneId;
  /** Human label shown in the scene controller rail. */
  label: string;
  videoSrc: string;
  posterSrc: string;
}

/**
 * Canonical landing scene assets in authoring order.
 *
 * The order of this array IS the scene order for the whole landing — the
 * composition, the controller rail and the progress hook all derive from it.
 */
export const SCENE_ASSETS: readonly SceneAsset[] = [
  {
    id: "hero",
    label: "Hero",
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
] as const;

/**
 * The hero's LUT-graded media layer.
 *
 * The landing hero owns a single media layer (see `HeroScene`): the canonical
 * scene video (`SCENE_ASSETS[0]`, landscape `hero.webm`) rendered through the
 * 16^3 LUT strip by the WebGL pipeline (`LutPipelineCanvas`, mounted via the
 * `CinematicScene` `mediaLayer` slot). One video, one decode: the pipeline
 * owns its own poster, playback, pause control, and reduced-motion fallback,
 * so the scene's built-in poster/video layers are skipped for the hero.
 *
 * The LUT texture is a 256x16 strip (16 blue slices along X; red is the
 * in-slice column, green is the row), matching `lutShader.frag`.
 */
export const HERO_LUT_PIPELINE = {
  videoSrc: "/media/landing/scenes/hero.webm",
  posterSrc: "/media/landing/scenes/hero-poster.webp",
  lutMapSrc: "/media/feex/lut-cinematic-16.webp",
  /** Grade strength; 0 disables the LUT, 1 is the full cinematic look. */
  lutIntensity: 0.75,
} as const;

/** Scene ids in authoring order — used for progress tracking and observers. */
export const SCENE_IDS: SceneId[] = SCENE_ASSETS.map((asset) => asset.id);

export function getSceneAsset(id: SceneId): SceneAsset | undefined {
  return SCENE_ASSETS.find((asset) => asset.id === id);
}

/**
 * Ordered list of every distinct asset URL the landing needs, posters first.
 * Posters are preloaded ahead of videos because they are the first paint the
 * user sees and are far smaller. The hero's LUT strip (~1 kB) warms with the
 * first-paint posters so the WebGL grade is ready before the video decodes.
 */
export function getPreloadManifest(): string[] {
  return [
    ...SCENE_ASSETS.map((asset) => asset.posterSrc),
    HERO_LUT_PIPELINE.lutMapSrc,
    ...SCENE_ASSETS.map((asset) => asset.videoSrc),
  ];
}
