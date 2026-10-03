import React from "react";
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
  return (
    <nav
      data-testid="scene-controller"
      data-active-index={activeIndex}
      aria-label="Landing scenes"
      className={cn(
        "pointer-events-auto fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 md:flex",
        className
      )}
    >
      {SCENE_ASSETS.map((scene, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={scene.id}
            type="button"
            data-testid={`scene-controller-item-${scene.id}`}
            aria-current={isActive ? "true" : undefined}
            onClick={() => onSelectScene(scene.id, index)}
            className="group flex items-center gap-3"
          >
            <span
              className={cn(
                "font-mono text-[9px] uppercase tracking-[.22em] transition-opacity",
                isActive ? "text-white/70" : "text-white/0 group-hover:text-white/40"
              )}
              style={motionStyle("overlay")}
            >
              {scene.label}
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
    </nav>
  );
}
