import React from "react";
import { FileText, Mic, Volume2, VolumeX } from "lucide-react";
import { HudBracket } from "./HudBracket";
import { TelemetrySparkPanel, seriesFromSeed } from "./TelemetrySparkPanel";
import { PLANETARY_ECOSYSTEMS, type EcosystemSatellite } from "./PlanetaryEcosystemSatellites";
import type { SovereignTelemetryState } from "./SovereignTelemetry";
import { sonikAudio } from "../../lib/sonikAudio";

interface SovereignHUDProps {
  selectedSatellite: EcosystemSatellite;
  telemetry: SovereignTelemetryState;
  isMuted: boolean;
  onMuteToggle: () => void;
  onVoiceOpen: () => void;
  onDossier?: () => void;
  onSelectSatellite: (eco: EcosystemSatellite) => void;
}

export function SovereignHUD({ selectedSatellite, telemetry, isMuted, onMuteToggle, onVoiceOpen, onDossier, onSelectSatellite }: SovereignHUDProps) {
  return (
    <div className="dashboard-container">
      <div className="top-header pointer-events-auto">
        <div className="os-title">
          FEEX WORLD OS // HOLOKAI UPLINK
          <div className="status-badge">FEEX STREAM // {telemetry.isSimulated ? "SIMULATED FEED" : "LIVE CANONICAL"} | DPR 1–2 TARGET | REGISTRY: {selectedSatellite.evidence.class}</div>
          <div className="hud-sensor-strip" aria-label="Sensor strip">
            <span className="sensor-item"><span className="sensor-dot" aria-hidden /><span className="sensor-key">Rad-Scan</span><span className="sensor-val">DESIGN SPEC</span></span>
            <span className="sensor-item"><span className="sensor-key">Probe</span><span className="sensor-val">DESIGN SPEC</span></span>
            <span className="sensor-item"><span className="sensor-key">Lidar</span><span className="sensor-val">DESIGN SPEC</span></span>
            <span className="sensor-item"><span className="sensor-key">Hull</span><span className="sensor-val">DESIGN SPEC</span></span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onMuteToggle} className="p-1.5 border border-[#ffffff]/50 hover:border-white transition bg-black/40 rounded-sm" title={isMuted ? "Unmute Audio DSP" : "Mute Audio DSP"}>{isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
          <button onClick={() => { sonikAudio.unlockAudio(); sonikAudio.playCyberClick(1.4); onVoiceOpen(); }} className="p-2 border border-white hover:bg-white hover:text-black transition rounded-sm" title="Voice Uplink // HoloKai"><Mic className="w-4 h-4" /></button>
          {onDossier && <button className="btn-dossier hud-bracket-4 hud-bracket--cyan" onClick={onDossier}><span className="hud-c hud-c--tl" aria-hidden /><span className="hud-c hud-c--tr" aria-hidden /><span className="hud-c hud-c--bl" aria-hidden /><span className="hud-c hud-c--br" aria-hidden /><span className="relative z-10 flex items-center gap-2"><FileText className="w-4 h-4" />Technical Dossier</span></button>}
        </div>
      </div>
      <div className="nav-bar pointer-events-auto">
        {PLANETARY_ECOSYSTEMS.map((eco) => <button key={eco.id} onClick={() => onSelectSatellite(eco)} className={"nav-tab " + (selectedSatellite.id === eco.id ? "active" : "")}>{eco.name}</button>)}
      </div>
      <div className="mid-grid pointer-events-auto">
        <TelemetrySparkPanel title="Yield / Telemetry Index" series={seriesFromSeed((selectedSatellite.highlight.value.replace(/\D/g, "").length || 1) * 17 + selectedSatellite.id.length * 3)} caption={selectedSatellite.name + " · index"} />
        <HudBracket className="hud-panel--hero p-4">
          <div className="hud-panel-header"><span>{selectedSatellite.highlight.title}</span><span className="data-label">SYNC</span></div>
          <div className="hud-hero-metric">{selectedSatellite.highlight.value} <span className="status-chip">{selectedSatellite.highlight.status} · {selectedSatellite.evidence.class}</span></div>
          <div className="hud-data-row"><span className="hud-data-label">{selectedSatellite.highlight.subtitle}</span></div>
          <div className="hud-data-row mt-3"><span className="hud-data-label w-[40%]">{selectedSatellite.category}</span><span className="hud-data-value w-[60%] text-[10px]">{selectedSatellite.evidence.class} · {selectedSatellite.evidence.verified ? "VERIFIED" : "UNVERIFIED"}</span></div>
        </HudBracket>
      </div>
      <div className="bottom-grid pointer-events-auto mt-auto">
        <div className="hud-panel hud-bracket panel">
          <div className="panel-header">Navigation & Vector Telemetry <span className="data-label">[ {selectedSatellite.id.toUpperCase()} ]</span></div>
          <div className="data-row"><span className="data-label">V-Vector</span><span className="data-value">WORLD MODEL PROJECTION <span className="data-label">[{telemetry.hexCrawl}]</span></span></div>
          <div className="data-row"><span className="data-label">Q-Core Yield</span><span className="data-value">ILLUSTRATIVE / DESIGN SPEC</span></div>
          <div className="data-row"><span className="data-label">Gyroscope</span><span className="data-value">ILLUSTRATIVE / DESIGN SPEC</span></div>
          <div className="data-row"><span className="data-label">Hull Matrix</span><span className="data-value">ILLUSTRATIVE / DESIGN SPEC</span></div>
          <div className="data-row"><span className="data-label">Comms Handshake</span><span className="data-value">NOT A LIVE METRIC</span></div>
        </div>
        <div className="hud-panel hud-bracket panel">
          <div className="panel-header">{selectedSatellite.highlight.title}</div>
          <div className="text-[32px] font-['Rajdhani'] font-semibold mb-2.5 tracking-wide">{selectedSatellite.highlight.value} <span className="text-[12px] border border-[var(--text-muted)] px-1.5 py-0.5 align-middle tracking-widest">{selectedSatellite.highlight.status}</span></div>
          <div className="data-row"><span className="data-label">{selectedSatellite.highlight.subtitle}</span></div><br />
          <div className="data-row"><span className="data-label w-[40%]">{selectedSatellite.category}</span><span className="data-value w-[60%] text-[10px]">{selectedSatellite.status}</span></div>
        </div>
        <div className="hud-panel hud-bracket panel">
          <div className="panel-header">Sensor Scan & System Log <span>&gt;_</span></div>
          <div className="data-row"><span className="data-label">Evidence Class</span><span className="data-value">{selectedSatellite.evidence.class}</span></div><div className="data-row"><span className="data-label">Provenance</span><span className="data-value">{selectedSatellite.evidence.source} / {selectedSatellite.evidence.verified ? "VERIFIED" : "UNVERIFIED"}</span></div>
          <div className="data-row"><span className="data-label">Server Index</span><span className="data-value">{telemetry.activeServerIndex ?? "—"}</span></div>
          <div className="log-console">&gt; {selectedSatellite.sysLog || telemetry.hudTerminalLog}<br /><span className="animate-pulse">_</span></div>
        </div>
      </div>
    </div>
  );
}
export default SovereignHUD;
