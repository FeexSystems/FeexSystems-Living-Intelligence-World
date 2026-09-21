import React, { useRef, useState, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { ScrollControls, Scroll, Stars } from "@react-three/drei";
import { Physics } from "@react-three/cannon";
import * as THREE from "three";
import {
  FileText,
  Volume2,
  VolumeX,
  Mic,
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
    PLANETARY_ECOSYSTEMS[3]
  );
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [hexCrawl, setHexCrawl] = useState<string>("0xF211");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const isDragging = useRef<boolean>(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useProductionServerTelemetry(
    useCallback(
      (payload: TelemetryPayload) => {
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
      <div className="scanlines" />
      <div className="vignette" />
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full border border-white/5 pointer-events-none z-20 flex items-center justify-center opacity-70">
        <div className="absolute w-[calc(100%+40px)] h-[1px] bg-white/10" />
        <div className="absolute h-[calc(100%+40px)] w-[1px] bg-white/10" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66] z-30" />
      </div>

      <div className="dashboard-container">
        <div className="top-header pointer-events-auto">
          <div className="os-title">
            FEEX WORLD OS // HOLOKAI UPLINK
            <div className="status-badge">
              FEEX STREAM // {isSimulated ? "SIMULATED FEED" : "LIVE CANONICAL"} | DPR 1–2 TARGET
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

        <div className="mid-grid pointer-events-auto">
          <TelemetrySparkPanel
            title="Yield / Telemetry Index"
            series={seriesFromSeed(
              (selectedSatellite.highlight.value.replace(/\D/g, "").length || 1) * 17 +
                selectedSatellite.id.length * 3
            )}
            caption={`${selectedSatellite.name} · index`}
          />
          <HudBracket className="hud-panel--hero p-4">
            <div className="hud-panel-header">
              <span>{selectedSatellite.highlight.title}</span>
              <span className="data-label">SYNC</span>
            </div>
            <div className="hud-hero-metric">
              {selectedSatellite.highlight.value}{" "}
              <span className="status-chip">{selectedSatellite.highlight.status}</span>
            </div>
            <div className="hud-data-row">
              <span className="hud-data-label">{selectedSatellite.highlight.subtitle}</span>
            </div>
            <div className="hud-data-row mt-3">
              <span className="hud-data-label w-[40%]">{selectedSatellite.category}</span>
              <span className="hud-data-value w-[60%] text-[10px]">{selectedSatellite.status}</span>
            </div>
          </HudBracket>
        </div>

        <div className="bottom-grid pointer-events-auto mt-auto">
          <div className="hud-panel hud-bracket panel">
            <div className="panel-header">
              Navigation & Vector Telemetry{" "}
              <span className="data-label">[ {selectedSatellite.id.toUpperCase()} ]</span>
            </div>
            <div className="data-row">
              <span className="data-label">V-Vector</span>
              <span className="data-value">
                X: {(joystickValue.x * 42.08).toFixed(2)} | Y: {(joystickValue.y * -18.3).toFixed(2)}{" "}
                <span className="data-label">[{hexCrawl}]</span>
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Q-Core Yield</span>
              <span className="data-value">
                88.4% <span className="highlight" style={{ color: "#fff" }}>+0.4°C</span>
              </span>
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

          <div className="hud-panel hud-bracket panel">
            <div className="panel-header">{selectedSatellite.highlight.title}</div>
            <div className="text-[32px] font-['Rajdhani'] font-semibold mb-2.5 tracking-wide">
              {selectedSatellite.highlight.value}{" "}
              <span className="text-[12px] border border-[var(--text-muted)] px-1.5 py-0.5 align-middle tracking-widest">
                {selectedSatellite.highlight.status}
              </span>
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

          <div className="hud-panel hud-bracket panel">
            <div className="panel-header">
              Sensor Scan & System Log <span>&gt;_</span>
            </div>
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
              <span className="data-value">
                Clearance: 89.2M <span className="data-label">[{hexCrawl}]</span>
              </span>
            </div>
            <div className="log-console">
              &gt; {selectedSatellite.sysLog || hudTerminalLog}
              <br />
              <span className="animate-pulse">_</span>
            </div>
          </div>
        </div>
      </div>

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
          <Scroll html style={{ width: "100%" }}>
            <div className="h-screen" />
            <div className="h-screen" />
            <div className="h-screen" />
            <div className="h-screen" />
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
