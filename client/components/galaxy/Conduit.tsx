import { useMemo, useRef, memo } from "react";
import { useFrame } from "@react-three/fiber";
import { QuadraticBezierLine, Trail } from "@react-three/drei";
import * as THREE from "three";
import type { GalaxyQuality } from "./types";
import { QUALITY_PRESETS } from "./types";

const AnimatedPulse = memo(function AnimatedPulse({
  curve,
  color,
  speed,
  size,
}: {
  curve: THREE.Curve<THREE.Vector3>;
  color: string;
  speed: number;
  size: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() * speed) % 1;
    curve.getPoint(t, ref.current.position);
  });
  return (
    <Trail width={1.2} length={6} color={color} attenuation={(t) => t * t} target={ref}>
      <mesh ref={ref}>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </Trail>
  );
});

export const Conduit = memo(function Conduit({
  start,
  end,
  isHighlighted,
  isDimmed,
  quality,
}: {
  start: [number, number, number];
  end: [number, number, number];
  isHighlighted: boolean;
  isDimmed: boolean;
  quality: GalaxyQuality;
}) {
  const preset = QUALITY_PRESETS[quality];
  const lineRef = useRef<any>(null);
  const { mid, curve } = useMemo(() => {
    const p1 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const dist = p1.distanceTo(p2);
    const m = p1.clone().lerp(p2, 0.5);
    m.y += Math.min(dist * 0.14, 2.0);
    return { mid: [m.x, m.y, m.z] as [number, number, number], curve: new THREE.QuadraticBezierCurve3(p1, m, p2) };
  }, [start, end]);

  useFrame((_, delta) => {
    if (lineRef.current?.material) {
      lineRef.current.material.dashOffset -= delta * (isHighlighted ? 4.2 : 1.6);
    }
  });

  return (
    <group>
      <QuadraticBezierLine
        ref={lineRef}
        start={start}
        end={end}
        mid={mid}
        lineWidth={isHighlighted ? 2.8 : 1.4}
        color={isHighlighted ? "#FFFFFF" : "#71717A"}
        dashed
        dashScale={2.4}
        dashSize={1.3}
        gapSize={0.75}
        transparent
        opacity={isHighlighted ? 0.95 : isDimmed ? 0.04 : 0.4}
      />
      {preset.trail && !isDimmed && (
        <AnimatedPulse
          curve={curve}
          color={isHighlighted ? "#FFFFFF" : "#A1A1AA"}
          speed={isHighlighted ? 1.35 : 0.6}
          size={isHighlighted ? 0.1 : 0.06}
        />
      )}
    </group>
  );
});
