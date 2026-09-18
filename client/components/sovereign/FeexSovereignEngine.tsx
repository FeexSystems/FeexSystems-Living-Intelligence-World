import React, { useRef, useState, useCallback, useLayoutEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { ScrollControls, Scroll, Stars } from "@react-three/drei";
import { Physics } from "@react-three/cannon";
import * as THREE from "three";
import { Link } from "react-router-dom";
import { ArrowRight, Globe, Compass, FileText, Cpu, ShieldCheck, Volume2, VolumeX } from "lucide-react";

import { LiquidPlasmaBackground } from "./LiquidPlasmaBackground";
import { ExplodingArchitectureCore } from "./ExplodingArchitectureCore";
import { LaserGridMatrix } from "./LaserGridMatrix";
import { LiveStreamBladeServer } from "./LiveStreamBladeServer";
import { UniversalNavigatorDrone } from "./UniversalNavigatorDrone";
import { BoundingWorkspaceEnclosure } from "./BoundingWorkspaceEnclosure";
import { useProductionServerTelemetry, type TelemetryPayload } from "./useProductionServerTelemetry";
import { useTelemetryWebSocket } from "./useTelemetryWebSocket";
import { PostProcessingPipeline } from "./PostProcessingPipeline";
import { sonikAudio } from "../../lib/sonikAudio";

export interface FeexSovereignEngineProps {
  onSwitchToDossier?: () => void;
}

export function FeexSovereignEngine({ onSwitchToDossier }: FeexSovereignEngineProps) {
  const [hudTerminalLog, setHudTerminalLog] = useState<string>(
    "SYSTEM READY // Steer Drone with WASD / Touchpad"
  );
  const [isSimulated, setIsSimulated] = useState<boolean>(true);
  const [activeServerIndex, setActiveServerIndex] = useState<number | null>(null);
  const [serverColor, setServerColor] = useState<string>("#00f0ff");
  const [joystickValue, setJoystickValue] = useState<THREE.Vector2>(new THREE.Vector2(0, 0));
  const [isMuted, setIsMuted] = useState<boolean>(sonikAudio.isMuted());
  const isDragging = useRef<boolean>(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set by useLayoutEffect below (before the effects that open streams run), so
  // the SSE hook's synchronous first procedural frame is dropped instead of
  // momentarily overwriting the WebSocket feed.
  const wsOwnsStreamRef = useRef<boolean>(false);

  // Live telemetry stream hook (canonical SSE + clearly-labeled procedural fallback)
  const handleTelemetryEvent = useCallback((payload: TelemetryPayload) => {
    setHudTerminalLog(payload.msg);
    setIsSimulated(payload.simulated);
    setActiveServerIndex(payload.serverIndex);
    setServerColor(payload.hexColor);

    // Clear-before-set so overlapping emissions can't erase a newer flash early
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setActiveServerIndex(null), 350);
  }, []);

  // Preferred transport: the Nginx-terminated raw telemetry WebSocket.
  // Sequential frame ids only — the SSE hook remains the authority for the HUD
  // text so both transports can never disagree about what is being displayed.
  useTelemetryWebSocket(useCallback((sequence: number) => {
    console.log(`📡 [FeexSystems Engine]: canonical WS frame #${sequence}`);
  }, []));

  // Declarative gate: runs before useEffect (and therefore before any stream
  // opens), so `useProductionServerTelemetry` can consult it on its very first
  // synchronous emission.
  useLayoutEffect(() => {
    wsOwnsStreamRef.current =
      typeof window !== "undefined" && typeof WebSocket !== "undefined";
  }, []);

  useProductionServerTelemetry(
    useCallback(
      (payload: TelemetryPayload) => {
        // The WS transport is authoritative when available; ignore SSE/procedural
        // frames rather than letting them race the canonical feed.
        if (wsOwnsStreamRef.current && payload.simulated) return;
        handleTelemetryEvent(payload);
      },
      [handleTelemetryEvent]
    )
  );

  // Native tactile mobile touch & mouse intercept handling
  const processTouchMove = (clientX: number, clientY: number, boundingBox: DOMRect) => {
    const centerPointX = boundingBox.left + boundingBox.width / 2;
    const centerPointY = boundingBox.top + boundingBox.height / 2;
    const directionDeltaX = clientX - centerPointX;
    const directionDeltaY = centerPointY - clientY; // Invert Y to map 3D Z coords correctly
    const radialRadius = boundingBox.width / 2;

    const normalizedVector = new THREE.Vector2(directionDeltaX, directionDeltaY).divideScalar(
      radialRadius
    );
    if (normalizedVector.length() > 1.0) normalizedVector.normalize();
    if (normalizedVector.distanceTo(joystickValue) > 0.35) {
      sonikAudio.playCyberClick(0.9);
      sonikAudio.triggerHaptic(6);
    }
    setJoystickValue(normalizedVector);
  };

  return (
    <div className="relative w-screen h-screen bg-[#020205] text-white overflow-hidden select-none font-mono">
      {/* Real-time Hairline Glass Telemetry HUD Panel */}
      <div className="absolute top-6 left-6 z-50 pointer-events-none max-w-[calc(100vw-48px)] sm:max-w-md">
        <div className="bg-[#05050a]/80 backdrop-blur-xl border border-white/10 p-4 rounded-sm shadow-2xl">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: serverColor }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: serverColor }}
                />
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-white/70">
                FEEX STREAM // {isSimulated ? "SIMULATED FEED" : "LIVE CANONICAL"}
              </span>
            </div>
            <span className="text-[10px] text-white/40 tracking-wider">60 FPS LOCKED</span>
          </div>
          <div
            className="text-xs font-mono transition-colors duration-200 break-words leading-relaxed"
            style={{ color: serverColor }}
          >
            {hudTerminalLog}
          </div>
        </div>
      </div>

      {/* Navigation Quick Switch Bar */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={() => {
            sonikAudio.unlockAudio();
            const nextMuted = sonikAudio.toggleMute();
            setIsMuted(nextMuted);
            sonikAudio.playCyberClick(nextMuted ? 0.8 : 1.3);
            sonikAudio.triggerHaptic(12);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#0a0a14]/80 backdrop-blur-md border border-white/15 text-xs text-white/90 hover:text-white hover:border-cyan-400/60 transition shadow-lg"
          title={isMuted ? "Unmute Procedural Audio" : "Mute Audio"}
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          )}
          <span className="hidden sm:inline font-mono text-[11px]">{isMuted ? "DSP: OFF" : "DSP: SONIK"}</span>
        </button>

        {onSwitchToDossier && (
          <button
            onClick={onSwitchToDossier}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#0a0a14]/80 backdrop-blur-md border border-white/15 text-xs text-white/90 hover:text-white hover:border-cyan-400/60 transition shadow-lg"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Technical Dossier</span>
          </button>
        )}
        <Link
          to="/world"
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#0a0a14]/80 backdrop-blur-md border border-white/15 text-xs text-white/90 hover:text-white hover:border-cyan-400/60 transition shadow-lg"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">3D Galaxy</span>
        </Link>
      </div>

      {/* Floating Tactical Joystick Pad (Mobile & Desktop) */}
      <div className="absolute bottom-8 right-8 z-50 flex flex-col items-center gap-2">
        <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 hidden sm:block">
          WASD / DRAG PROBE
        </div>
        <div
          id="tactile-joystick-pad"
          className="w-24 h-24 rounded-full bg-white/[0.03] border border-white/15 relative touch-none cursor-grab active:cursor-grabbing backdrop-blur-sm shadow-xl"
          onTouchStart={(e) => {
            sonikAudio.unlockAudio();
            sonikAudio.playCyberClick(1.2);
            sonikAudio.triggerHaptic(12);
            isDragging.current = true;
            const rect = e.currentTarget.getBoundingClientRect();
            processTouchMove(e.touches[0].clientX, e.touches[0].clientY, rect);
          }}
          onTouchMove={(e) => {
            if (!isDragging.current) return;
            const rect = e.currentTarget.getBoundingClientRect();
            processTouchMove(e.touches[0].clientX, e.touches[0].clientY, rect);
          }}
          onTouchEnd={() => {
            isDragging.current = false;
            setJoystickValue(new THREE.Vector2(0, 0));
          }}
          onMouseDown={() => {
            sonikAudio.unlockAudio();
            sonikAudio.playCyberClick(1.2);
            sonikAudio.triggerHaptic(12);
            isDragging.current = true;
          }}
          onMouseMove={(e) => {
            if (!isDragging.current) return;
            const rect = e.currentTarget.getBoundingClientRect();
            processTouchMove(e.clientX, e.clientY, rect);
          }}
          onMouseUp={() => {
            isDragging.current = false;
            setJoystickValue(new THREE.Vector2(0, 0));
          }}
          onMouseLeave={() => {
            isDragging.current = false;
            setJoystickValue(new THREE.Vector2(0, 0));
          }}
        >
          {/* Dynamic Floating Hairline Glass Thumbtack */}
          <div
            className="w-9 h-9 rounded-full bg-white/10 border border-white/30 absolute top-1/2 left-1/2 pointer-events-none shadow-inner"
            style={{
              transform: `translate(-50%, -50%) translate(${joystickValue.x * 28}px, ${
                -joystickValue.y * 28
              }px)`,
              transition: isDragging.current ? "none" : "transform 0.15s ease-out",
            }}
          />
        </div>
      </div>

      {/* 3D WebGL Processing Canvas */}
      <Canvas
        camera={{ position: [0, 2, 7.5], fov: 55 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
      >
        <ambientLight intensity={0.06} />
        <directionalLight position={[6, 16, 6]} intensity={0.8} color="#ffffff" />
        <pointLight position={[-10, -5, -8]} intensity={1.2} color="#ff0055" />
        <pointLight position={[10, 5, -8]} intensity={1.5} color="#00f0ff" />
        <Stars radius={80} depth={40} count={2400} factor={4} fade speed={1.2} />

        {/* Continuous Active Theory Deep Space Fluid Plasma Shader */}
        <LiquidPlasmaBackground />

        {/* GPU Moving Laser Grid Matrix */}
        <LaserGridMatrix />

        {/* Scrollytelling Assembly & Physics Universe */}
        <ScrollControls pages={4} damping={0.15}>
          {/* Apple-Style Exploding 7-Tier Modular Architecture Assembly */}
          <ExplodingArchitectureCore />

          {/* Bruno Simon-Style Cannon Rigid Body Sandbox */}
          <Physics gravity={[0, 0, 0]}>
            <BoundingWorkspaceEnclosure />
            <UniversalNavigatorDrone
              joystickVector={joystickValue}
              onHit={setHudTerminalLog}
            />

            <LiveStreamBladeServer
              position={[-4.8, 0, -3]}
              domain="01 // AUDIO DSP LOGS"
              domainIndex={0}
              isActivePulse={activeServerIndex === 0}
              pulseColor={serverColor}
              onCollision={setHudTerminalLog}
            />
            <LiveStreamBladeServer
              position={[4.8, 0, -5]}
              domain="02 // WORLD ENGINE DB"
              domainIndex={1}
              isActivePulse={activeServerIndex === 1}
              pulseColor={serverColor}
              onCollision={setHudTerminalLog}
            />
            <LiveStreamBladeServer
              position={[0, 0, -8]}
              domain="03 // MULTI-AGENT SWARM"
              domainIndex={2}
              isActivePulse={activeServerIndex === 2}
              pulseColor={serverColor}
              onCollision={setHudTerminalLog}
            />
          </Physics>

          {/* HTML Typography Scrollytelling Layer */}
          <Scroll html style={{ width: "100%" }}>
            {/* Slide 1: Mission / Ingestion */}
            <div className="h-screen flex flex-col justify-center px-8 sm:px-16 md:px-24 pointer-events-none">
              <div className="max-w-3xl pointer-events-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 text-xs tracking-widest uppercase mb-6 backdrop-blur-md">
                  <Cpu className="w-3.5 h-3.5" />
                  // FEEXSYSTEMS — LIVING ENGINEERING INTELLIGENCE
                </div>
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-light tracking-tight text-white leading-[1.05] mb-6">
                  Building the Systems Behind <br />
                  <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-cyan-400">
                    Tomorrow's Intelligence.
                  </span>
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-xl leading-relaxed mb-8">
                  We engineer intelligent digital ecosystems at the intersection of AI,
                  sovereign software architecture, cryptographic evidence, automation, and human
                  experience.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    to="/world"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-cyan-400 text-black font-semibold text-xs uppercase tracking-wider hover:bg-cyan-300 transition shadow-[0_0_30px_rgba(0,240,255,0.4)]"
                  >
                    <span>Launch 3D Galaxy</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/navigator"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-white/5 border border-white/20 text-white font-medium text-xs uppercase tracking-wider hover:bg-white/10 hover:border-white/40 transition backdrop-blur-md"
                  >
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>AI Navigator</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Slide 2: Exploded System Spec */}
            <div className="h-screen flex items-center justify-end px-8 sm:px-16 md:px-24 pointer-events-none">
              <div className="max-w-md bg-[#040408]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-sm pointer-events-auto shadow-2xl">
                <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#ff0077] mb-2 block">
                  CANONICAL ARCHITECTURE SPEC
                </span>
                <h2 className="text-2xl sm:text-3xl font-light text-white mb-4">
                  7-Tier Sovereign Modular Engine
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
                  Scroll depth physically separates individual processing partitions to reveal
                  hardware data fabrics, pgvector hybrid search clusters, and deep topological
                  routing maps natively.
                </p>
                <div className="space-y-2 border-t border-white/10 pt-4 text-[11px] text-zinc-300">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">CANONICAL REALITY:</span>
                    <span className="text-cyan-400">PostgreSQL 15 + Prisma</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">VECTOR EMBEDDINGS:</span>
                    <span className="text-emerald-400">pgvector 1536-dim</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">REASONING ENGINE:</span>
                    <span className="text-purple-400">Provider-Neutral AI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide 3: Sandbox Terminal Zone */}
            <div className="h-screen flex flex-col justify-center px-8 sm:px-16 md:px-24 pointer-events-none">
              <div className="max-w-xl pointer-events-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 text-xs tracking-widest uppercase mb-6 backdrop-blur-md">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  // EVIDENCE FABRIC PROVENANCE
                </div>
                <h2 className="text-3xl sm:text-5xl font-light text-white leading-tight mb-4">
                  Spatial Knowledge Galaxy & Evidence Ledger
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                  Don't just view claims. Pilot the AI core drone mesh into static infrastructure
                  matrices to inspect tamper-proof cryptographic audit ledgers and commit SHAs
                  instantaneously.
                </p>
                <div className="flex items-center gap-4">
                  <Link
                    to="/evidence"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-white/10 border border-white/20 text-xs uppercase tracking-wider hover:bg-white/15 transition"
                  >
                    <span>View Evidence Fabric</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Slide 4: Real-time Telemetry & Technical Dossier Access */}
            <div className="h-screen flex flex-col justify-center items-center text-center px-8 pointer-events-none">
              <div className="max-w-2xl pointer-events-auto bg-[#030307]/80 backdrop-blur-2xl border border-white/10 p-10 rounded-sm shadow-2xl">
                <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-cyan-400 mb-3 block">
                  REALTIME SYSTEM SOVEREIGNTY
                </span>
                <h2 className="text-3xl sm:text-5xl font-light text-white mb-4">
                  Grounded in Production Code.
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed mb-8">
                  Every webhook, repository ingestion loop, and Omni-Command agent path is
                  synchronously validated against the canonical World Model.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {onSwitchToDossier && (
                    <button
                      onClick={onSwitchToDossier}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-zinc-200 transition shadow-lg"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Explore Technical Dossier</span>
                    </button>
                  )}
                  <Link
                    to="/omni"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 font-medium text-xs uppercase tracking-wider hover:bg-cyan-900/40 transition"
                  >
                    <span>Omni-Command Stage</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </Scroll>
        </ScrollControls>

        {/* High-End Film Grain, Chromatic Aberration & Lens Bloom */}
        <PostProcessingPipeline enabled={true} />
      </Canvas>
    </div>
  );
}

export default FeexSovereignEngine;
