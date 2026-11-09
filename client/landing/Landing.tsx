import { useCallback, useEffect, useRef, useState } from "react";

import { NavigationOverlay } from "./components/NavigationOverlay";
import { SoundscapeController } from "./components/SoundscapeController";
import { CommandLauncher } from "./components/CommandLauncher";
import { ScrollytellingManager } from "./components/ScrollytellingManager";

import { SceneController } from "./cinematic/SceneController";
import { AssetPreloader } from "./cinematic/AssetPreloader";

import { useSceneProgress } from "./motion/useSceneProgress";
import { SCENE_IDS, type SceneId } from "./registry/landingAssets";

import { HeroScene } from "./scenes/HeroScene";
import { GalaxySequenceScene } from "./scenes/GalaxySequenceScene";
import { CoreSystemsScene } from "./scenes/CoreSystemsScene";
import { WorldsScene } from "./scenes/WorldsScene";
import { MissionCapabilityScene } from "./scenes/MissionCapabilityScene";
import { ConvergenceScene } from "./scenes/ConvergenceScene";
import { UILoopsScene } from "./scenes/UILoopsScene";
import { NoirPrimitivesScene } from "./scenes/NoirPrimitivesScene";
import { NoirWebGLScene } from "./scenes/NoirWebGLScene";
import { NoirCapabilitiesScene } from "./scenes/NoirCapabilitiesScene";
import { Effect } from "./effects/EffectGate";
import { playHyperiuxTransition } from "../components/effects/_lib/transition-router";

/**
 * Landing
 *
 * The composition root for the seven-scene cinematic landing (Phase D).
 *
 * Responsibilities:
 * - register the ambient surfaces (navigation overlay, soundscape)
 * - own the command launcher open/closed state
 * - sequence the seven scenes and drive the scene controller
 * - warm cinematic assets without blocking first paint
 *
 * Out of scope by contract: this component does not define or derive any world
 * data. Every canonical value comes from `PLANETARY_ECOSYSTEMS` through the
 * respective scene (see `scenes/WorldsScene.tsx` and `landing/world/`).
 */

export function Landing() {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  // Safety net: GSAP's lagSmoothing can stretch the intro on heavily-loaded
  // or low-fps clients, so never let the loader trap the landing.
  useEffect(() => {
    if (introDone) return;
    const timer = window.setTimeout(() => setIntroDone(true), 8000);
    return () => window.clearTimeout(timer);
  }, [introDone]);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);

  // The snap-scroll element itself is the observer root, not its outer wrapper.
  const captureScrollContainer = useCallback((element: HTMLDivElement | null) => {
    scrollContainerRef.current = element;
    setScrollContainer(element);
  }, []);

  const { activeIndex: observedIndex } = useSceneProgress({
    sceneIds: SCENE_IDS,
    container: scrollContainer,
  });

  // Keep the controller in sync with scroll observation.
  useEffect(() => {
    setActiveIndex(observedIndex);
  }, [observedIndex]);

  const handleSelectScene = useCallback((_id: SceneId, index: number) => {
    const container = scrollContainerRef.current;
    const sceneId = SCENE_IDS[index];
    if (!container || !sceneId) return;

    const target = container.querySelector<HTMLElement>(`#${CSS.escape(sceneId)}`);
    target?.scrollIntoView({
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
    setActiveIndex(index);
    // Cinematic block wipe covers the scroll jump, then reveals the new scene.
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      playHyperiuxTransition();
    }
  }, []);

  return (
    <>
      <AssetPreloader activeIndex={activeIndex} />

      <NavigationOverlay activeIndex={activeIndex} onCommandClick={() => setLauncherOpen(true)} />
      <SoundscapeController />
      <SceneController activeIndex={activeIndex} onSelectScene={handleSelectScene} />

      {/* NB: do NOT add <main> here. App.tsx already wraps every route in
          <div id="main-content" role="main">, so a nested main would be invalid
          (WCAG 1.3.1 / ARIA: landmarks must not nest) and would make the
          #main-content skip link ambiguous. The landing's header/nav landmarks
          come from NavigationOverlay. */}
      <div data-testid="landing-root">
        {/* Stack-loader intro: cinematic card spread over noir, then fades.
            Unmounts on completion; gated clients see the scenes directly. */}
        {!introDone && (
          <Effect
            name="stack-loader"
            backgroundColor="#050505"
            textColor="#fafafa"
            duration={0.9}
            fadeOutDuration={0.7}
            className="fixed inset-0 z-[90]"
            onComplete={() => setIntroDone(true)}
            fallback={null}
            gate={["reducedMotion", "lowPower", "saveData"]}
          />
        )}

        {/* Cursor layer: dot trail + phantom image trail over every scene.
            Both track the pointer via window listeners, so the wrapper is
            pointer-events-none and never intercepts scene controls. */}
        <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden="true">
          <Effect
            name="dotted-trail"
            transparent
            dotColor="#a3a3a3"
            className="!h-screen pointer-events-none"
            fallback={null}
            gate={["reducedMotion", "lowPower", "coarsePointer"]}
          />
          <Effect
            name="phantom-image-trail"
            images={[
              "/media/landing/scenes/hero-poster.webp",
              "/media/landing/scenes/galaxy-poster.webp",
              "/media/landing/scenes/systems-poster.webp",
              "/media/landing/scenes/worlds-poster.webp",
              "/media/landing/scenes/missions-poster.webp",
              "/media/landing/scenes/convergence-poster.webp",
              "/media/landing/scenes/ui-loops-poster.webp",
            ]}
            disableOnMobile
            imageClassName="opacity-70 saturate-0"
            className="!h-screen pointer-events-none"
            fallback={null}
            gate={["reducedMotion", "lowPower", "coarsePointer", "saveData"]}
          />
        </div>

        {/* Chess-grid transition wipe: cinematic cover/reveal on mount and
            on every scene jump via the `hyperiux:transition` window event.
            Gated off for reduced-motion / low-power clients — in that case
            the fallback renders the scenes directly with no wrapper. */}
        {(() => {
          const scenes = (
            <ScrollytellingManager scrollRef={captureScrollContainer}>
              <HeroScene />
              <GalaxySequenceScene />
              <CoreSystemsScene onSelectScene={handleSelectScene} />
              <WorldsScene />
              <MissionCapabilityScene />
              <ConvergenceScene />
              <UILoopsScene />
              <NoirPrimitivesScene />
              <NoirWebGLScene />
              <NoirCapabilitiesScene />
            </ScrollytellingManager>
          );
          return (
            <Effect
              name="chess-grid-transition"
              gridSize={8}
              color="#0a0a0a"
              duration={0.8}
              gate={['reducedMotion', 'lowPower']}
              fallback={scenes}
            >
              {scenes}
            </Effect>
          );
        })()}
      </div>

      <CommandLauncher open={launcherOpen} onClose={() => setLauncherOpen(false)} />
    </>
  );
}

export default Landing;

