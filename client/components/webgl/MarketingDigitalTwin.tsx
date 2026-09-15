import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Line, Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { TrafficParticles } from './TrafficParticles';

interface TwinNode {
  id: string;
  label: string;
  type: 'campaign' | 'asset' | 'product';
  activityLevel: number;
}

interface TwinEdge {
  source: string;
  target: string;
  type: string;
}

interface TwinSnapshot {
  nodes: TwinNode[];
  edges: TwinEdge[];
}

export function MarketingDigitalTwin() {
  const [snapshot, setSnapshot] = useState<TwinSnapshot | null>(null);

  useEffect(() => {
    fetch('/api/marketing/twin/snapshot')
      .then(res => res.json())
      .then(data => setSnapshot(data))
      .catch(console.error);
  }, []);

  if (!snapshot) return null;

  return (
    <group>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      <TwinGraph nodes={snapshot.nodes} edges={snapshot.edges} />
    </group>
  );
}

function TwinGraph({ nodes, edges }: { nodes: TwinNode[], edges: TwinEdge[] }) {
  // Simple force-directed-like or random positioning
  const nodePositions = useMemo(() => {
    const posMap = new Map<string, THREE.Vector3>();
    nodes.forEach((node, i) => {
      // Golden spiral distribution for simplicity
      const phi = Math.acos(1 - 2 * (i + 0.5) / nodes.length);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const radius = 10;
      
      posMap.set(node.id, new THREE.Vector3(
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(phi)
      ));
    });
    return posMap;
  }, [nodes]);

  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  const getColor = (type: string) => {
    switch (type) {
      case 'campaign': return '#3b82f6'; // blue
      case 'product': return '#10b981'; // green
      case 'asset': return '#f59e0b'; // yellow
      default: return '#ffffff';
    }
  };

  const getSize = (type: string, activityLevel: number) => {
    const base = type === 'campaign' ? 1 : type === 'product' ? 1.5 : 0.6;
    return base * (1 + activityLevel / 100);
  };

  return (
    <group ref={groupRef}>
      {/* Nodes */}
      {nodes.map(node => {
        const pos = nodePositions.get(node.id) || new THREE.Vector3();
        const size = getSize(node.type, node.activityLevel);
        const color = getColor(node.type);
        
        return (
          <group key={node.id} position={pos}>
            <Sphere args={[size, 32, 32]}>
              <meshStandardMaterial 
                color={color}
                emissive={color}
                emissiveIntensity={0.2}
                transparent
                opacity={0.8}
              />
            </Sphere>
            <Billboard>
              <Html transform distanceFactor={30} zIndexRange={[100, 0]}>
                <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded border border-white/10 text-xs font-mono text-white whitespace-nowrap select-none pointer-events-none">
                  <div className="font-bold">{node.label}</div>
                  <div className="text-[10px] text-white/50">{node.type} | act: {Math.round(node.activityLevel)}</div>
                </div>
              </Html>
            </Billboard>
          </group>
        );
      })}

      {/* Edges */}
      {edges.map((edge, i) => {
        const sourcePos = nodePositions.get(edge.source);
        const targetPos = nodePositions.get(edge.target);
        if (!sourcePos || !targetPos) return null;

        return (
          <Line
            key={`edge-${i}`}
            points={[sourcePos, targetPos]}
            color="#ffffff"
            lineWidth={0.5}
            transparent
            opacity={0.2}
          />
        );
      })}

      {/* Traffic Particles */}
      <TrafficParticles edges={edges} nodePositions={nodePositions} />
    </group>
  );
}
