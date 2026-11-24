import { ContactShadows, Environment, Lightformer, Sparkles } from "@react-three/drei";
import * as THREE from "three";

/**
 * HumanoidLighting
 *
 * Deliberate three-point lighting for the hero character plus a restrained
 * environment: a grounded contact shadow, a faint signal accent and sparse
 * dust motes. Nothing here competes with the subject — no bloom, no bright
 * particles in front of the face.
 */
export function HumanoidLighting() {
  return (
    <>
      {/* Key light — neutral white, defines body and face. */}
      <directionalLight
        position={[2.6, 3.4, 3.2]}
        intensity={3.4}
        color="#f2f2ef"
      />
      {/* Fill light — reveals the shadow-side anatomy. */}
      <directionalLight
        position={[-3.2, 1.6, 2.2]}
        intensity={1.3}
        color="#8f8f8c"
      />
      {/* Rim light — cool silver edge, separates silhouette from the void. */}
      <spotLight
        position={[-1.4, 3.8, -3.4]}
        angle={0.55}
        penumbra={0.8}
        intensity={7}
        color="#d4d4d0"
        distance={12}
      />
      <ambientLight intensity={0.9} color="#9c9c98" />
      <hemisphereLight args={["#3d3d3a", "#050505", 0.55]} />

      {/* Baked studio environment — gives the metallic/obsidian PBR
          materials something real to reflect. Static single bake. */}
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#050505"]} />
        <Lightformer
          intensity={3.2}
          position={[0, 4, 3]}
          rotation-x={Math.PI / 3}
          scale={[5, 2.5, 1]}
          color="#f2f2ef"
        />
        <Lightformer
          intensity={1.4}
          position={[-4, 2, 1]}
          rotation-y={Math.PI / 3}
          scale={[3, 1.6, 1]}
          color="#8f8f8c"
        />
        <Lightformer
          intensity={3.6}
          position={[0, 3.5, -4]}
          scale={[4, 2, 1]}
          color="#d4d4d0"
        />
        <Lightformer
          intensity={0.5}
          position={[0, -1.5, 2]}
          rotation-x={-Math.PI / 3}
          scale={[7, 3, 1]}
          color="#2e2a24"
        />
      </Environment>

      {/* Grounding: soft contact shadow + faint platform ring. */}
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.72}
        scale={7}
        blur={2.6}
        far={3.2}
        resolution={512}
        color="#000000"
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <ringGeometry args={[1.15, 1.18, 96]} />
        <meshBasicMaterial
          color="#fafafa"
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.003, 0]}>
        <circleGeometry args={[1.15, 96]} />
        <meshBasicMaterial
          color="#05070a"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Sparse signal dust — kept behind the character plane. */}
      <Sparkles
        count={70}
        scale={[9, 5.5, 4]}
        position={[0, 2.4, -1.5]}
        size={1.6}
        speed={0.18}
        opacity={0.4}
        color="#c9c9c4"
      />
    </>
  );
}
