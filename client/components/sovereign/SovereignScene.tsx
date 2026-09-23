/**
 * SovereignScene — Cinematic 3D WebGL engine for the HUD center panel.
 *
 * Composes all purpose-built Sovereign components into a single scene:
 *   • LiquidPlasmaBackground  — 3-octave fBm nebula shader backdrop
 *   • LaserGridMatrix          — audio-reactive GLSL neon-cyan grid floor
 *   • ExplodingArchitectureCore — 7-tier scroll-driven exploded engine model
 *   • PlanetaryEcosystemSatellites — 8 orbiting world nodes, clickable
 *   • UniversalNavigatorDrone  — physics-driven probe (WASD/joystick)
 *   • PostProcessingPipeline   — lens vignette, chromatic aberration, grain
 *
 * AGENTS.md §9: DPR clamped to [1, 2].
 * No GalaxyScene — this is the Sovereign Engine's own scene graph.
 *
 * Selection wiring:
 *   – Clicking a satellite fires onSelectNode with the matched GroundedWorld id.
 *   – selectedNode.id is forwarded as selectedId to PlanetaryEcosystemSatellites.
 */

import { Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Loader } from '@react-three/drei';
import { Physics } from '@react-three/cannon';
import * as THREE from 'three';

import { LiquidPlasmaBackground } from './LiquidPlasmaBackground';
import { LaserGridMatrix } from './LaserGridMatrix';
import { ExplodingArchitectureCore } from './ExplodingArchitectureCore';
import { PlanetaryEcosystemSatellites, type EcosystemSatellite } from './PlanetaryEcosystemSatellites';
import { UniversalNavigatorDrone } from './UniversalNavigatorDrone';
import { PostProcessingPipeline } from './PostProcessingPipeline';

export interface SovereignSceneProps {
  /** ID of the currently-selected world (from GroundedWorld). Null = none. */
  selectedNodeId?: string | null;
  /** Fires when the user clicks a satellite node. Payload is the satellite id. */
  onSelectNode?: (id: string) => void;
  /** Joystick vector forwarded to the navigator drone (normalised -1..1). */
  joystickVector?: THREE.Vector2;
  /** Drives the camera orbit animation. Defaults to true. */
  autoRotate?: boolean;
}

/**
 * Inner scene — must be rendered inside a <Canvas> context so all
 * @react-three/fiber / @react-three/cannon hooks work correctly.
 */
function SovereignSceneInner({
  selectedNodeId,
  onSelectNode,
  joystickVector,
}: Pick<SovereignSceneProps, 'selectedNodeId' | 'onSelectNode' | 'joystickVector'>) {
  const handleSatelliteSelect = useCallback(
    (sat: EcosystemSatellite) => {
      onSelectNode?.(sat.id);
    },
    [onSelectNode]
  );

  return (
    <ScrollControls pages={1.6} damping={0.25}>
      {/* ── Layer 1: Deep nebula backdrop ─────────────────────────── */}
      <LiquidPlasmaBackground />

      {/* ── Layer 2: Neon-cyan audio-reactive grid floor ───────────── */}
      <LaserGridMatrix />

      {/* ── Layer 3: 7-tier exploding architecture core (scroll-driven) */}
      <ExplodingArchitectureCore />

      {/* ── Layer 4: Orbiting ecosystem world satellites ───────────── */}
      <PlanetaryEcosystemSatellites
        selectedId={selectedNodeId ?? null}
        onSelect={handleSatelliteSelect}
      />

      {/* ── Layer 5: Physics-driven navigator drone ────────────────── */}
      <Physics gravity={[0, -2, 0]} broadphase="Naive">
        <UniversalNavigatorDrone
          joystickVector={joystickVector}
          onHit={undefined}
        />
      </Physics>

      {/* ── Layer 6: Cinematic post-processing pass ────────────────── */}
      <PostProcessingPipeline enabled distortionIntensity={0.08} intensity={1.0} />
    </ScrollControls>
  );
}

export function SovereignScene({
  selectedNodeId = null,
  onSelectNode,
  joystickVector = new THREE.Vector2(0, 0),
  autoRotate = true,
}: SovereignSceneProps) {
  return (
    <>
      <Canvas
        // DPR clamped per AGENTS.md §9 — protects high-DPI from thermal throttling.
        dpr={[1, 2]}
        camera={{ position: [0, 4, 18], fov: 52, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false,
          alpha: false,
        }}
      >
        <Suspense fallback={null}>
          <SovereignSceneInner
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            joystickVector={joystickVector}
          />
        </Suspense>
      </Canvas>

      {/* Drei progress loader */}
      <Loader
        containerStyles={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
        innerStyles={{ backgroundColor: '#FFFFFF' }}
        barStyles={{ backgroundColor: '#00ff41' }}
        dataStyles={{ color: '#00ff41', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.15em' }}
        dataInterpolation={(p) => `SOVEREIGN_ENGINE_BOOT ${(p * 100).toFixed(0)}%`}
      />
    </>
  );
}

export default SovereignScene;
