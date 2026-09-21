import React from "react";
import { Canvas } from "@react-three/fiber";
import { Scroll, ScrollControls, Stars } from "@react-three/drei";
import { Physics } from "@react-three/cannon";
import { LiquidPlasmaBackground } from "./LiquidPlasmaBackground";
import { ExplodingArchitectureCore } from "./ExplodingArchitectureCore";
import { LaserGridMatrix } from "./LaserGridMatrix";
import { LiveStreamBladeServer } from "./LiveStreamBladeServer";
import { UniversalNavigatorDrone } from "./UniversalNavigatorDrone";
import { BoundingWorkspaceEnclosure } from "./BoundingWorkspaceEnclosure";
import { PlanetaryEcosystemSatellites } from "./PlanetaryEcosystemSatellites";
import { EarthGlobeBackdrop } from "./EarthGlobeBackdrop";
import { PostProcessingPipeline } from "./PostProcessingPipeline";
import type { EcosystemSatellite } from "@/world-model";
import type { SovereignVector } from "./SovereignControls";

interface SovereignSceneProps {
  selectedSatellite: EcosystemSatellite;
  joystickValue: SovereignVector;
  prefersReducedMotion: boolean;
  activeServerIndex: number | null;
  onSelectSatellite: (eco: EcosystemSatellite) => void;
  onTelemetryMessage: (message: string) => void;
}

export function SovereignScene({
  selectedSatellite,
  joystickValue,
  prefersReducedMotion,
  activeServerIndex,
  onSelectSatellite,
  onTelemetryMessage,
}: SovereignSceneProps) {
  return (
    <Canvas
      data-testid="sovereign-canvas"
      camera={{ position: [0, 2, 8.5], fov: 52 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.14} />
      <directionalLight position={[6, 16, 6]} intensity={0.9} color="#ffffff" />
      <pointLight position={[-8, 0, -4]} intensity={0.8} color="#00ff66" />
      <pointLight position={[8, 0, -4]} intensity={0.6} color="#ffffff" />
      <Stars radius={90} depth={50} count={2800} factor={3} fade speed={1} />
      <LiquidPlasmaBackground />
      <EarthGlobeBackdrop
        reducedMotion={prefersReducedMotion}
        primaryRadius={2.6}
        secondaryRadius={1.05}
        secondaryOffset={[3.4, -0.4, -1.2]}
        wireColor="#c8d0d8"
        fillOpacity={0.12}
        spinSpeed={0.03}
      />
      <LaserGridMatrix />
      <ScrollControls pages={4} damping={0.15}>
        <ExplodingArchitectureCore />
        <PlanetaryEcosystemSatellites selectedId={selectedSatellite.id} onSelect={onSelectSatellite} />
        <Physics gravity={[0, 0, 0]}>
          <BoundingWorkspaceEnclosure />
          <UniversalNavigatorDrone joystickVector={joystickValue} onHit={onTelemetryMessage} />
          <LiveStreamBladeServer position={[-6, 0, -4]} domain="01 // AUDIO DSP LOGS" domainIndex={0} isActivePulse={activeServerIndex === 0} pulseColor="#00ff66" onCollision={onTelemetryMessage} />
          <LiveStreamBladeServer position={[6, 0, -5]} domain="02 // WORLD ENGINE DB" domainIndex={1} isActivePulse={activeServerIndex === 1} pulseColor="#00ff66" onCollision={onTelemetryMessage} />
        </Physics>
        <Scroll html style={{ width: "100%" }}>
          <div className="h-screen" /><div className="h-screen" /><div className="h-screen" /><div className="h-screen" />
        </Scroll>
      </ScrollControls>
      <PostProcessingPipeline />
    </Canvas>
  );
}

export default SovereignScene;
