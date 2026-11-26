import type { ReactNode } from "react";
import { Component } from "react";
import { HUMANOID_STATUS } from "../../config/humanoid.config";

/**
 * HumanoidFallback
 *
 * Honest degraded presentation: shown when WebGL is unavailable, the GLB
 * fails to load, or the device is too constrained. It is a labelled static
 * frame — never a fake character and never silent about its state.
 */
export function HumanoidFallback({ reason }: { reason?: string }) {
  return (
    <div
      data-testid="humanoid-fallback"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      role="img"
      aria-label="FEEX humanoid visual simulation unavailable"
    >
      <div className="flex flex-col items-center gap-3 border border-white/10 bg-black/60 px-8 py-6 backdrop-blur-md">
        <div className="h-24 w-16 rounded-t-full border border-white/15 bg-gradient-to-b from-white/10 to-transparent" aria-hidden="true" />
        <p className="font-mono text-[10px] tracking-[0.3em] text-white/60">
          {HUMANOID_STATUS.simulation}
        </p>
        <p className="font-mono text-[10px] tracking-[0.3em] text-white/60">
          {HUMANOID_STATUS.actuation}
        </p>
        {reason && (
          <p className="font-mono text-[9px] tracking-widest text-white/55">
            {reason}
          </p>
        )}
      </div>
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  onError: (reason: string) => void;
}
interface BoundaryState {
  failed: boolean;
}

/** Minimal error boundary so a GLB/WebGL failure degrades to the fallback. */
export class HumanoidErrorBoundary extends Component<
  BoundaryProps,
  BoundaryState
> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(
      error instanceof Error ? error.message : "RENDER_ERROR"
    );
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
