import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { ScrollControls, Scroll, Stars } from "@react-three/drei";
import { Physics } from "@react-three/cannon";
import * as THREE from "three";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Globe,
  Compass,
  FileText,
  Cpu,
  ShieldCheck,
  Volume2,
  VolumeX,
  Mic,
  Activity,
  Terminal as TerminalIcon
} from "lucide-react";

import { LiquidPlasmaBackground } from "./LiquidPlasmaBackground";
import { ExplodingArchitectureCore } from "./ExplodingArchitectureCore";
import { LaserGridMatrix } from "./LaserGridMatrix";
import { LiveStreamBladeServer } from "./LiveStreamBladeServer";
import { UniversalNavigatorDrone } from "./UniversalNavigatorDrone";
import { BoundingWorkspaceEnclosure } from "./BoundingWorkspaceEnclosure";
import {
  PlanetaryEcosystemSatellites,
  PLANETARY_ECOSYSTEMS,
  type EcosystemSatellite
} from "./PlanetaryEcosystemSatellites";
import { HoloKaiVoiceModal } from "./HoloKaiVoiceModal";
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
  const [joystickValue, setJoystickValue] = useState<THREE.Vector2>(new THREE.Vector2(0, 0));
  const [isMuted, setIsMuted] = useState<boolean>(sonikAudio.isMuted());
  const [selectedSatellite, setSelectedSatellite] = useState<EcosystemSatellite>(
    PLANETARY_ECOSYSTEMS[3] // Default to Firehouse Grills
  );
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [hexCrawl, setHexCrawl] = useState<string>("0xF211");

  const isDragging = useRef<boolean>(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsOwnsStreamRef = useRef<boolean>(false);

  // Periodic animated hexadecimal crawl
  useEffect(() => {
    const interval = setInterval(() => {
      const hex = Math.floor(Math.random() * 65535)
        .toString(16)
        .toUpperCase()
        .padStart(4, "0");
      setHexCrawl(`0x${hex}`);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Live telemetry stream hook
  const handleTelemetryEvent = useCallback((payload: TelemetryPayload) => {
    setHudTerminalLog(payload.msg);
    setIsSimulated(payload.simulated);
    setActiveServerIndex(payload.serverIndex);

    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setActiveServerIndex(null), 350);
  }, []);

  useTelemetryWebSocket(
    useCallback((sequence: number) => {
      console.log(`📡 [Feex World OS]: canonical WS frame #${sequence}`);
    }, [])
  );

  useLayoutEffect(() => {
    wsOwnsStreamRef.current =
      typeof window !== "undefined" && typeof WebSocket !== "undefined";
  }, []);

  useProductionServerTelemetry(
    useCallback(
      (payload: TelemetryPayload) => {
        if (wsOwnsStreamRef.current && payload.simulated) return;
        handleTelemetryEvent(payload);
      },
      [handleTelemetryEvent]
    )
  );

  // Keyboard controls for WASD flight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const speed = 0.6;
      if (key === "w") setJoystickValue((prev) => new THREE.Vector2(prev.x, Math.min(prev.y + speed, 1.0)));
      if (key === "s") setJoystickValue((prev) => new THREE.Vector2(prev.x, Math.max(prev.y - speed, -1.0)));
      if (key === "a") setJoystickValue((prev) => new THREE.Vector2(Math.max(prev.x - speed, -1.0), prev.y));
      if (key === "d") setJoystickValue((prev) => new THREE.Vector2(Math.min(prev.x + speed, 1.0), prev.y));
      if (key === "v" && !isVoiceModalOpen && (e.ctrlKey || e.altKey)) {
        setIsVoiceModalOpen(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["w", "s", "a", "d"].includes(key)) {
        setJoystickValue(new THREE.Vector2(0, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isVoiceModalOpen]);

  // Touch and mouse joystick intercept
  const processTouchMove = (clientX: number, clientY: number, boundingBox: DOMRect) => {
    const centerPointX = boundingBox.left + boundingBox.width / 2;
    const centerPointY = boundingBox.top + boundingBox.height / 2;
    const directionDeltaX = clientX - centerPointX;
    const directionDeltaY = centerPointY - clientY;
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

  const handleSelectSatellite = (eco: EcosystemSatellite) => {
    setSelectedSatellite(eco);
    sonikAudio.playCyberClick(1.3);
    sonikAudio.triggerHaptic(18);
    setHudTerminalLog(`TARGET LOCK // ${eco.name} : ${eco.status}`);
  };

  return (
    <div className="relative w-screen h-screen bg-[#080a0c] text-[#e0e6ed] overflow-hidden select-none font-mono">
      <div className="scanlines" />
      <div className="vignette" />

      {/* Subtle Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 102, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 102, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px"
        }}
      />

      {/* Center Radar Reticle & Crosshairs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full border border-white/5 pointer-events-none z-20 flex items-center justify-center opacity-70">
        <div className="absolute w-[calc(100%+40px)] h-[1px] bg-white/10" />
        <div className="absolute h-[calc(100%+40px)] w-[1px] bg-white/10" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66] z-30" />
      </div>

      {/* ========================================================================= */}
      {/* HIGH-FIDELITY CINEMATIC HUD OVERLAY                                       */}
      {/* ========================================================================= */}
      <div className="dashboard-container">
        
        {/* Header Section */}
        <div className="top-header pointer-events-auto">
          <div className="os-title">
            FEEX WORLD OS // HOLOKAI UPLINK
            <div className="status-badge">FEEX STREAM // {isSimulated ? "SIMULATED FEED" : "LIVE CANONICAL"} | 60 FPS LOCKED</div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                sonikAudio.unlockAudio();
                const nextMuted = sonikAudio.toggleMute();
                setIsMuted(nextMuted);
                sonikAudio.playCyberClick(nextMuted ? 0.8 : 1.3);
              }}
              className="p-1.5 border border-[#ffffff]/50 hover:border-white transition bg-black/40 rounded-sm"
              title={isMuted ? "Unmute Audio DSP" : "Mute Audio DSP"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                sonikAudio.unlockAudio();
                sonikAudio.playCyberClick(1.4);
                setIsVoiceModalOpen(true);
              }}
              className="p-2 border border-white hover:bg-white hover:text-black transition rounded-sm flex items-center gap-2"
              title="Voice Uplink // HoloKai"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Upgraded Dossier Button */}
            {onSwitchToDossier && (
              <button className="btn-dossier" onClick={onSwitchToDossier}>
                <span className="relative z-10 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Technical Dossier
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-bar pointer-events-auto">
          {PLANETARY_ECOSYSTEMS.map((eco) => {
            const isActive = selectedSatellite.id === eco.id;
            return (
              <button
                key={eco.id}
                onClick={() => handleSelectSatellite(eco)}
                className={`nav-tab ${isActive ? "active" : ""}`}
              >
                {eco.name}
              </button>
            );
          })}
        </div>
        
        {/* Bottom Data Grid */}
        <div className="bottom-grid pointer-events-auto mt-auto">
          
          {/* Telemetry Panel */}
          <div className="panel">
            <div className="panel-header">
              Navigation & Vector Telemetry <span className="data-label">[ {selectedSatellite.id.toUpperCase()} ]</span>
            </div>
            <div className="data-row">
              <span className="data-label">V-Vector</span>
              <span className="data-value">X: {(joystickValue.x * 42.08).toFixed(2)} | Y: {(joystickValue.y * -18.3).toFixed(2)} <span className="data-label">[{hexCrawl}]</span></span>
            </div>
            <div className="data-row">
              <span className="data-label">Q-Core Yield</span>
              <span className="data-value">88.4% <span className="highlight" style={{ color: "#fff" }}>+0.4°C</span></span>
            </div>
            <div className="data-row">
              <span className="data-label">Gyroscope</span>
              <span className="data-value">P: +4.2° | Y: -1.1° | R: 0.0°</span>
            </div>
            <div className="data-row">
              <span className="data-label">Hull Matrix</span>
              <span className="data-value">99.8% OPTIMAL | AFT-SHIELD</span>
            </div>
            <div className="data-row">
              <span className="data-label">Comms Handshake</span>
              <span className="data-value">12ms [SECURE]</span>
            </div>
          </div>

          {/* Active Ecosystem Panel */}
          <div className="panel">
            <div className="panel-header">{selectedSatellite.highlight.title}</div>
            <div className="text-[32px] font-['Rajdhani'] font-semibold mb-2.5 tracking-wide">
              {selectedSatellite.highlight.value} <span className="text-[12px] border border-[var(--text-muted)] px-1.5 py-0.5 align-middle tracking-widest">{selectedSatellite.highlight.status}</span>
            </div>
            <div className="data-row">
              <span className="data-label">{selectedSatellite.highlight.subtitle}</span>
            </div>
            <br />
            <div className="data-row">
              <span className="data-label w-[40%]">{selectedSatellite.category}</span>
              <span className="data-value w-[60%] text-[10px]">{selectedSatellite.status}</span>
            </div>
          </div>

          {/* Sensor Scan Panel */}
          <div className="panel">
            <div className="panel-header">Sensor Scan & System Log <span>&gt;_</span></div>
            <div className="data-row">
              <span className="data-label">Rad-Scan</span>
              <span className="data-value">IONIZATION: 3.4 µSv/h</span>
            </div>
            <div className="data-row">
              <span className="data-label">Probe Lock</span>
              <span className="data-value">Anomaly Acquired (D: 4.2K)</span>
            </div>
            <div className="data-row">
              <span className="data-label">Lidar Mesh</span>
              <span className="data-value">Clearance: 89.2M <span className="data-label">[{hexCrawl}]</span></span>
            </div>
            
            <div className="log-console">
              &gt; {selectedSatellite.sysLog || hudTerminalLog}<br />
              <span className="animate-pulse">_</span>
            </div>
          </div>

          {/* Bang & Olufsen Audio Watermark */}
          <div className="fixed bottom-6 right-8 z-50 pointer-events-auto">
            <button className="px-4 py-2 bg-[#f0f0f0] text-black text-[11px] font-sans font-bold tracking-wide shadow-lg hover:bg-white transition flex items-center justify-center">
              Bang &amp; Olufsen Audio
            </button>
          </div>

        </div>
      </div>

      {/* Floating Tactical Joystick Pad (Mobile & Desktop) */}
      <div className="absolute bottom-28 right-6 z-30 flex flex-col items-center gap-1.5">
        <div className="text-[8px] uppercase tracking-widest text-[#788896]">
          WASD / DRAG
        </div>
        <div
          id="tactile-joystick-pad"
          className="w-16 h-16 rounded-full bg-black/70 border border-[#00ff66]/30 relative touch-none cursor-grab active:cursor-grabbing backdrop-blur-md shadow-lg"
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
          <div
            className="w-5 h-5 rounded-full bg-[#00ff66]/20 border border-[#00ff66] absolute top-1/2 left-1/2 pointer-events-none shadow-[0_0_6px_rgba(0,255,102,0.4)]"
            style={{
              transform: `translate(-50%, -50%) translate(${joystickValue.x * 18}px, ${
                -joystickValue.y * 18
              }px)`,
              transition: isDragging.current ? "none" : "transform 0.15s ease-out"
            }}
          />
        </div>
      </div>

      {/* 3D WebGL Processing Canvas */}
      <Canvas
        camera={{ position: [0, 2, 8.5], fov: 52 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance"
        }}
      >
        <ambientLight intensity={0.14} />
        <directionalLight position={[6, 16, 6]} intensity={0.9} color="#ffffff" />
        <pointLight position={[-8, 0, -4]} intensity={0.8} color="#00ff66" />
        <pointLight position={[8, 0, -4]} intensity={0.6} color="#ffffff" />
        <Stars radius={90} depth={50} count={2800} factor={3} fade speed={1.0} />

        {/* Deep Space Background Shader */}
        <LiquidPlasmaBackground />

        {/* Center Hologram Globe */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[2.8, 32, 32]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.08} />
        </mesh>

        {/* Moving Laser Grid Matrix */}
        <LaserGridMatrix />

        {/* Scrollytelling Assembly & Physics Universe */}
        <ScrollControls pages={4} damping={0.15}>
          {/* Central 7-Tier Architecture Core */}
          <ExplodingArchitectureCore />

          {/* 8 Orbiting 3D Planetary Ecosystem Satellites */}
          <PlanetaryEcosystemSatellites
            selectedId={selectedSatellite.id}
            onSelect={handleSelectSatellite}
          />

          {/* Cannon Rigid Body Physics Sandbox */}
          <Physics gravity={[0, 0, 0]}>
            <BoundingWorkspaceEnclosure />
            <UniversalNavigatorDrone
              joystickVector={joystickValue}
              onHit={setHudTerminalLog}
            />

            {/* Static Telemetry Monolith Racks */}
            <LiveStreamBladeServer
              position={[-6.0, 0, -4]}
              domain="01 // AUDIO DSP LOGS"
              domainIndex={0}
              isActivePulse={activeServerIndex === 0}
              pulseColor="#00ff66"
              onCollision={setHudTerminalLog}
            />
            <LiveStreamBladeServer
              position={[6.0, 0, -5]}
              domain="02 // WORLD ENGINE DB"
              domainIndex={1}
              isActivePulse={activeServerIndex === 1}
              pulseColor="#00ff66"
              onCollision={setHudTerminalLog}
            />
          </Physics>

          {/* HTML Typography Scrollytelling Layer */}
          <Scroll html style={{ width: "100%" }}>
            {/* Slide 1: Mission / Ingestion */}
            <div className="h-screen flex flex-col justify-center px-8 sm:px-16 md:px-24 pointer-events-none font-mono">
              <div className="max-w-3xl pointer-events-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#00ff66]/40 bg-[#00ff66]/5 text-[#00ff66] text-xs tracking-widest uppercase mb-6 backdrop-blur-md rounded-sm">
                  <Cpu className="w-3.5 h-3.5" />
                  // FEEX WORLD OS // PLANETARY OPERATING SYSTEM
                </div>
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-light tracking-tight text-white leading-[1.1] mb-6">
                  Building the Systems Behind <br />
                  <span className="font-semibold text-[#00ff66] drop-shadow-[0_0_15px_rgba(0,255,102,0.4)]">
                    Tomorrow's Intelligence.
                  </span>
                </h1>
                <div className="text-xs uppercase tracking-widest text-[#00ff66] mb-4">
                  One Vision. Multiple Worlds. Infinite Possibilities.
                </div>
                <p className="text-xs sm:text-sm md:text-base text-[#788896] max-w-xl leading-relaxed mb-8">
                  The planetary command center connects sovereign software architecture,
                  evidence-backed intelligence, cryptographic validation, and 8 orbiting ecosystems:
                  FarmPlug, Yurrheeler, Firehouse Grills, Rentall Smarts Homes, and beyond.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => setIsVoiceModalOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 border border-[#00ff66] bg-[#00ff66] text-black font-semibold text-xs uppercase tracking-wider hover:bg-white hover:border-white transition shadow-[0_0_20px_rgba(0,255,102,0.5)] rounded-sm"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Engage HoloKai Voice</span>
                  </button>
                  <Link
                    to="/world"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-black/60 border border-white/20 text-white font-medium text-xs uppercase tracking-wider hover:border-[#00ff66] hover:text-[#00ff66] transition backdrop-blur-md rounded-sm"
                  >
                    <Globe className="w-4 h-4 text-[#00ff66]" />
                    <span>3D Galaxy</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Slide 2: Exploded System Spec */}
            <div className="h-screen flex items-center justify-end px-8 sm:px-16 md:px-24 pointer-events-none font-mono">
              <div className="max-w-md bg-[#10161a]/90 backdrop-blur-2xl border border-[#00ff66]/20 p-8 pointer-events-auto shadow-2xl rounded">
                <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#00ff66] mb-2 block">
                  CANONICAL ARCHITECTURE SPEC
                </span>
                <h2 className="text-2xl sm:text-3xl font-light text-white mb-4">
                  7-Tier Sovereign Modular Engine
                </h2>
                <p className="text-xs sm:text-sm text-[#788896] leading-relaxed mb-6">
                  Scroll depth physically separates individual processing partitions to reveal
                  hardware data fabrics, pgvector hybrid search clusters, and deep topological
                  routing maps natively.
                </p>
                <div className="space-y-2 border-t border-white/10 pt-4 text-[11px] text-[#e0e6ed]">
                  <div className="flex justify-between">
                    <span className="text-[#788896]">CANONICAL REALITY:</span>
                    <span className="text-[#00ff66]">PostgreSQL 15 + Prisma</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#788896]">REASONING CORE:</span>
                    <span className="text-white">Gemini 3.7 Flash</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#788896]">EVIDENCE FABRIC:</span>
                    <span className="text-[#00ff66]">Cryptographic Commit SHAs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide 3: Evidence Provenance */}
            <div className="h-screen flex flex-col justify-center px-8 sm:px-16 md:px-24 pointer-events-none font-mono">
              <div className="max-w-xl pointer-events-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#00ff66]/30 bg-[#00ff66]/5 text-[#00ff66] text-xs tracking-widest uppercase mb-6 backdrop-blur-md rounded-sm">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  // EVIDENCE FABRIC PROVENANCE
                </div>
                <h2 className="text-3xl sm:text-4xl font-light text-white leading-tight mb-4">
                  Spatial Knowledge Galaxy & Evidence Ledger
                </h2>
                <p className="text-xs sm:text-sm text-[#788896] leading-relaxed mb-8">
                  Pilot the AI core drone mesh into static infrastructure matrices to inspect
                  tamper-proof cryptographic audit ledgers and commit SHAs instantaneously.
                </p>
                <div className="flex items-center gap-4">
                  <Link
                    to="/evidence"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-black/70 border border-white/20 hover:border-[#00ff66] hover:text-[#00ff66] text-xs uppercase tracking-wider transition rounded-sm"
                  >
                    <span>View Evidence Fabric</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Slide 4: Real-time Telemetry & Technical Dossier Access */}
            <div className="h-screen flex flex-col justify-center items-center text-center px-8 pointer-events-none font-mono">
              <div className="max-w-2xl pointer-events-auto bg-[#10161a]/90 backdrop-blur-2xl border border-[#00ff66]/20 p-10 shadow-2xl rounded">
                <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-[#00ff66] mb-3 block">
                  REALTIME SYSTEM SOVEREIGNTY
                </span>
                <h2 className="text-2xl sm:text-4xl font-light text-white mb-4">
                  Grounded in Production Code.
                </h2>
                <p className="text-xs sm:text-sm text-[#788896] max-w-lg mx-auto leading-relaxed mb-8">
                  Every webhook, repository ingestion loop, and Omni-Command agent path is
                  synchronously validated against the canonical World Model.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {onSwitchToDossier && (
                    <button
                      onClick={onSwitchToDossier}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-[#00ff66] transition shadow-lg rounded-sm"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Explore Technical Dossier</span>
                    </button>
                  )}
                  <Link
                    to="/omni"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-black border border-[#00ff66]/40 text-[#00ff66] font-medium text-xs uppercase tracking-wider hover:border-[#00ff66] hover:bg-[#00ff66]/10 transition rounded-sm"
                  >
                    <span>Omni-Command Stage</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </Scroll>
        </ScrollControls>

        {/* Film Grain & Post Processing */}
        <PostProcessingPipeline enabled={true} />
      </Canvas>

      {/* ========================================================================= */}
      {/* HOLOKAI CONVERSATIONAL VOICE & TEXT MODAL (GEMINI INTERACTIONS API)       */}
      {/* ========================================================================= */}
      <HoloKaiVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        activeEcosystem={selectedSatellite.name}
      />
    </div>
  );
}

export default FeexSovereignEngine;
