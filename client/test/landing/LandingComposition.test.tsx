import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  SCENE_ASSETS,
  SCENE_IDS,
  getSceneAsset,
  getPreloadManifest,
} from "@/landing/registry/landingAssets";
import { SceneController } from "@/landing/cinematic/SceneController";
import { CommandLauncher, COMMAND_SHORTCUTS } from "@/landing/components/CommandLauncher";
import {
  MOTION_TOKENS,
  resolveMotion,
  progressToOpacity,
  progressToOffset,
} from "@/landing/motion/MotionSystem";

/**
 * Phase D/E — composition, controller and motion.
 *
 * These tests pin the Phase D contract: scene sequencing is derived from the
 * asset registry (no second source of truth), the controller reflects the active
 * index, the command launcher is router-backed only, and motion honours
 * reduced-motion.
 */

describe("landingAsset registry", () => {
  it("registers the humanoid hero first, then the cinematic film and the remaining scenes", () => {
    expect(SCENE_ASSETS).toHaveLength(12);
    expect(SCENE_IDS).toEqual([
      // Scene 01 — rigged WebGL humanoid (no video/poster pair).
      "humanoid-hero",
      // Scene 02 — the FEEXSYSTEMS identity film.
      "hero",
      "galaxy",
      "systems",
      "worlds",
      "missions",
      "convergence",
      "ui-loops",
      // Creator provenance, closing the narrative before the interface layer.
      "architect-origin",
      // Noir FX scenes appended after the seven canonical cinematic scenes.
      "fx-primitives",
      "fx-webgl",
      "fx-capabilities",
    ]);
  });

  it("gives every video-backed scene both a video and a poster", () => {
    const videoScenes = SCENE_ASSETS.filter((asset) => asset.videoSrc);
    expect(videoScenes.length).toBeGreaterThan(0);
    for (const asset of videoScenes) {
      expect(asset.videoSrc).toMatch(/\.webm$/);
      expect(asset.posterSrc).toMatch(/\.webp$/);
      expect(asset.label.length).toBeGreaterThan(0);
    }
    // The humanoid hero is the only non-video scene and must carry no media.
    const humanoid = getSceneAsset("humanoid-hero");
    expect(humanoid?.videoSrc).toBeUndefined();
    expect(humanoid?.posterSrc).toBeUndefined();
  });

  it("preloads posters before videos, without duplicate URLs", () => {
    const manifest = getPreloadManifest();
    const posters = [...new Set(SCENE_ASSETS.map((asset) => asset.posterSrc).filter((src): src is string => Boolean(src)))];
    const videos = [...new Set(SCENE_ASSETS.map((asset) => asset.videoSrc).filter((src): src is string => Boolean(src)))];

    // Scenes may share an asset (the three fx scenes reuse ui-loops), so the
    // manifest is the deduped union — never one entry per scene.
    expect(manifest).toHaveLength(posters.length + videos.length);
    expect(new Set(manifest).size).toBe(manifest.length);
    expect(manifest.slice(0, posters.length)).toEqual(posters);
    expect(manifest.slice(posters.length)).toEqual(videos);
  });

  it("resolves a scene asset by id", () => {
    expect(getSceneAsset("worlds")?.label).toBe("Worlds");
    // @ts-expect-error — unknown ids are not part of the SceneId union
    expect(getSceneAsset("nope")).toBeUndefined();
  });
});

describe("SceneController", () => {
  it("renders one rail item per registered scene", () => {
    render(
      <MemoryRouter>
        <SceneController activeIndex={0} onSelectScene={() => {}} />
      </MemoryRouter>
    );

    for (const id of SCENE_IDS) {
      expect(screen.getByTestId(`scene-controller-item-${id}`)).toBeInTheDocument();
    }
  });

  it("marks only the active scene as current", () => {
    render(
      <MemoryRouter>
        <SceneController activeIndex={4} onSelectScene={() => {}} />
      </MemoryRouter>
    );

    const controller = screen.getByTestId("scene-controller");
    expect(controller).toHaveAttribute("data-active-index", "4");
    expect(screen.getByTestId("scene-controller-item-worlds")).toHaveAttribute(
      "aria-current",
      "step"
    );
    expect(screen.getByTestId("scene-controller-item-hero")).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("reports the selected scene id and index", async () => {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <SceneController activeIndex={0} onSelectScene={onSelect} />
      </MemoryRouter>
    );

    await act(async () => {
      screen.getByTestId("scene-controller-item-convergence").click();
    });

    expect(onSelect).toHaveBeenCalledWith("convergence", 6);
  });
});

describe("CommandLauncher", () => {
  it("renders nothing while closed", () => {
    render(
      <MemoryRouter>
        <CommandLauncher open={false} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.queryByTestId("command-launcher")).not.toBeInTheDocument();
  });

  it("exposes router-backed shortcuts without simulated output", () => {
    render(
      <MemoryRouter>
        <CommandLauncher open onClose={() => {}} />
      </MemoryRouter>
    );

    for (const route of COMMAND_SHORTCUTS) {
      expect(screen.getByRole("option", { name: route })).toBeInTheDocument();
    }
    expect(
      screen.getByText(/Router-backed navigation only\. No simulated infrastructure output\./i)
    ).toBeInTheDocument();
  });

  it("closes through the dismiss control", async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <CommandLauncher open onClose={onClose} />
      </MemoryRouter>
    );

    await act(async () => {
      screen.getByLabelText(/close command launcher/i).click();
    });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("MotionSystem", () => {
  it("defines tokens for every transition the landing uses", () => {
    expect(Object.keys(MOTION_TOKENS)).toEqual([
      "sceneEnter",
      "sceneExit",
      "overlay",
      "inspector",
    ]);
  });

  it("collapses duration to zero under reduced motion", () => {
    const normal = resolveMotion("sceneEnter", false);
    const reduced = resolveMotion("sceneEnter", true);

    expect(normal.duration).toBeGreaterThan(0);
    expect(reduced.duration).toBe(0);
    expect(reduced.reduced).toBe(true);
    // Easing is preserved so consumers can still reach the final state.
    expect(reduced.easing).toBe(normal.easing);
  });

  it("clamps progress helpers to their documented ranges", () => {
    expect(progressToOpacity(-1)).toBe(0);
    expect(progressToOpacity(0.5)).toBe(0.5);
    expect(progressToOpacity(2)).toBe(1);

    expect(progressToOffset(0)).toBe(12);
    expect(progressToOffset(1)).toBe(0);
    expect(progressToOffset(5)).toBe(0);
  });
});
