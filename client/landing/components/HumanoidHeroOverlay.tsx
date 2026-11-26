import { DataSourceBadge } from "../../../packages/feex-eil/renderer/DataSourceBadge";
import { useSceneVisibility } from "../effects/SceneVisibilityContext";
import { EIL_PROJECTION_ENABLED } from "../../lib/eil/projectionConfig";

/**
 * EIL / OpenJarvis disclosure — DOM-only, non-3D.
 *
 * FEEX-SORL Phase 1 (one-Canvas rule): the second landing-page WebGL
 * layer (HumanoidHeroCanvas) was removed. The EIL humanoid projection
 * is consolidated into the Scene 01 character adapter in Phase 5; until
 * then this component renders ONLY the static disclosure panel and the
 * SIMULATED badge. No Canvas, no runtime events, no agent requests.
 *
 * Mount requires the scene to be visible and the EIL projection kill
 * switch to be enabled. Any failure leaves the cinematic scene untouched.
 */
export function HumanoidHeroOverlay() {
  const visibility = useSceneVisibility();

  if (!EIL_PROJECTION_ENABLED || visibility?.visible !== true) return null;

  return (
    <>
      <div
        className="absolute bottom-24 left-5 z-10 w-72 max-w-[calc(100%_-_2.5rem)] border border-white/15 bg-black/75 p-3 font-mono text-[9px] tracking-[0.12em] text-white/75 shadow-2xl backdrop-blur-md sm:left-8 sm:w-72"
        data-testid="openjarvis-adoption-panel"
      >
        <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-2">
          <span className="font-semibold text-white">OPENJARVIS // ADOPTION PREVIEW</span>
          <DataSourceBadge label="SIMULATED" />
        </div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-white/45">RUNTIME CONNECTION</span>
          <span className="text-white/70">NOT CONNECTED</span>
        </div>
        <div className="grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-1.5 leading-relaxed">
          <span className="text-white/50">INTELLIGENCE</span>
          <span>OPENJARVIS / PROPOSED</span>
          <span className="text-white/50">ROUTING</span>
          <span>FEEX NAVIGATOR / POLICY GATE</span>
          <span className="text-white/50">MEMORY</span>
          <span>CONTEXTUAL / ISOLATED</span>
          <span className="text-white/50">EVIDENCE</span>
          <span>FABRIC ANCHOR / NOT CONNECTED</span>
          <span className="text-white/50">WORLD MODEL</span>
          <span className="text-white/70">CANONICAL / READ ONLY</span>
          <span className="text-white/50">EIL / ACTUATION</span>
          <span>LOCAL SIMULATION / DISABLED</span>
        </div>
        <div className="mt-2 border-t border-white/10 pt-2 text-[8px] leading-relaxed text-white/45">
          NO LIVE AGENT REQUESTS · NO PERSISTENCE · NO HARDWARE CONTROL
        </div>
      </div>

      <div className="absolute bottom-24 right-8 flex items-center gap-2 font-mono text-[9px] tracking-widest text-white/60">
        <DataSourceBadge label="SIMULATED" />
        <span>EIL HUMANOID // LOCAL PROJECTION // NO PHYSICAL ACTUATION</span>
      </div>
    </>
  );
}
