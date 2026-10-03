/**
 * Landing cinematic primitives.
 *
 * Pruned during the Phase F cleanup PR (2026-10-03). The following 15 modules
 * were proven orphaned by the final dependency scan — zero references outside
 * this directory other than these barrel exports — and were removed:
 *
 *   AnimatedBackground, AsciiArtEffect, CinematicVideo, FullscreenScrollSlider,
 *   GlobeMorph, HeroTunnel, ParticleGlobe3D, PolygonNet, ScrollSyncedText,
 *   ScrollZoomReveal, StrokeAnimation, TheaterVideoPlayer, TsunamiWave,
 *   VideoOverlayBackground, YoutubeEmbedCard
 *
 * Evidence: see "Dependency Scan Record" in
 * docs/architecture/FEEX-LANDING-ARCHITECTURE-MIGRATION.md
 *
 * NOTE: this barrel IS consumed by production surfaces (Login, Register,
 * Projects, Navigator, OmniCommand, EvidenceExplorer, DashboardLayout, ...).
 * Do not delete the module — only the orphaned re-exports were removed.
 */

// Shared shell / navigation primitives (consumed by public + auth pages)
export * from "./FullWidthNav";
export * from "./AppleDock";
export * from "./BtcMonoBadge";
export * from "./CursorDotTrail";
export * from "./SkeletonLoader";
export * from "./MagneticGlowButton";

// Ambient background layer (itself consumes WarpStarfield and
// InteractionLinesBackground, so both must remain)
export * from "./AmbientLivingBackground";
export * from "./InteractionLinesBackground";
export * from "./WarpStarfield";

// Carousels and scene-level visuals consumed by the seven landing scenes
export * from "./SushCinematicCarousel";
export * from "./PillCarousel";
export * from "./SequentialCarousel";
export * from "./TransitionVisualizer";

// Landing scene orchestration (Phase D)
export * from "./SceneController";
export * from "./AssetPreloader";
