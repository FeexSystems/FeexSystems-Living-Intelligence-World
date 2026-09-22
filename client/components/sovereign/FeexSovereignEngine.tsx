import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { ScrollControls, Scroll, Stars } from "@react-three/drei";
import { Physics } from "@react-three/cannon";
import * as THREE from "three";
import {
  FileText,
  Volume2,
  VolumeX,
  Mic,
  Cpu,
  ArrowRight,
  Compass,
  ShieldCheck,
  Activity,
  Layers,
  Crosshair,
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
import { EarthGlobeBackdrop } from "./EarthGlobeBackdrop";
import { TelemetrySparkPanel, seriesFromSeed } from "./TelemetrySparkPanel";
import { HudBracket } from "./HudBracket";
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
    PLANETARY_ECOSYSTEMS[2] // 03 FARMPLUG AI (default)
  );
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [hexCrawl, setHexCrawl] = useState<string>("0xF211");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const isDragging = useRef<boolean>(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsOwnsStreamRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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

  const handleTelemetryEvent = useCallback((payload: TelemetryPayload) => {
    setHudTerminalLog(payload.msg);
    setIsSimulated(payload.simulated);
    setActiveServerIndex(payload.serverIndex);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setActiveServerIndex(null), 350);
  }, []);

  useTelemetryWebSocket(
    useCallback((sequence: number) => {
      console.log(`[Feex World OS]: canonical WS frame #${sequence}`);
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
      {/* CRT Scanline & Vignette Visual Texture */}
      <div className="scanlines" />
      <div className="vignette" />
      
      {/* Matrix Backdrop Grid */}
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

      {/* Center Target Reticle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full border border-white/5 pointer-events-none z-20 flex items-center justify-center opacity-60">
        <div className="absolute w-[calc(100%+40px)] h-[1px] bg-white/10" />
        <div className="absolute h-[calc(100%+40px)] w-[1px] bg-white/10" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66] z-30" />
      </div>

      {/* HUD Dashboard Layout Container */}
      <div className="dashboard-container">
        {/* Top Header */}
        <div className="top-header pointer-events-auto">
          <div className="os-title">
            FEEX WORLD OS // HOLOKAI UPLINK
            <div className="status-badge">
              FEEX STREAM // {isSimulated ? "SIMULATED FEED" : "LIVE CANONICAL"} | 60 FPS LOCKED
            </div>
            <div className="hud-sensor-strip" aria-label="Sensor strip">
              <span className="sensor-item">
                <span className="sensor-dot" aria-hidden />
                <span className="sensor-key">Rad-Scan</span>
                <span className="sensor-val">3.4 µSv/h</span>
              </span>
              <span className="sensor-item">
                <span className="sensor-key">Probe</span>
                <span className="sensor-val">LOCK D:4.2K</span>
              </span>
              <span className="sensor-item">
                <span className="sensor-key">Lidar</span>
                <span className="sensor-val">89.2M CLR</span>
              </span>
              <span className="sensor-item">
                <span className="sensor-key">Hull</span>
                <span className="sensor-val">99.8%</span>
              </span>
            </div>
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
            {onSwitchToDossier && (
              <button
                className="btn-dossier hud-bracket-4 hud-bracket--cyan"
                onClick={onSwitchToDossier}
              >
                <span className="hud-c hud-c--tl" aria-hidden />
                <span className="hud-c hud-c--tr" aria-hidden />
                <span className="hud-c hud-c--bl" aria-hidden />
                <span className="hud-c hud-c--br" aria-hidden />
                <span className="relative z-10 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Technical Dossier
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 8 Canonical Orbit Worlds Nav Bar */}
        <div className="nav-bar pointer-events-auto">
          {PLANETARY_ECOSYSTEMS.map((eco, idx) => {
            const isActive = selectedSatellite.id === eco.id;
            return (
              <button
                key={eco.id}
                onClick={() => handleSelectSatellite(eco)}
                className={`nav-tab ${isActive ? "active" : ""}`}
              >
                <span className="opacity-50 mr-1.5">[{String(idx + 1).padStart(2, "0")}]</span>
                {eco.name}
              </button>
            );
          })}
        </div>

        {/* Unified 3-Panel Bottom HUD Grid */}
        <div className="bottom-grid pointer-events-auto mt-auto">
          {/* Panel 1: Telemetry Spark Waveform */}
          <div className="hud-panel hud-bracket panel p-3">
            <TelemetrySparkPanel
              title="Yield / Telemetry Index"
              series={seriesFromSeed(
                (selectedSatellite.highlight.value.replace(/\D/g, "").length || 1) * 17 +
                  selectedSatellite.id.length * 3
              )}
              caption={`${selectedSatellite.name} · index`}
            />
          </div>

          {/* Panel 2: Primary Target Focus Card (Hero Target System) */}
          <div className="hud-panel hud-bracket panel p-4 flex flex-col justify-between">
            <div>
              <div className="panel-header flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-[#00ff66]" />
                  {selectedSatellite.highlight.title}
                </span>
                <span className="data-label text-[10px] tracking-widest text-[#00ff66]">
                  [ {selectedSatellite.id.toUpperCase()} // LOCKED ]
                </span>
              </div>
              <div className="text-[28px] sm:text-[32px] font-['Rajdhani'] font-semibold mb-1.5 tracking-wide text-white flex items-center gap-3">
                {selectedSatellite.highlight.value}
                <span className="text-[10px] font-mono border border-[var(--hud-phosphor-dim)] text-[var(--hud-phosphor)] px-2 py-0.5 align-middle tracking-widest bg-[rgba(0,255,102,0.08)]">
                  {selectedSatellite.highlight.status}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] font-mono mb-3">
                {selectedSatellite.highlight.subtitle}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[10px] font-mono">
              <div>
                <span className="text-[var(--text-muted)] block text-[9px]">METRIC L1:</span>
                <span className="text-white truncate block">{selectedSatellite.metrics.l1}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[9px]">METRIC R1:</span>
                <span className="text-white truncate block">{selectedSatellite.metrics.r1}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[9px]">DOMAIN:</span>
                <span className="text-[var(--hud-cyan)] truncate block">{selectedSatellite.category}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[9px]">STATUS:</span>
                <span className="text-[var(--hud-phosphor)] truncate block">{selectedSatellite.status}</span>
              </div>
            </div>
          </div>

          {/* Panel 3: Navigation & Vector Telemetry & System Log */}
          <div className="hud-panel hud-bracket panel p-4 flex flex-col justify-between">
            <div>
              <div className="panel-header flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[var(--hud-cyan)]" />
                  Flight Vector & Telemetry
                </span>
                <span className="data-label text-[10px] text-[#00ff66]">ACTIVE</span>
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="data-label">V-Vector</span>
                  <span className="data-value">
                    X: {(joystickValue.x * 42.08).toFixed(2)} | Y: {(joystickValue.y * -18.3).toFixed(2)}{" "}
                    <span className="data-label">[{hexCrawl}]</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="data-label">Q-Core Yield</span>
                  <span className="data-value">
                    88.4% <span style={{ color: "#00ff66" }}>+0.4°C</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="data-label">Gyroscope</span>
                  <span className="data-value">P: +4.2° | Y: -1.1° | R: 0.0°</span>
                </div>
                <div className="flex justify-between">
                  <span className="data-label">Hull Matrix</span>
                  <span className="data-value">99.8% OPTIMAL</span>
                </div>
                <div className="flex justify-between">
                  <span className="data-label">Comms Handshake</span>
                  <span className="data-value">12ms [SECURE]</span>
                </div>
              </div>
            </div>

            <div className="log-console mt-2">
              &gt; {selectedSatellite.sysLog || hudTerminalLog}
              <br />
              <span className="animate-pulse">_</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tactile Drone Steering Pad */}
      <div className="absolute bottom-28 right-6 z-30 flex flex-col items-center gap-1.5">
        <div className="text-[8px] uppercase tracking-widest text-[#788896]">WASD / DRAG</div>
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

      {/* 3D WebGL Sovereign Engine Canvas */}
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
          <PlanetaryEcosystemSatellites
            selectedId={selectedSatellite.id}
            onSelect={handleSelectSatellite}
          />
          <Physics gravity={[0, 0, 0]}>
            <BoundingWorkspaceEnclosure />
            <UniversalNavigatorDrone
              joystickVector={joystickValue}
              onHit={setHudTerminalLog}
            />
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

            {/* Slide 2: Exploded Architecture Spec */}
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
        <PostProcessingPipeline />
      </Canvas>

      <HoloKaiVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        activeEcosystem={selectedSatellite.name}
      />
    </div>
  );
}

export default FeexSovereignEngine;
