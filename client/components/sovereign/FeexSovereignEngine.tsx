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
  operational: '#39FF14',   // Neon Green
  secured: '#708090',       // Dim Blue-Gray
  synchronizing: '#708090', // Dim Blue-Gray
  'pending-repo': '#FFBF00',// Amber
  degraded: '#FFBF00',      // Amber
  offline: '#DC143C',       // Crimson
};

/** Returns the status color for a world, defaulting to neutral when unknown. */
export function getStatusColor(statusKind: WorldStatusKind | undefined): string {
  if (!statusKind) return '#708090';
  return STATUS_COLORS[statusKind] ?? '#708090';
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
      color: '#39FF14',
      hint: 'Graph, maintenance and provider status all answered from the World Model.',
    },
    partial: {
      label: 'PARTIAL',
      color: '#FFBF00',
      hint: 'Some canonical endpoints did not answer. Ungrounded metrics render as “—”.',
    },
    fixture: {
      label: 'OFFLINE FIXTURE',
      color: '#DC143C',
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
      <span className={`block text-sm font-mono font-bold ${isDeclared ? 'text-zinc-500' : 'text-emerald-400'}`}>
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

      {/* Header Navigation Bar */}
      <header className="relative z-20 flex items-center justify-between px-6 lg:px-12 py-5 border-b border-white/10 backdrop-blur-md bg-[#050505]/80 sticky top-0">
        <div className="flex items-center space-x-4 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.15)] border border-white/30">
            <Sparkles className="w-5 h-5 text-black animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-white uppercase">
              FeexSystems
            </h1>
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-medium">
              Living Engineering Intelligence
            </p>
          </div>
        </div>

        {/* Global Navigation Links */}
        <div className="hidden md:flex items-center space-x-1">
          {[
            { name: 'Spatial World', path: '/world', icon: Globe },
            { name: 'Navigator', path: '/navigator', icon: Compass },
            { name: 'Omni-Command', path: '/omni', icon: Terminal },
            { name: 'Evidence Fabric', path: '/evidence', icon: Database },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.name}
                onClick={() => navigate(link.path)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <Icon className="w-4 h-4" />
                <span>{link.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            type="button"
            aria-label={isMuted ? 'Unmute procedural HUD audio' : 'Mute procedural HUD audio'}
            aria-pressed={isMuted}
            onClick={() => {
              try {
                const next = sonikAudio.toggleMute();
                setIsMuted(next);
                sonikAudio.triggerHaptic(10);
              } catch {
                // Audio toggle is tactile feedback only — never blocks navigation.
              }
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? 'Muted' : 'Sound'}</span>
          </button>
          <button
            onClick={onSwitchToDossier}
            className="bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all transform hover:-translate-y-0.5 flex items-center space-x-2"
          >
            <span>Explore FeexSystems</span>
            <Database className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Hero & Planetary Grid Section */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <LeftSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            nodes={ecosystemNodes}
            canonicalCount={worldModel.canonicalProjectCount}
          />
        </div>

        {/* Center Canvas: The Spatial OS — live 3D Knowledge Galaxy */}
        <div className="lg:col-span-6 space-y-6">
          <div className="relative h-[520px] w-full rounded-3xl bg-[#020202] border border-white/10 overflow-hidden shadow-2xl group">

            {/* Live Sovereign 3D Engine — cinematic native scene */}
            <div className="absolute inset-0 z-0">
              <SovereignScene
                selectedNodeId={selectedNode?.id ?? null}
                onSelectNode={handleSovereignNodeSelect}
                joystickVector={joystick3D}
                autoRotate={autoRotate}
              />
            </div>

            {/* Subtle radial vignette to blend into the panel border */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_55%,_rgba(0,0,0,0.6)_100%)] pointer-events-none z-10" />

            {/* Top-left HUD badge */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none">
              <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl">
                <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-400">FEEX WORLD</span>
                <span className="text-zinc-700">·</span>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">KNOWLEDGE GALAXY</span>
              </div>
            </div>

            {/* Top-right: orbit toggle */}
            <div className="absolute top-4 right-4 z-20">
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

            {/* Bottom telemetry bar — unchanged from previous design */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-4 bg-black/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 text-xs text-zinc-300 shadow-xl whitespace-nowrap">
              <GroundingBadge grounding={worldModel.grounding} loading={worldModel.loading} />
              <span className="text-zinc-700">|</span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${isSimulatedFeed ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}
                  aria-hidden="true"
                />
                <span className={isSimulatedFeed ? 'text-amber-400' : 'text-emerald-400'}>
                  {feedLabel}
                </span>
              </span>
              <span className="text-zinc-700">|</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">60 FPS LOCKED</span>
              <span className="text-zinc-700">|</span>
              <span><strong className="text-white tracking-widest">{selectedNode.shortTitle}</strong></span>
              <span className="text-zinc-700">|</span>
              <button
                onClick={() => navigate('/world')}
                className="text-white hover:text-zinc-300 flex items-center space-x-1 uppercase text-[10px] tracking-wider font-bold"
              >
                <span>Enter Space</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              {onSwitchToDossier && (
                <>
                  <span className="text-zinc-700">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        sonikAudio.unlockAudio();
                        sonikAudio.playCyberClick();
                      } catch {
                        // Procedural audio is tactile feedback only — never blocks routing.
                      }
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

            {/* Tactical joystick pad — visual probe vector indicator (decorative) */}
            <div className="absolute bottom-6 right-4 z-20 hidden sm:block">
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
                  try {
                    sonikAudio.unlockAudio();
                    sonikAudio.playCyberClick();
                    sonikAudio.triggerHaptic(10);
                  } catch {
                    // Audio is tactile feedback only — never blocks joystick input.
                  }
                }}
                onMouseMove={(e) => {
                  if (joystickDraggingRef.current) updateJoystickFromClient(e.clientX, e.clientY);
                }}
                onMouseUp={() => {
                  joystickDraggingRef.current = false;
                  setJoystickPos({ x: 0, y: 0 });
                }}
                onMouseLeave={() => {
                  if (joystickDraggingRef.current) {
                    joystickDraggingRef.current = false;
                    setJoystickPos({ x: 0, y: 0 });
                  }
                }}
                onKeyDown={(e) => {
                  const step = 4;
                  if (e.key === 'ArrowLeft') setJoystickPos((p) => ({ ...p, x: Math.max(-40, p.x - step) }));
                  else if (e.key === 'ArrowRight') setJoystickPos((p) => ({ ...p, x: Math.min(40, p.x + step) }));
                  else if (e.key === 'ArrowUp') setJoystickPos((p) => ({ ...p, y: Math.max(-40, p.y - step) }));
                  else if (e.key === 'ArrowDown') setJoystickPos((p) => ({ ...p, y: Math.min(40, p.y + step) }));
                  else if (e.key === 'Home' || e.key === '0') setJoystickPos({ x: 0, y: 0 });
                }}
                className="relative h-20 w-20 rounded-full border border-white/15 bg-black/80 backdrop-blur-md shadow-xl cursor-crosshair select-none"
              >
                <span className="absolute inset-2 rounded-full border border-white/10" aria-hidden="true" />
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.25)]"
                  style={{ transform: `translate(calc(-50% + ${joystickPos.x}px), calc(-50% + ${joystickPos.y}px))` }}
                />
                <span className="sr-only">Probe vector X {joystickPos.x}, Y {joystickPos.y}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-3 space-y-6">
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
