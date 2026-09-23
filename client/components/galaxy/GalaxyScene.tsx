import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CameraControls,
  GizmoHelper,
  GizmoViewport,
  Grid,
  Stars,
  Sparkles as DreiSparkles,
  AdaptiveDpr,
  Bvh,
  Preload,
} from "@react-three/drei";
import * as THREE from "three";
import type { GalaxyQuality, GraphData, GraphNode } from "./types";
import { QUALITY_PRESETS } from "./types";
import { computeForceLayout } from "./layout";
import WorldNode from "./WorldNode";
import { Conduit } from "./Conduit";
import { GalaxyEffects } from "./GalaxyEffects";

function HolographicFloorRadar() {
  const sweepRef = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    if (sweepRef.current) sweepRef.current.rotation.z -= delta * 0.85;
  });
  return (
    <group position={[0, -9.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[19.8, 20, 64]} />
        <meshBasicMaterial color="#FFFFFF" opacity={0.25} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[9.9, 10, 64]} />
        <meshBasicMaterial color="#A1A1AA" opacity={0.15} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={sweepRef}>
        <ringGeometry args={[0.5, 20, 32, 1, 0, Math.PI / 4]} />
        <meshBasicMaterial color="#FFFFFF" opacity={0.06} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function GalaxyScene({
  data,
  selectedNode,
  searchQuery,
  domainFilter,
  autoRotate,
  quality,
  onSelectNode,
}: {
  data: GraphData;
  selectedNode: GraphNode | null;
  searchQuery: string;
  domainFilter: string;
  autoRotate: boolean;
  quality: GalaxyQuality;
  onSelectNode: (node: GraphNode | null) => void;
}) {
  const cameraControlsRef = useRef<CameraControls>(null);
  const preset = QUALITY_PRESETS[quality];

  const positionedNodes = useMemo(
    () => computeForceLayout(data.nodes, data.links, 90),
    [data.nodes, data.links]
  );

  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    positionedNodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [positionedNodes]);

  const visibleNodes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return positionedNodes.filter((n) => {
      const domainOk = !domainFilter || domainFilter === "all" || n.domain === domainFilter;
      if (!domainOk) return false;
      if (!q) return true;
      return (
        n.name.toLowerCase().includes(q) ||
        (n.repository && n.repository.toLowerCase().includes(q)) ||
        (n.domain && n.domain.toLowerCase().includes(q)) ||
        (n.language && n.language.toLowerCase().includes(q))
      );
    });
  }, [positionedNodes, searchQuery, domainFilter]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  useEffect(() => {
    if (selectedNode?.position && cameraControlsRef.current) {
      const [x, y, z] = selectedNode.position;
      // re-resolve from latest layout
      const live = nodeMap.get(selectedNode.id);
      const px = live?.position?.[0] ?? x;
      const py = live?.position?.[1] ?? y;
      const pz = live?.position?.[2] ?? z;
      const dist = selectedNode.type === "project" ? 7 : 5;
      cameraControlsRef.current.setLookAt(px, py + 2, pz + dist, px, py, pz, true);
    }
  }, [selectedNode, nodeMap]);

  useFrame((_, delta) => {
    if (autoRotate && cameraControlsRef.current && !selectedNode) {
      cameraControlsRef.current.azimuthAngle += 0.12 * delta;
    }
  });

  const links = data.links.slice(0, preset.maxLinks);

  return (
    <>
      <AdaptiveDpr pixelated />
      <ambientLight intensity={0.65} />
      <pointLight position={[22, 18, 18]} intensity={1.4} color="#FFFFFF" />
      <pointLight position={[-18, -14, -16]} intensity={0.7} color="#E4E4E7" />
      <pointLight position={[0, 24, 0]} intensity={0.5} color="#FFFFFF" />

      <Stars radius={130} depth={70} count={preset.stars} factor={4} saturation={0} fade speed={0.7} />
      <DreiSparkles
        count={preset.sparkles}
        scale={[48, 24, 48]}
        size={3.2}
        speed={0.35}
        opacity={0.6}
        color="#FFFFFF"
      />

      <Grid
        position={[0, -9.3, 0]}
        args={[160, 160]}
        cellSize={2.5}
        cellThickness={0.9}
        cellColor="#27272A"
        sectionSize={10}
        sectionThickness={1.6}
        sectionColor="#71717A"
        fadeDistance={130}
        fadeStrength={1.15}
        infiniteGrid
        followCamera
      />
      <HolographicFloorRadar />

      {links.map((link) => {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (!s?.position || !t?.position) return null;
        if (!visibleIds.has(link.source) && !visibleIds.has(link.target)) return null;
        const isHighlighted =
          Boolean(selectedNode) &&
          (selectedNode?.id === link.source || selectedNode?.id === link.target);
        const isDimmed =
          Boolean(selectedNode) &&
          selectedNode?.id !== link.source &&
          selectedNode?.id !== link.target;
        return (
          <Conduit
            key={link.id}
            start={s.position}
            end={t.position}
            isHighlighted={isHighlighted}
            isDimmed={isDimmed}
            quality={quality}
          />
        );
      })}

      <Bvh firstHitOnly>
        {visibleNodes.map((node) => {
          const isSelected = selectedNode?.id === node.id;
          const isDimmed = Boolean(selectedNode) && !isSelected;
          return (
            <WorldNode
              key={node.id}
              node={node}
              isSelected={isSelected}
              isDimmed={isDimmed}
              quality={quality}
              onClick={() => onSelectNode(isSelected ? null : node)}
            />
          );
        })}
      </Bvh>

      <CameraControls
        ref={cameraControlsRef}
        makeDefault
        minDistance={4}
        maxDistance={80}
        smoothTime={0.35}
      />
      <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
        <GizmoViewport
          axisColors={["#FFFFFF", "#A1A1AA", "#52525B"]}
          labelColor="white"
        />
      </GizmoHelper>

      <GalaxyEffects quality={quality} />
      <Preload all />
    </>
  );
}
