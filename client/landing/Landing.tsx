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
        <ScrollytellingManager scrollRef={captureScrollContainer}>
          <HeroScene />
          <GalaxySequenceScene />
          <CoreSystemsScene />
          <WorldsScene />
          <MissionCapabilityScene />
          <ConvergenceScene />
          <UILoopsScene />
        </ScrollytellingManager>
      </div>

      <CommandLauncher open={launcherOpen} onClose={() => setLauncherOpen(false)} />
    </>
  );
}

export default Landing;
