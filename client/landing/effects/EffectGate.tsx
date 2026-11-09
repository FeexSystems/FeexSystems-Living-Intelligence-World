import {
  Component,
  Suspense,
  lazy,
  useMemo,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from "react";
import { useEffectCapabilities, type EffectCapabilities } from "./capabilities";
import { useSceneVisibility } from "./SceneVisibilityContext";

/**
 * EffectGate
 *
 * Single lazy-loading, capability-aware mount point for every vendored
 * Hyperiux effect (`client/components/effects/<name>/index.tsx`).
 *
 * - Code-splits each effect into its own chunk via import.meta.glob.
 * - Mounts only when the surrounding CinematicScene reports `near`
 *   (or immediately when used outside a scene, e.g. nav/cursor chrome).
 * - Honors prefers-reduced-motion, saveData, coarse pointers, low-power
 *   devices, and WebGL availability.
 * - Decorative effects are rendered inside pointer-events-none layers by
 *   callers; EffectGate itself never intercepts input.
 */

type AnyComponent = ComponentType<Record<string, unknown>>;

const modules = import.meta.glob<{ default: AnyComponent }>(
  "../../components/effects/*/index.tsx"
);

/** Effects that require a real WebGL(2) context (verified from vendored source:
 *  THREE.WebGLRenderer, getContext("webgl2"), or @react-three/fiber Canvas). */
const WEBGL_EFFECTS = new Set([
  "arc-light",
  "ascii-band",
  "aurora-ribbon",
  "dotted-trail",
  "fractal-glass",
  "interactive-blur-reveal",
  "metallic-button",
  "milky-way",
  "moss-grid",
  "numeric-tunnel",
  "opal-flow",
  "spider-particles",
  "split-canvas",
]);

const lazyCache = new Map<string, LazyExoticComponent<AnyComponent>>();

function getLazyEffect(
  name: string,
  exportName?: string
): LazyExoticComponent<AnyComponent> | null {
  const path = `../../components/effects/${name}/index.tsx`;
  const loader = modules[path];
  if (!loader) return null;
  const cacheKey = exportName ? `${name}#${exportName}` : name;
  let component = lazyCache.get(cacheKey);
  if (!component) {
    component = lazy(() =>
      loader().then((mod: Record<string, unknown> & { default?: AnyComponent }) => {
        const exported =
          exportName && exportName !== "default"
            ? (mod as Record<string, unknown>)[exportName]
            : mod.default;
        return { default: (exported ?? mod.default) as AnyComponent };
      })
    );
    lazyCache.set(cacheKey, component);
  }
  return component;
}

export type EffectGateFlag =
  | "reducedMotion"
  | "saveData"
  | "coarsePointer"
  | "lowPower"
  | "webgl";

export interface EffectProps {
  /** Vendored effect folder name, e.g. "metallic-button". */
  name: string;
  /** Rendered instead of the effect when gated off, still loading, or on error. */
  fallback?: ReactNode;
  /** Extra capability gates beyond the defaults. */
  gate?: EffectGateFlag[];
  /**
   * Override scene-visibility gating. When omitted, effects inside a
   * CinematicScene mount on `near`; outside a scene they always mount.
   */
  active?: boolean;
  className?: string;
  /** Arbitrary props forwarded to the effect component. */
  [key: string]: unknown;
  /** Named export to load instead of the default (for patched reusable pieces). */
  exportName?: string;
}

function isBlocked(
  name: string,
  caps: EffectCapabilities,
  extraGates: EffectGateFlag[]
): boolean {
  if (WEBGL_EFFECTS.has(name) && !caps.webgl) return true;
  // Heavy GPU scenes are also skipped on low-power devices.
  if (WEBGL_EFFECTS.has(name) && caps.lowPower) return true;
  return extraGates.some((flag) => {
    switch (flag) {
      case "reducedMotion":
        return caps.reducedMotion;
      case "saveData":
        return caps.saveData;
      case "coarsePointer":
        return caps.coarsePointer;
      case "lowPower":
        return caps.lowPower;
      case "webgl":
        return !caps.webgl;
      default:
        return false;
    }
  });
}

class EffectErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Effect({
  name,
  fallback = null,
  gate = [],
  active,
  className,
  exportName,
  ...props
}: EffectProps) {
  const caps = useEffectCapabilities();
  const scene = useSceneVisibility();
  const sceneActive = active ?? (scene ? scene.near : true);

  const Lazy = useMemo(() => getLazyEffect(name, exportName), [name, exportName]);

  const blocked =
    !sceneActive || !Lazy || isBlocked(name, caps, gate);

  if (blocked) return <>{fallback}</>;

  return (
    <EffectErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Lazy className={className} {...props} />
      </Suspense>
    </EffectErrorBoundary>
  );
}

export default Effect;
