import React, { useCallback, useEffect, useState } from "react";
import { sonikAudio } from "../../lib/sonikAudio";
import { PLANETARY_ECOSYSTEMS, type EcosystemSatellite } from "@/world-model";
import { HoloKaiInterface } from "./HoloKaiInterface";
import { SovereignControls, type SovereignVector } from "./SovereignControls";
import { SovereignHUD } from "./SovereignHUD";
import { SovereignScene } from "./SovereignScene";
import { SovereignTelemetry, type SovereignTelemetryState } from "./SovereignTelemetry";

export interface FeexSovereignEngineProps { onSwitchToDossier?: () => void; }

const INITIAL_TELEMETRY: SovereignTelemetryState = {
  hudTerminalLog: "SYSTEM READY // Steer Drone with WASD / Touchpad",
  isSimulated: true,
  activeServerIndex: null,
  hexCrawl: "0xF211",
};

export function FeexSovereignEngine({ onSwitchToDossier }: FeexSovereignEngineProps) {
  const [selectedSatellite, setSelectedSatellite] = useState<EcosystemSatellite>(PLANETARY_ECOSYSTEMS[3]);
  const [joystickValue, setJoystickValue] = useState<SovereignVector>({ x: 0, y: 0 });
  const [telemetry, setTelemetry] = useState<SovereignTelemetryState>(INITIAL_TELEMETRY);
  const [isMuted, setIsMuted] = useState(sonikAudio.isMuted());
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      const key = event.key.toLowerCase();
      const speed = 0.6;
      if (key === "w") setJoystickValue((prev) => ({ ...prev, y: Math.min(prev.y + speed, 1) }));
      if (key === "s") setJoystickValue((prev) => ({ ...prev, y: Math.max(prev.y - speed, -1) }));
      if (key === "a") setJoystickValue((prev) => ({ ...prev, x: Math.max(prev.x - speed, -1) }));
      if (key === "d") setJoystickValue((prev) => ({ ...prev, x: Math.min(prev.x + speed, 1) }));
      if (key === "v" && (event.ctrlKey || event.altKey) && !isVoiceModalOpen) setIsVoiceModalOpen(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      if (["w", "s", "a", "d"].includes(event.key.toLowerCase())) setJoystickValue({ x: 0, y: 0 });
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, [isVoiceModalOpen]);

  const handleSelectSatellite = useCallback((eco: EcosystemSatellite) => {
    setSelectedSatellite(eco);
    sonikAudio.playCyberClick(1.3);
    sonikAudio.triggerHaptic(18);
    setTelemetry((current) => ({ ...current, hudTerminalLog: "TARGET LOCK // " + eco.name + " : " + eco.status }));
  }, []);

  const handleTelemetryMessage = useCallback((message: string) => {
    setTelemetry((current) => ({ ...current, hudTerminalLog: message }));
  }, []);

  const handleMuteToggle = useCallback(() => {
    sonikAudio.unlockAudio();
    const nextMuted = sonikAudio.toggleMute();
    setIsMuted(nextMuted);
    sonikAudio.playCyberClick(nextMuted ? 0.8 : 1.3);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-[#080a0c] text-[#e0e6ed] overflow-hidden select-none font-mono">
      <div className="scanlines" /><div className="vignette" />
      <div className="absolute inset-0 pointer-events-none z-10" style={{ backgroundImage: "linear-gradient(rgba(0, 255, 102, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 102, 0.04) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full border border-white/5 pointer-events-none z-20 flex items-center justify-center opacity-70">
        <div className="absolute w-[calc(100%+40px)] h-[1px] bg-white/10" /><div className="absolute h-[calc(100%+40px)] w-[1px] bg-white/10" /><div className="w-1.5 h-1.5 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66] z-30" />
      </div>
      <SovereignHUD selectedSatellite={selectedSatellite} telemetry={telemetry} isMuted={isMuted} onMuteToggle={handleMuteToggle} onVoiceOpen={() => setIsVoiceModalOpen(true)} onDossier={onSwitchToDossier} onSelectSatellite={handleSelectSatellite} />
      <SovereignControls value={joystickValue} onChange={setJoystickValue} />
      <SovereignTelemetry onChange={setTelemetry} />
      <SovereignScene selectedSatellite={selectedSatellite} joystickValue={joystickValue} prefersReducedMotion={prefersReducedMotion} activeServerIndex={telemetry.activeServerIndex} onSelectSatellite={handleSelectSatellite} onTelemetryMessage={handleTelemetryMessage} />
      <HoloKaiInterface isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} activeEcosystem={selectedSatellite.name} />
    </div>
  );
}
export default FeexSovereignEngine;
