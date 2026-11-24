import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { resolveMorphIndices, PIPELINE_ARKIT_ORDER } from './arkitMorphMapper';

const DEFAULT_GLB_PATH = '/characters/feex_sovereign/feex_sovereign.glb';

function FeexSovereignPlaceholder({ blendshapeWeightsRef, idleClipName = 'Idles_Breathing' }) {
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

    // Simulated Idles_Breathing subtle vertical/chest-like sway
    if (rootRef.current) {
      rootRef.current.position.y = Math.sin(t * 2.1) * 0.015;
    }

    // Map key ARKit weights onto placeholder parts to verify Mock Feed / live updates
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

function FeexSovereignModel({
  glbPath = DEFAULT_GLB_PATH,
  blendshapeWeightsRef,
  idleClipName = 'Idles_Breathing',
}) {
  const { scene } = useGLTF(glbPath);
  const morphMeshesRef = useRef([]);
  const indexMapsRef = useRef([]);

  useEffect(() => {
    const found = [];
    scene.traverse((obj) => {
      if (obj.isMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
        found.push(obj);
      }
    });
    morphMeshesRef.current = found;
    indexMapsRef.current = found.map((m) => resolveMorphIndices(m.morphTargetDictionary, PIPELINE_ARKIT_ORDER));

    // Preserve v2 material normalization on the loaded GLB
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const mat = child.material;
        if (mat && mat.name) {
          if (mat.name.includes('SyntheticSkin')) {
            mat.roughness = 0.42;
            mat.metalness = 0.08;
          }
          if (mat.name.includes('Cyber_Honeycomb') || mat.name.includes('Obsidian')) {
            mat.roughness = 0.12;
            mat.metalness = 0.95;
            mat.clearcoat = 1.0;
            mat.clearcoatRoughness = 0.08;
          }
          if (mat.name.includes('Dreadlocks_Cards')) {
            mat.alphaToCoverage = true;
            mat.transparent = false;
            mat.depthWrite = true;
            mat.side = THREE.DoubleSide;
          }
        }
      }
    });
  }, [scene]);

  useFrame(() => {
    const weights = blendshapeWeightsRef?.current;
    if (!weights) return;

    morphMeshesRef.current.forEach((mesh, i) => {
      const influences = mesh.morphTargetInfluences;
      const indexMap = indexMapsRef.current[i] || {};
      for (const [shapeName, score] of Object.entries(weights)) {
        const idx = indexMap[shapeName];
        if (idx !== undefined) {
          // Gentle exponential dampening to filter raw camera jitter
          influences[idx] = THREE.MathUtils.lerp(influences[idx], score, 0.25);
        }
      }
    });
  });

  return <primitive object={scene} name="FeexSovereignGLTF" userData={{ idleClipName }} />;
}

export default function FeexSovereign({
  usePlaceholder = false,
  glbPath = DEFAULT_GLB_PATH,
  blendshapeWeightsRef,
  idleClipName = 'Idles_Breathing',
}) {
  if (usePlaceholder) {
    return (
      <FeexSovereignPlaceholder
        blendshapeWeightsRef={blendshapeWeightsRef}
        idleClipName={idleClipName}
      />
    );
  }

  return (
    <FeexSovereignModel
      glbPath={glbPath}
      blendshapeWeightsRef={blendshapeWeightsRef}
      idleClipName={idleClipName}
    />
  );
}

useGLTF.preload(DEFAULT_GLB_PATH);
