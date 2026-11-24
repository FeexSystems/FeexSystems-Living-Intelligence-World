import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Procedural stand-in for the FeexSovereign GLB. Drives simple part transforms
 * from the same weightsRef dictionary the real morph-target mapper consumes,
 * so Mock Feed / live capture can be exercised before the .glb exists.
 * All geometry/materials are disposed on unmount.
 */
export function FeexSovereignPlaceholder({ blendshapeWeightsRef, idleClipName = 'Idles_Breathing' }) {
  const headRef = useRef(null);
  const leftEyeRef = useRef(null);
  const rightEyeRef = useRef(null);
  const jawRef = useRef(null);
  const rootRef = useRef(null);

  const { geometries, materials } = useMemo(() => {
    const headGeo = new THREE.BoxGeometry(0.32, 0.38, 0.28);
    const eyeGeo = new THREE.SphereGeometry(0.032, 12, 12);
    const jawGeo = new THREE.BoxGeometry(0.22, 0.08, 0.22);

    const headMat = new THREE.MeshStandardMaterial({ color: '#4f7cac', roughness: 0.5 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#f4f6f9', roughness: 0.2 });
    const jawMat = new THREE.MeshStandardMaterial({ color: '#3b5d82', roughness: 0.6 });

    return {
      geometries: [headGeo, eyeGeo, jawGeo],
      materials: [headMat, eyeMat, jawMat],
    };
  }, []);

  useEffect(() => {
    return () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    };
  }, [geometries, materials]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const weights = blendshapeWeightsRef?.current || {};

    // Simulated Idles_Breathing subtle sway
    if (rootRef.current) {
      rootRef.current.position.y = Math.sin(t * 2.1) * 0.015;
    }

    const blinkL = weights.eyeBlinkLeft ?? 0;
    const blinkR = weights.eyeBlinkRight ?? 0;
    const jawOpen = weights.jawOpen ?? 0;
    const browUp = weights.browInnerUp ?? 0;

    if (leftEyeRef.current) {
      leftEyeRef.current.scale.y = Math.max(0.08, 1 - blinkL * 0.92);
    }
    if (rightEyeRef.current) {
      rightEyeRef.current.scale.y = Math.max(0.08, 1 - blinkR * 0.92);
    }
    if (jawRef.current) {
      jawRef.current.position.y = -0.14 - jawOpen * 0.06;
    }
    if (headRef.current) {
      const targetPitch = -browUp * 0.08;
      headRef.current.rotation.x = THREE.MathUtils.lerp(
        headRef.current.rotation.x,
        targetPitch,
        Math.min(1, delta * 12)
      );
    }
  });

  return (
    <group ref={rootRef} name="FeexSovereignPlaceholder" userData={{ idleClipName }}>
      <mesh ref={headRef} geometry={geometries[0]} material={materials[0]} position={[0, 1.55, 0]} />
      <mesh ref={leftEyeRef} geometry={geometries[1]} material={materials[1]} position={[-0.075, 1.61, 0.14]} />
      <mesh ref={rightEyeRef} geometry={geometries[1]} material={materials[1]} position={[0.075, 1.61, 0.14]} />
      <mesh ref={jawRef} geometry={geometries[2]} material={materials[2]} position={[0, 1.41, 0.02]} />
    </group>
  );
}
