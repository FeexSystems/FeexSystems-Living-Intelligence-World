import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as THREE from 'three';
import { LeftSidebar, RightSidebar } from './SovereignHUD';
import { SovereignScene } from './SovereignScene';
import { useSovereignWorldModel, type GroundedWorld, type GroundingLevel } from './useSovereignWorldModel';
import { useProductionServerTelemetry, type TelemetryPayload } from './useProductionServerTelemetry';
import { usePrefersReducedMotion, useFocusTrap, activateOnKeys } from './useA11yCompliance';
import { sonikAudio } from '@/lib/sonikAudio';
import type { WorldMetric, WorldStatusKind } from '@/data/feexWorlds';
import { Globe, Activity, Sprout, DollarSign, Music, Anchor, Bot, Terminal, Sparkles, Flame, Key, Compass, ArrowRight, Database, Layers, X, Search, Play, Volume2, VolumeX, RotateCw } from 'lucide-react';

/**
 * Status → color. Keyed on the typed WorldStatusKind union rather than string
 * matching, so introducing a new status is a compile error instead of silently
 * rendering as "healthy" neon green.
 */
const STATUS_COLORS: Record<WorldStatusKind, string> = {
  operational: '#ffffff',   // White
  secured: '#b0b0b0',       // Silver
  synchronizing: '#b0b0b0', // Silver
  'pending-repo': '#808080',// Light Gray
  degraded: '#808080',      // Light Gray
  offline: '#404040',       // Mid Gray
};

/** Returns the status color for a world, defaulting to neutral when unknown. */
export function getStatusColor(statusKind: WorldStatusKind | undefined): string {
  if (!statusKind) return '#808080';
  return STATUS_COLORS[statusKind] ?? '#808080';
}

/**
 * @deprecated Use the canonical catalog in `@/data/feexWorlds`.
 * Retained as a typed alias so existing consumers (SovereignHUD) keep compiling
 * while they migrate to `GroundedWorld`.
 */
export type EcosystemNode = GroundedWorld;

/** Stable per-node packet animation timings (seeded once, never re-randomized). */
export interface EvidencePacketTiming {
  delay: number;
  duration: number;
}

/**
 * Honest sync indicator. Replaces the previous always-green "SYNCED" chip,
 * which claimed synchronization regardless of canonical state.
 */
function GroundingBadge({ grounding, loading }: { grounding: GroundingLevel; loading: boolean }) {
  const config: Record<GroundingLevel, { label: string; color: string; hint: string }> = {
    live: {
      label: 'CANONICAL',
      color: '#ffffff',
      hint: 'Graph, maintenance and provider status all answered from the World Model.',
    },
    partial: {
      label: 'PARTIAL',
      color: '#b0b0b0',
      hint: 'Some canonical endpoints did not answer. Ungrounded metrics render as "—".',
    },
    fixture: {
      label: 'OFFLINE FIXTURE',
      color: '#404040',
      hint: 'No canonical endpoints answered. Showing the local catalog with no live telemetry.',
    },
  };

  const { label, color, hint } = config[grounding];

  return (
    <div className="flex items-center space-x-2" title={hint}>
      <span className="relative flex h-2.5 w-2.5">
        {grounding === 'live' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
        )}
        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
      </span>
      <span className="font-mono tracking-wider" style={{ color }}>
        {loading ? 'QUERYING…' : label}
      </span>
    </div>
  );
}

/**
 * Renders one HUD metric. Canonical metrics with no measured value show “—”
 * rather than an invented number; declared metrics are explicitly chipped.
 */
