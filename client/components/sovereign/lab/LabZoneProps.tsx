import { Suspense, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  LAB_ASSET_FILES,
  LAB_ZONE_PROPS,
  type LabPropSpec,
} from "../../../lib/lab/lab-manifest";
import { zoneCenterToScene, type LabZone } from "../../../lib/lab/lab-zones";

/**
 * LabZoneProps — Gate 7 GLB props. Replaces procedural SignatureEquipment
 * for zones that have delivered assets (all seven). Tripo GLBs are
 * unit-normalized; `targetSize` restores real-world metres. Per-asset
 * noir tints multiply the injected M_SORL_Prop material.
 */

// Preload every prop GLB so Suspense resolves before first paint.
for (const asset of Object.values(LAB_ASSET_FILES)) {
  useGLTF.preload(asset.src);
}

const tintCache = new Map<string, THREE.Material>();

function tintedClone(scene: THREE.Object3D, tint: string | undefined) {
  const clone = scene.clone(true);
  if (!tint) return clone;
  clone.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const src = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!src) return;
    const key = `${src.uuid}|${tint}`;
    let mat = tintCache.get(key);
    if (!mat) {
      mat = (src as THREE.MeshStandardMaterial).clone();
      (mat as THREE.MeshStandardMaterial).color?.multiply(new THREE.Color(tint));
      tintCache.set(key, mat);
    }
    mesh.material = mat;
  });
  return clone;
}

interface PreparedProp {
  object: THREE.Object3D;
  /** Local-space min Y — Tripo GLBs are origin-centered, so props would
   *  otherwise sink half their height below the floor. */
  minY: number;
}

function prepareProp(scene: THREE.Object3D, tint: string | undefined): PreparedProp {
  const clone = tintedClone(scene, tint);
  const box = new THREE.Box3().setFromObject(clone);
  return { object: clone, minY: box.min.y };
}

function Prop({ spec, position }: { spec: LabPropSpec; position: [number, number, number] }) {
  const file = LAB_ASSET_FILES[spec.asset];
  const { scene } = useGLTF(file.src);
  const { object, minY } = useMemo(
    () => prepareProp(scene, spec.tint),
    [scene, spec.tint]
  );
  const scale = spec.scale ?? file.targetSize;
  return (
    <group position={position}>
      <primitive
        object={object}
        rotation={[0, spec.rotY ?? 0, 0]}
        scale={scale}
        position={[0, -minY * scale, 0]}
      />
    </group>
  );
}

export function LabZoneProps({ zone }: { zone: LabZone }) {
  const props = LAB_ZONE_PROPS[zone.id];
  if (!props?.length) return null;
  const [cx, cz] = zoneCenterToScene(zone.center);
  return (
    <group name={`sorl-props-${zone.id}`}>
      {props.map((spec, i) => (
        <Prop
          key={`${zone.id}-${spec.asset}-${i}`}
          spec={spec}
          position={[cx + spec.offset[0], spec.offset[1], cz + spec.offset[2]]}
        />
      ))}
    </group>
  );
}

export function LabZonePropsBoundary({ zone }: { zone: LabZone }) {
  return (
    <Suspense fallback={null}>
      <LabZoneProps zone={zone} />
    </Suspense>
  );
}
