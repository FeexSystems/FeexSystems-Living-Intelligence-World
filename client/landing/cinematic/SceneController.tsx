import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { SCENE_ASSETS, type SceneId } from "../registry/landingAssets";
import { motionStyle } from "../motion/MotionSystem";

/**
 * SceneController
 *
 * The scene rail and the scroll contract for the landing.
 *
 * Phase D boundary: this component owns scene SEQUENCING and NAVIGATION only.
 * It knows nothing about world data, evidence, or the World Model — scene state
 * here is presentation state, exactly as the migration contract requires.
 *
 * The rail is derived from `SCENE_ASSETS`, so the controller cannot drift out of
 * sync with the scenes that actually render.
 */

export interface SceneControllerProps {
  activeIndex: number;
  onSelectScene: (id: SceneId, index: number) => void;
  className?: string;
}

export function SceneController({
  activeIndex,
  onSelectScene,
  className,
}: SceneControllerProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      event.preventDefault();
      const next = Math.max(0, Math.min(SCENE_ASSETS.length - 1, activeIndex + (event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1)));
      if (next !== activeIndex) onSelectScene(SCENE_ASSETS[next].id, next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, onSelectScene]);

  return (
    <nav
      data-testid="scene-controller"
      data-active-index={activeIndex}
      aria-label="Landing scenes"
      className={cn(
        "pointer-events-auto fixed bottom-5 left-5 right-5 z-40 flex-col gap-2 border-white/15 bg-black/80 p-3 text-white backdrop-blur-md md:bottom-auto md:left-auto md:right-6 md:top-1/2 md:w-44 md:-translate-y-1/2 md:p-4",
        className
      )}
    >
      <div className="flex justify-between font-mono text-[10px] tracking-widest text-white/70">
        <span>{String(activeIndex + 1).padStart(2, '0')} / {String(SCENE_ASSETS.length).padStart(2, '0')}</span>
        <span className="md:hidden">{SCENE_ASSETS[activeIndex]?.label}</span>
      </div>
      <div className="h-px bg-white/20" aria-hidden="true"><div className="h-px bg-white transition-[width] motion-reduce:transition-none" style={{ width: `${(activeIndex + 1) / SCENE_ASSETS.length * 100}%` }} /></div>
      <div className="flex gap-1 overflow-x-auto md:flex-col md:gap-0">
      {SCENE_ASSETS.map((scene, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={scene.id}
            type="button"
            data-testid={`scene-controller-item-${scene.id}`}
            aria-current={isActive ? "step" : undefined}
            aria-label={`${String(index + 1).padStart(2, '0')} — ${scene.label} — Scene ${index + 1} of ${SCENE_ASSETS.length}`}
            onClick={() => onSelectScene(scene.id, index)}
            className="group flex min-h-6 shrink-0 items-center gap-2 px-1 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-white md:w-full"
          >
            <span
              className={cn(
                "font-mono text-[9px] uppercase tracking-[.15em] transition-opacity motion-reduce:transition-none",
                                 isActive ? "text-white" : "text-white/55 group-hover:text-white"
              )}
              style={motionStyle("overlay")}
            >
              {String(index + 1).padStart(2, '0')} <span className="hidden md:inline">— {scene.label}</span>
            </span>
            <span
              className={cn(
                "block rounded-full transition-all",
                isActive
                  ? "h-[2px] w-8 bg-white"
                  : "h-[2px] w-4 bg-white/25 group-hover:w-6 group-hover:bg-white/50"
              )}
              style={motionStyle("overlay", ["width", "background-color"])}
            />
          </button>
        );
      })}
      </div>
    </nav>
  );
}