function MetricCard({ metric }: { metric: WorldMetric }) {
  const isDeclared = metric.source === 'declared';
  const value = isDeclared ? metric.value : metric.value ?? '—';

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
      <span className="flex items-center gap-1.5 text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1">
        {metric.label}
        {isDeclared && (
          <span className="px-1 py-px rounded bg-zinc-800 text-zinc-400 text-[8px] tracking-normal normal-case font-medium">
            declared
          </span>
        )}
      </span>
      <span className={`block text-sm font-mono font-bold ${isDeclared ? 'text-gray-500' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}

export function FeexSovereignEngine({ onSwitchToDossier }: { onSwitchToDossier?: () => void }) {
  const navigate = useNavigate();
  // Canonical World Model state — grounds every metric rendered below.
  const worldModel = useSovereignWorldModel();
  const ecosystemNodes = worldModel.worlds;
  const [activeTab, setActiveTab] = useState('ALL SYSTEMS');
  const [selectedNode, setSelectedNode] = useState<GroundedWorld | null>(null);
  const [isOmniCommandOpen, setIsOmniCommandOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [omniInput, setOmniInput] = useState('');
  const omniInputRef = useRef<HTMLInputElement>(null);

  // 3D scene orbit state
  const [autoRotate, setAutoRotate] = useState(true);

  // When a 3D satellite node is clicked, look it up by id in the canonical
  // world list and update the HUD inspector. Unknown ids are silently ignored.
  const handleSovereignNodeSelect = useCallback(
    (id: string) => {
      const match = ecosystemNodes.find((w) => w.id === id);
      if (match) {
        setSelectedNode(match);
        setActiveTab(match.id);
        try {
          sonikAudio.unlockAudio();
          sonikAudio.playCyberClick();
        } catch {
          // Audio is tactile feedback only — never blocks selection.
        }
      }
    },
    [ecosystemNodes]
  );

  // ── HUD telemetry stream (canonical WS with clearly-labeled SIM fallback) ──
  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryPayload[]>([]);
  const handleTelemetryEvent = useCallback((payload: TelemetryPayload) => {
    setTelemetryEvents((prev) => [...prev.slice(-5), payload]);
  }, []);
  useProductionServerTelemetry(handleTelemetryEvent);
  const latestTelemetry = telemetryEvents.length > 0 ? telemetryEvents[telemetryEvents.length - 1] : null;
  const isSimulatedFeed = !latestTelemetry || latestTelemetry.simulated;
  const feedLabel = isSimulatedFeed ? 'SIMULATED FEED' : 'PROD V3.8 LIVE';

  // ── Tactical joystick pad (probe vector override) ──
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const joystickDraggingRef = useRef(false);
  const joystickPadRef = useRef<HTMLDivElement>(null);
  const updateJoystickFromClient = useCallback((clientX: number, clientY: number) => {
    const el = joystickPadRef.current;
    if (!el) return;
    try {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = Math.max(-40, Math.min(40, clientX - cx));
      const dy = Math.max(-40, Math.min(40, clientY - cy));
      setJoystickPos({ x: Math.round(dx), y: Math.round(dy) });
    } catch {
      setJoystickPos({ x: Math.round(clientX % 40), y: Math.round(clientY % 40) });
    }
  }, []);

  // Joystick THREE.Vector2 forwarded to the navigator drone.
  const joystick3D = useMemo(
    () => new THREE.Vector2(joystickPos.x / 40, joystickPos.y / 40),
    [joystickPos.x, joystickPos.y]
  );

  // ── Sonik audio mute state (procedural WebAudio, gesture-unlocked) ──
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return sonikAudio.isMuted();
    } catch {
      return false;
    }
  });

  // Keep a valid selection as canonical data settles: default to the first
  // world on load, and re-resolve if the selected world disappears.
  useEffect(() => {
    if (ecosystemNodes.length === 0) return;
    setSelectedNode((current) => {
      if (!current) return ecosystemNodes[0];
      return ecosystemNodes.find((n) => n.id === current.id) ?? ecosystemNodes[0];
    });
  }, [ecosystemNodes]);

  // Packet animation timings are seeded ONCE per node list. Randomizing them in
  // render would restart every animateMotion orbit on each re-render (node
  // selection, drawer toggle, palette open).
  const packetTimings = useMemo<Record<string, EvidencePacketTiming>>(() => {
    const timings: Record<string, EvidencePacketTiming> = {};
    for (const node of ecosystemNodes) {
      timings[node.id] = {
        delay: Math.random() * 5,
        duration: 2 + Math.random() * 3,
      };
    }
    return timings;
  }, [ecosystemNodes]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Never hijack keys typed into a field or the browser's own Cmd/Ctrl+K
      // behaviour while focus lives somewhere editable.
      if (isEditableTarget(e.target)) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOmniCommandOpen(prev => !prev);
        return;
      }
      if (e.key === 'Escape') {
        setIsOmniCommandOpen(false);
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOmniCommandOpen && omniInputRef.current) {
      omniInputRef.current.focus();
    }
  }, [isOmniCommandOpen]);

  if (!selectedNode) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-zinc-500 font-mono text-xs uppercase tracking-widest">
        Initializing World Model…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans relative overflow-x-hidden selection:bg-white selection:text-black">
      {/* Background Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-[#050505]/80 to-[#050505] pointer-events-none z-0" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/5 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* CRT Emulation Layer */}
      <div
        className="fixed inset-0 pointer-events-none z-40 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 4px, 3px 100%'
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-40 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]" />

      {/* ── FeexSystems Premium Navigation Bar ─────────────────────── */}
      <header className="relative z-30 sticky top-0">
        {/* Glassmorphism base */}
        <div className="absolute inset-0 bg-[#030303]/85 backdrop-blur-2xl border-b border-white/[0.06]" />
        {/* Phosphor green top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ff41]/40 to-transparent" />

        <nav className="relative flex items-center justify-between px-6 lg:px-10 h-16" aria-label="FeexSystems primary navigation">

          {/* ── Logo Mark + Wordmark ────────────────────────────────── */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff41]/60 rounded-xl"
            aria-label="FeexSystems — go to home"
          >
            {/* Animated geometric FX icon */}
            <div className="relative w-9 h-9 flex-shrink-0">
              {/* Outer rotating ring */}
              <div className="absolute inset-0 rounded-xl border border-[#00ff41]/25 group-hover:border-[#00ff41]/60 transition-colors duration-500" />
              {/* Inner panel */}
              <div className="absolute inset-[3px] rounded-lg bg-[#00ff41]/5 group-hover:bg-[#00ff41]/10 transition-colors duration-300 flex items-center justify-center">
                {/* FX letterform */}
                <svg viewBox="0 0 20 20" fill="none" className="w-[14px] h-[14px]" aria-hidden="true">
                  {/* F */}
                  <path d="M2 4h6M2 4v12M2 10h5" stroke="#00ff41" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  {/* X */}
                  <path d="M11 4l7 12M18 4l-7 12" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              {/* Pulse glow */}
              <div className="absolute inset-0 rounded-xl bg-[#00ff41]/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>

            {/* Wordmark */}
            <div className="text-left">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[15px] font-black tracking-[0.18em] text-white uppercase leading-none group-hover:text-white transition-colors">
                  Feex
                </span>
                <span className="text-[15px] font-black tracking-[0.18em] text-[#00ff41] uppercase leading-none">
                  Systems
                </span>
              </div>
              <p className="text-[8.5px] tracking-[0.28em] uppercase text-zinc-600 font-medium leading-none mt-0.5 group-hover:text-zinc-400 transition-colors">
                Living Intelligence
              </p>
            </div>
          </button>

          {/* ── Center Nav Links ─────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-1" role="menubar">
            {[
              { name: 'Spatial World',   path: '/world',     icon: Globe,     hotkey: 'W' },
              { name: 'Navigator',       path: '/navigator', icon: Compass,   hotkey: 'N' },
              { name: 'Omni-Command',    path: '/omni',      icon: Terminal,  hotkey: '⌘K' },
              { name: 'Evidence Fabric', path: '/evidence',  icon: Database,  hotkey: 'E' },
              { name: 'Projects',        path: '/projects',  icon: Layers,    hotkey: 'P' },
            ].map((link) => {
              const Icon = link.icon;
              const isActive = typeof window !== 'undefined' && window.location.pathname === link.path;
              return (
                <button
                  key={link.name}
                  role="menuitem"
                  onClick={() => navigate(link.path)}
                  title={`${link.name} (${link.hotkey})`}
                  className={`
                    relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-[11px] font-semibold
                    tracking-wide transition-all duration-200 group/nav
                    ${isActive
                      ? 'text-white bg-white/8'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-[#00ff41]' : 'group-hover/nav:text-[#00ff41]/70'}`} />
                  <span>{link.name}</span>
                  {/* Active underline */}
                  {isActive && (
                    <span className="absolute bottom-1 left-3.5 right-3.5 h-[1.5px] bg-[#00ff41]/60 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Right Controls ───────────────────────────────────────── */}
          <div className="flex items-center gap-3">

            {/* Live system status pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.07] bg-white/[0.03]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff41] opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ff41]" />
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">
                {worldModel.grounding === 'live' ? 'World Model Live' : worldModel.grounding === 'partial' ? 'Partial Sync' : 'Offline Fixture'}
              </span>
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px h-5 bg-white/10" />

            {/* Sound toggle */}
            <button
              type="button"
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              aria-pressed={isMuted}
              onClick={() => {
                try { const next = sonikAudio.toggleMute(); setIsMuted(next); sonikAudio.triggerHaptic(10); } catch {}
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound'}</span>
            </button>

            {/* Sign In */}
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:flex text-[11px] font-semibold text-zinc-500 hover:text-white transition-colors px-2 py-2"
            >
              Sign In
            </button>

            {/* Primary CTA */}
            <button
              onClick={onSwitchToDossier}
              className="
                relative flex items-center gap-2 px-4 py-2.5 rounded-xl
                bg-white text-black text-[11px] font-black uppercase tracking-[0.12em]
                shadow-[0_0_20px_rgba(255,255,255,0.15),0_0_40px_rgba(0,255,65,0.08)]
                hover:shadow-[0_0_25px_rgba(255,255,255,0.25),0_0_50px_rgba(0,255,65,0.12)]
                hover:bg-zinc-100 transition-all duration-200 hover:-translate-y-px
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff41]/60
              "
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explore FeexSystems</span>
            </button>
          </div>
        </nav>
      </header>

      {/* ── Full-width Sovereign Engine 3D Canvas ───────────────────── */}
      <section className="relative z-10 w-full px-4 pb-0 pt-6">
        <div className="relative w-full h-[680px] rounded-3xl bg-[#020202] border border-white/10 overflow-hidden shadow-[0_0_80px_rgba(0,255,65,0.06)] group">

          {/* Live Sovereign 3D Engine */}
          <div className="absolute inset-0 z-0">
            <SovereignScene
              selectedNodeId={selectedNode?.id ?? null}
              onSelectNode={handleSovereignNodeSelect}
              joystickVector={joystick3D}
              autoRotate={autoRotate}
            />
          </div>

          {/* Radial vignette — blends canvas into panel border */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.55)_100%)] pointer-events-none z-10" />

          {/* Top-left HUD badge */}
          <div className="absolute top-5 left-5 z-20 pointer-events-none flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl">
              <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-400">SOVEREIGN ENGINE</span>
              <span className="text-zinc-700">·</span>
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#00ff41]">LIVE</span>
            </div>
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-xl">
              <GroundingBadge grounding={worldModel.grounding} loading={worldModel.loading} />
            </div>
          </div>

          {/* Top-right controls row */}
          <div className="absolute top-5 right-5 z-20 flex items-center gap-3">
            {/* Telemetry pill */}
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${isSimulatedFeed ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}
                aria-hidden="true"
              />
              <span className={`font-mono text-[9px] uppercase tracking-widest ${isSimulatedFeed ? 'text-amber-400' : 'text-emerald-400'}`}>
                {feedLabel}
              </span>
            </div>

            {/* Orbit toggle */}
            <button
              onClick={() => setAutoRotate((r) => !r)}
              title={autoRotate ? 'Pause orbit' : 'Resume orbit'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-mono uppercase tracking-widest transition-all ${
                autoRotate
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-black/80 text-white/60 border-white/20 hover:text-white backdrop-blur-md'
              }`}
            >
              <RotateCw className={`w-3 h-3 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
              <span>ORBIT</span>
            </button>
          </div>

          {/* Bottom status strip */}
          <div className="absolute bottom-5 left-5 right-5 z-20 flex items-center justify-between">
            <div className="flex items-center gap-4 bg-black/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 shadow-xl">
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">60 FPS LOCKED</span>
              <span className="text-zinc-700">|</span>
              <span><strong className="text-white text-[10px] tracking-widest font-mono">{selectedNode.shortTitle}</strong></span>
              <span className="text-zinc-700">|</span>
              <button
                onClick={() => navigate('/world')}
                className="text-white hover:text-[#00ff41] flex items-center space-x-1 uppercase text-[10px] tracking-wider font-bold transition-colors"
              >
                <span>Enter Full Space</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              {onSwitchToDossier && (
                <>
                  <span className="text-zinc-700">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      try { sonikAudio.unlockAudio(); sonikAudio.playCyberClick(); } catch {}
                      onSwitchToDossier();
                    }}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 uppercase text-[10px] tracking-wider font-bold transition-colors"
                  >
                    <span>Technical Dossier</span>
                    <Database className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>

            {/* Joystick probe control */}
            <div className="hidden sm:block">
              <div
                id="tactile-joystick-pad"
                ref={joystickPadRef}
                role="slider"
                tabIndex={0}
                aria-label="Tactile probe vector override"
                aria-valuemin={-40}
                aria-valuemax={40}
                aria-valuetext={`X ${joystickPos.x}, Y ${joystickPos.y}`}
                aria-valuenow={joystickPos.x}
                onMouseDown={(e) => {
                  joystickDraggingRef.current = true;
                  updateJoystickFromClient(e.clientX, e.clientY);
                  try { sonikAudio.unlockAudio(); sonikAudio.playCyberClick(); sonikAudio.triggerHaptic(10); } catch {}
                }}
                onMouseMove={(e) => { if (joystickDraggingRef.current) updateJoystickFromClient(e.clientX, e.clientY); }}
                onMouseUp={() => { joystickDraggingRef.current = false; setJoystickPos({ x: 0, y: 0 }); }}
                onMouseLeave={() => { if (joystickDraggingRef.current) { joystickDraggingRef.current = false; setJoystickPos({ x: 0, y: 0 }); } }}
                onKeyDown={(e) => {
                  const step = 4;
                  if (e.key === 'ArrowLeft') setJoystickPos((p) => ({ ...p, x: Math.max(-40, p.x - step) }));
                  else if (e.key === 'ArrowRight') setJoystickPos((p) => ({ ...p, x: Math.min(40, p.x + step) }));
                  else if (e.key === 'ArrowUp') setJoystickPos((p) => ({ ...p, y: Math.max(-40, p.y - step) }));
                  else if (e.key === 'ArrowDown') setJoystickPos((p) => ({ ...p, y: Math.min(40, p.y + step) }));
                  else if (e.key === 'Home' || e.key === '0') setJoystickPos({ x: 0, y: 0 });
                }}
                className="relative h-[72px] w-[72px] rounded-full border border-white/15 bg-black/85 backdrop-blur-md shadow-xl cursor-crosshair select-none"
              >
                <span className="absolute inset-2 rounded-full border border-white/10" aria-hidden="true" />
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 h-6 w-6 rounded-full border border-white/25 bg-white/10 shadow-[0_0_12px_rgba(0,255,65,0.3)]"
                  style={{ transform: `translate(calc(-50% + ${joystickPos.x}px), calc(-50% + ${joystickPos.y}px))` }}
                />
                <span className="sr-only">Probe vector X {joystickPos.x}, Y {joystickPos.y}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sidebars — side-by-side below the full-width canvas ─────── */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Left Sidebar — World Model Map */}
        <div className="space-y-6">
          <LeftSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            nodes={ecosystemNodes}
            canonicalCount={worldModel.canonicalProjectCount}
          />
        </div>

        {/* Right Sidebar — Node Inspector + Evidence Fabric */}
        <div className="space-y-6">
          <RightSidebar
            selectedNode={selectedNode}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            grounding={worldModel.grounding}
            status={worldModel.status}
            totalArtifacts={worldModel.totalArtifacts}
          />
        </div>

      </main>

      {/* High-concept scrollytelling — mission typography grounded in the catalog */}
      <section aria-label="FeexSystems mission" className="relative z-10 max-w-[1400px] mx-auto px-6 pb-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#0a0a0a]/80 p-6 backdrop-blur-xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Mission 01</p>
          <h2 className="mt-2 text-xl font-black uppercase tracking-widest text-white">
            Building the Systems Behind Tomorrow&apos;s Intelligence
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-zinc-400">
            {latestTelemetry ? latestTelemetry.msg : '» SIM FEED: Procedural placeholder — canonical ledger stream connecting…'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0a0a0a]/80 p-6 backdrop-blur-xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Mission 02</p>
          <h2 className="mt-2 text-xl font-black uppercase tracking-widest text-white">
            7-Tier Sovereign Modular Engine
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-zinc-400">
            Grounded in Production Code — {worldModel.canonicalProjectCount} of {ecosystemNodes.length} worlds
            resolved against the canonical World Model.
          </p>
        </div>
      </section>

      {/* Footer Credits */}
      <footer className="relative z-10 max-w-[1400px] mx-auto px-6 py-12 mt-4 border-t border-white/10 flex flex-col items-center justify-center text-center text-zinc-500">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-black tracking-[0.2em] text-white uppercase">FeexSystems</span>
        </div>
        <p className="text-xs text-zinc-400 max-w-lg mb-6 leading-relaxed">
          Living Engineering Intelligence powered by the World Model and Evidence Fabric.
          The ecosystem organizes production architectures across domains, backed by realtime dossiers and verifiable GitHub evidence.
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-[10px] uppercase tracking-widest font-mono font-bold text-zinc-500">
          <button
            onClick={() => {
              if (onSwitchToDossier) {
                try {
                  sonikAudio.unlockAudio();
                  sonikAudio.playCyberClick();
                } catch {
                  // Procedural audio is tactile feedback only — never blocks routing.
                }
                onSwitchToDossier();
              } else {
                setIsDrawerOpen(true);
              }
            }}
            className="hover:text-white transition-colors"
          >
            Technical Dossier
          </button>
          <span className="hover:text-white transition-colors cursor-pointer">Security Mesh</span>
          <Link to="/health" className="hover:text-white transition-colors">System Health</Link>
        </div>
        <p className="mt-8 font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-600">
          © 2026 FEEXSYSTEMS INC. ALL RIGHTS RESERVED. · {worldModel.canonicalProjectCount}/{ecosystemNodes.length} WORLDS GROUNDED
        </p>
      </footer>

      {/* Global Command Palette Modal */}
      {isOmniCommandOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOmniCommandOpen(false)} />
          <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center px-4 py-3 border-b border-white/10">
              <Search className="w-5 h-5 text-zinc-400 mr-3" />
              <input 
                ref={omniInputRef}
                type="text" 
                value={omniInput}
                onChange={(e) => setOmniInput(e.target.value)}
                placeholder="Launch Omni-Command (e.g. > inspect firehouse grills)"
                className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder:text-zinc-600"
              />
              <span className="text-[10px] text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded ml-2">ESC</span>
            </div>
            <div className="p-2 bg-[#050505] min-h-[120px]">
              {omniInput.length > 0 ? (
                <div className="px-3 py-2 text-xs font-mono text-zinc-400">
                  <span className="text-zinc-600">{'>'}</span> Executing command...
                </div>
              ) : (
                <div className="px-3 py-2 text-[10px] uppercase font-bold tracking-widest text-zinc-600">
                  Recent Commands
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drill-Down Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="relative w-full max-w-xl h-full bg-[#0a0a0a]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col translate-x-0 transition-transform duration-300 ease-out">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white flex items-center space-x-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Technical Dossier</span>
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                  World Model Insight
                </p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close technical dossier"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-[#111] border border-white/10 rounded-xl p-5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Subject: {selectedNode.shortTitle}</h4>
                <p className="text-sm text-zinc-400 leading-relaxed font-mono">
                  {selectedNode.description}
                </p>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-mono mt-3 pt-3 border-t border-white/10">
                  {selectedNode.canonical
                    ? 'Entity resolved against the canonical World Model. Metrics marked CANONICAL are measured; DECLARED values are positioning copy, not telemetry.'
                    : 'No canonical World Model row matched this world yet. Run a GitHub sync to ground it — all canonical metrics render as “—” until then.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {selectedNode.resolvedMetrics.map((metric) => (
                  <MetricCard key={metric.label} metric={metric} />
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-white/10 bg-[#050505]">
              <button 
                onClick={() => navigate(`/projects?focus=${selectedNode.id}`)}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
              >
                <span>Full Deep Dive</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeexSovereignEngine;
