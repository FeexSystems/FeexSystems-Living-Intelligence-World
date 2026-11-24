import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import {
  HUMANOID_CAMERA,
  HUMANOID_PALETTE,
  type HumanoidState,
} from "../../config/humanoid.config";
import { HumanoidModel } from "./HumanoidModel";
import { HumanoidLighting } from "./HumanoidLighting";
import {
  HumanoidErrorBoundary,
  HumanoidFallback,
} from "./HumanoidFallback";

/**
 * HumanoidStage
 *
 * Owns the WebGL lifecycle for the Scene 01 character: renderer canvas,
 * camera, pointer gaze source and render gating. The DOM overlay (headline,
 * inspector, CTAs) lives in HumanoidHeroScene — this component renders only
 * the 3D stage and reports coarse status upward.
 */

interface HumanoidStageProps {
  state: HumanoidState;
  clip: string | null;
  /** False pauses the render loop while the scene is off-screen. */
  visible: boolean;
  reducedMotion: boolean;
  onModelLoaded?: () => void;
  onModelError?: (reason: string) => void;
}

type PointerRef = React.MutableRefObject<{ x: number; y: number }>;

/** Converts DOM pointer position into the -1..1 gaze coordinate space. */
function PointerProbe({ pointer }: { pointer: PointerRef }) {
  useFrame((state) => {
    // state.pointer is already normalised device coordinates.
    pointer.current.x = state.pointer.x;
    pointer.current.y = state.pointer.y;
  });
  return null;
}

/** Points the default camera at the character's chest line, once. */
function CameraTarget() {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.lookAt(
      HUMANOID_CAMERA.target[0],
      HUMANOID_CAMERA.target[1],
      HUMANOID_CAMERA.target[2]
    );
  }, [camera]);
  return null;
}

/**
 * With frameloop="never" nothing renders after suspense resolves unless the
 * canvas is explicitly invalidated. This probe forces exactly one frame when
 * the model reports ready — the static reduced-motion / off-screen frame.
 */
function InvalidateOnReady({ ready }: { ready: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  const fired = useRef(false);
  useEffect(() => {
    if (ready && !fired.current) {
      fired.current = true;
      invalidate();
    }
  }, [ready, invalidate]);
  return null;
}

function StageContent({
  state,
  clip,
  pointer,
  reducedMotion,
  modelReady,
  onModelLoaded,
  onModelError,
}: HumanoidStageProps & { pointer: PointerRef; modelReady: boolean }) {
  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={HUMANOID_CAMERA.fov}
        position={HUMANOID_CAMERA.position}
        near={0.1}
        far={60}
      />
      <CameraTarget />
      <PointerProbe pointer={pointer} />
      <InvalidateOnReady ready={modelReady} />
      <HumanoidLighting />
      <HumanoidModel
        state={state}
        clip={reducedMotion ? null : clip}
        pointer={pointer.current}
        onLoaded={onModelLoaded}
        onError={(reason) => onModelError?.(reason)}
      />
    </>
  );
}

export function HumanoidStage(props: HumanoidStageProps) {
  const { visible, reducedMotion, onModelLoaded, onModelError } = props;
  const [failed, setFailed] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const pointer = useRef({ x: 0, y: 0 });

  const handleError = (reason: string) => {
    setFailed(reason);
    onModelError?.(reason);
  };

  const handleLoaded = () => {
    setModelReady(true);
    onModelLoaded?.();
  };

  // The render loop runs only while the scene is on-screen and motion is
  // allowed. Every other case pins frameloop to 'never' and relies on
  // InvalidateOnReady for the single static frame.
  const frameloop = useMemo(() => {
    if (failed || reducedMotion || !visible) return "never" as const;
    return "always" as const;
  }, [failed, reducedMotion, visible]);

  if (failed) {
    return <HumanoidFallback reason={failed} />;
  }

  return (
    <div
      data-testid="humanoid-stage"
      className="absolute inset-0"
      aria-hidden="true"
    >
      <HumanoidErrorBoundary onError={handleError}>
        <Canvas
          frameloop={frameloop}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          camera={{
            fov: HUMANOID_CAMERA.fov,
            near: 0.1,
            far: 60,
            position: HUMANOID_CAMERA.position,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(new THREE.Color(HUMANOID_PALETTE.void), 0);
          }}
        >
          <color attach="background" args={[HUMANOID_PALETTE.void]} />
          <Suspense fallback={null}>
            <StageContent
              state={props.state}
              clip={props.clip}
              pointer={pointer}
              visible={props.visible}
              reducedMotion={props.reducedMotion}
              modelReady={modelReady}
              onModelLoaded={handleLoaded}
              onModelError={handleError}
            />
          </Suspense>
        </Canvas>
      </HumanoidErrorBoundary>
    </div>
  );
}
