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
      <div className="absolute bottom-24 right-8 flex items-center gap-2 font-mono text-[9px] tracking-widest text-white/60">
        <DataSourceBadge label="SIMULATED" />
        <span>EIL HUMANOID // {presentation} // LOCAL PROJECTION // NO PHYSICAL ACTUATION</span>
      </div>
    </div>
  );
}
