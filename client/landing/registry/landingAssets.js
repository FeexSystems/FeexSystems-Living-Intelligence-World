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

 
















/**
 * Canonical landing scene assets in authoring order.
 *
 * The order of this array IS the scene order for the whole landing — the
 * composition, the controller rail and the progress hook all derive from it.
 */
export const SCENE_ASSETS = [
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
] ;

/** Scene ids in authoring order — used for progress tracking and observers. */
export const SCENE_IDS = SCENE_ASSETS.map((asset) => asset.id);

export function getSceneAsset(id) {
  return SCENE_ASSETS.find((asset) => asset.id === id);
}

/**
 * Ordered list of every distinct asset URL the landing needs, posters first.
 * Posters are preloaded ahead of videos because they are the first paint the
 * user sees and are far smaller.
 */
export function getPreloadManifest() {
  return [
    ...SCENE_ASSETS.map((asset) => asset.posterSrc),
    ...SCENE_ASSETS.map((asset) => asset.videoSrc),
  ];
}
