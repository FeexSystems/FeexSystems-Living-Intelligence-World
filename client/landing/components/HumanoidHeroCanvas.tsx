import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EILProjectionSlot } from "@/components/sovereign/EILProjectionSlot";
import { EIL_PROJECTION_ENABLED } from "../../lib/eil/projectionConfig";
import { useEILAgentRuntime } from "../../lib/eil/useEILAgentRuntime";
import {
  resolvePresentationState,
  type PresentationIntent,
} from "../../../packages/feex-eil/renderer/presentation-state";
import { DataSourceBadge } from "../../../packages/feex-eil/renderer/DataSourceBadge";
import { heroAwareIntent } from "./humanoidHeroIntent";

/**
 * G5 landing showcase — lazy WebGL layer. Only imported when the hero
 * scene is visible on a capable device (see HumanoidHeroOverlay gate).
 *
 * The humanoid is a read-only projection of ephemeral local EIL state.
 * A slow IDLE → THINKING → IDLE demo cycle is driven through the real
 * planner/adapter so every rendered frame corresponds to a committed,
 * contract-valid AgentStateEvent. No perception is real: the badge is
 * SIMULATED and there is no physical actuation path.
 *
 * OpenJarvis is shown below as an adoption architecture preview only.
 * No OpenJarvis package, service, model provider, memory store, or agent
 * endpoint is connected by this landing-page component. The labels are
 * static disclosure, not runtime telemetry or evidence of deployment.
 *
 * React hooks stay outside <Canvas>: the runtime and demo cycle live in
 * this component; the Canvas subtree receives only the committed event.
 */

const CYCLE_MS = 14000;
const THINK_MS = 2600;

export default function HumanoidHeroCanvas({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const runtime = useEILAgentRuntime("eil-hero");
  const [intent, setIntent] = useState<PresentationIntent | null>(null);

  // Phase 4 — bounded cursor-presence intent. Passive window listener;
  // the overlay is pointer-events-none so hero controls stay unaffected.
  // Intent only reaches the presentation label; agent state is untouched.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const next = heroAwareIntent(
        e.clientX,
        e.clientY,
        window.innerWidth,
        window.innerHeight,
      );
      setIntent((prev) =>
        prev?.kind === next?.kind ? prev : next,
      );
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Presentation-layer label only — the scene itself still renders the
  // committed AgentStateEvent; this resolves the 9-state display vocabulary
  // for the HUD badge.
  const presentation = resolvePresentationState(
    runtime.event?.state ?? null,
    intent,
  );

  useEffect(() => {
    let revertTimer: ReturnType<typeof setTimeout> | undefined;
    const cycle = setInterval(() => {
      runtime.applySignals({ speechStatus: "idle", isLoading: true });
      revertTimer = setTimeout(() => {
        runtime.applySignals({ speechStatus: "idle", isLoading: false });
      }, THINK_MS);
    }, CYCLE_MS);
    return () => {
      clearInterval(cycle);
      if (revertTimer) clearTimeout(revertTimer);
    };
  }, [runtime]);

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 1.4, 3.4], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 4, 3]} intensity={0.9} color="#ffffff" />
          <pointLight position={[-3, 1, -2]} intensity={0.5} color="#8cf5d2" />
          <EILProjectionSlot
            event={runtime.event ?? null}
            enabled={EIL_PROJECTION_ENABLED}
            position={[1.9, -0.55, 0]}
            accentColor="#fafafa"
            reducedMotion={reducedMotion}
          />
        </Suspense>
      </Canvas>

      <div
        className="absolute bottom-24 left-5 z-10 w-[min(18rem,calc(100%-2.5rem))] border border-white/15 bg-black/75 p-3 font-mono text-[9px] tracking-[0.12em] text-white/75 shadow-2xl backdrop-blur-md sm:left-8 sm:w-72"
        data-testid="openjarvis-adoption-panel"
      >
        <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-2">
          <span className="font-semibold text-white">OPENJARVIS // ADOPTION PREVIEW</span>
          <DataSourceBadge label="SIMULATED" />
        </div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-white/45">RUNTIME CONNECTION</span>
          <span className="text-amber-200">NOT CONNECTED</span>
        </div>
        <div className="grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-1.5 leading-relaxed">
          <span className="text-white/40">INTELLIGENCE</span>
          <span>OPENJARVIS / PROPOSED</span>
          <span className="text-white/40">ROUTING</span>
          <span>FEEX NAVIGATOR / POLICY GATE</span>
          <span className="text-white/40">MEMORY</span>
          <span>CONTEXTUAL / ISOLATED</span>
          <span className="text-white/40">EVIDENCE</span>
          <span>FABRIC ANCHOR / NOT CONNECTED</span>
          <span className="text-white/40">WORLD MODEL</span>
          <span className="text-emerald-200">CANONICAL / READ ONLY</span>
          <span className="text-white/40">EIL / ACTUATION</span>
          <span>LOCAL SIMULATION / DISABLED</span>
        </div>
        <div className="mt-2 border-t border-white/10 pt-2 text-[8px] leading-relaxed text-white/45">
          NO LIVE AGENT REQUESTS · NO PERSISTENCE · NO HARDWARE CONTROL
        </div>
      </div>

      <div className="absolute bottom-24 right-8 flex items-center gap-2 font-mono text-[9px] tracking-widest text-white/60">
        <DataSourceBadge label="SIMULATED" />
        <span>EIL HUMANOID // {presentation} // LOCAL PROJECTION // NO PHYSICAL ACTUATION</span>
      </div>
    </div>
  );
}
