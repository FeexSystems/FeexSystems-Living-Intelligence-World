import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TrafficParticlesProps {
  edges: { source: string; target: string }[];
  nodePositions: Map<string, THREE.Vector3>;
}

export function TrafficParticles({ edges, nodePositions }: TrafficParticlesProps) {
  const count = edges.length * 3; // 3 particles per edge
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const edgeIndex = i % edges.length;
      const edge = edges[edgeIndex];
      const source = nodePositions.get(edge.source);
      const target = nodePositions.get(edge.target);
      
      if (source && target) {
        arr.push({
          source,
          target,
          progress: Math.random(), // Start at random positions along the path
          speed: 0.002 + Math.random() * 0.003,
        });
      }
    }
    return arr;
  }, [edges, nodePositions, count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    
    particles.forEach((particle, i) => {
      particle.progress += particle.speed;
      if (particle.progress > 1) {
        particle.progress = 0; // Loop back
      }

      // Linear interpolation between source and target
      dummy.position.lerpVectors(particle.source, particle.target, particle.progress);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (particles.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
    </instancedMesh>
  );
}
