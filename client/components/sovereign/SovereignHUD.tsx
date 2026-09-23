import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Network, Layers, Play, Database, Terminal, Loader2 } from 'lucide-react';
import type { GroundedWorld, GroundingLevel, WorldModelStatus } from './useSovereignWorldModel';
import { TextScrambleMorph } from '../motion/TextScrambleMorph';

interface LeftSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedNode: GroundedWorld;
  setSelectedNode: (node: GroundedWorld) => void;
  /** Canonical world list — never a hardcoded count. */
  nodes: GroundedWorld[];
  /** Worlds with a matching row in the canonical World Model. */
  canonicalCount: number;
}

export function LeftSidebar({ activeTab, setActiveTab, selectedNode, setSelectedNode, nodes, canonicalCount }: LeftSidebarProps) {
  return (
    <>
      <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transition-all" />

        <h2 className="text-sm font-bold tracking-widest text-white uppercase mb-5 flex items-center space-x-2">
          <Network className="w-4 h-4 text-zinc-400" />
          <span>World Model Map</span>
        </h2>

        <div className="space-y-1.5">
          <button
            onClick={() => setActiveTab('ALL SYSTEMS')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'ALL SYSTEMS'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Layers className={`w-4 h-4 ${activeTab === 'ALL SYSTEMS' ? 'text-black' : 'text-zinc-600'}`} />
              <span>ALL SYSTEMS</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'ALL SYSTEMS' ? 'bg-black/10 text-black' : 'bg-[#111] text-zinc-400 border border-white/10'}`}>
              {canonicalCount}/{nodes.length}
            </span>
          </button>

          {nodes.map((node) => {
            const IconComponent = node.icon;
            const isActive = selectedNode.id === node.id && activeTab !== 'ALL SYSTEMS';
            return (
              <button
                key={node.id}
                onClick={() => {
                  setSelectedNode(node);
                  setActiveTab(node.id);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-600'}`} />
                  <span className="truncate max-w-[140px] text-left">{node.shortTitle}</span>
                </div>
                {!node.canonical && (
                  <span className="shrink-0 text-[9px] text-amber-500/70" title="No canonical World Model row matched this world">
                    ○
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="bg-[#0a0a0a]/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 relative">
        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
          "The World Model is the canonical system representation. Spatial position carries graph meaning. The LLM interprets the World Model; it does not become the World Model."
        </p>
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-300 font-mono">
          <span>FeexSystems Doctrine</span>
          <span className="text-zinc-500">Invariant #1</span>
        </div>
      </div>
    </>
  );
}

interface RightSidebarProps {
  selectedNode: GroundedWorld;
  onOpenDrawer?: () => void;
  grounding: GroundingLevel;
  status: WorldModelStatus;
  totalArtifacts: number;
}

export function RightSidebar({ selectedNode, onOpenDrawer, grounding, status, totalArtifacts }: RightSidebarProps) {
  const navigate = useNavigate();

  // Evidence Fabric rows are DERIVED from canonical state — never hardcoded.
  // When an endpoint did not answer the row reports that honestly instead of
  // claiming "Grounded".
  const providerCount = status.providers
    ? [status.providers.gemini, status.providers.openai, status.providers.anthropic].filter(Boolean).length
    : null;

  const evidenceRows: Array<{ label: string; status: string; ok: boolean | null }> = [
    {
      label: 'Canonical Reality',
      status: selectedNode.canonical ? 'Grounded' : 'Unmatched',
      ok: selectedNode.canonical,
    },
    {
      label: 'Graph Topology',
      status: grounding === 'fixture' ? 'Unreachable' : grounding === 'partial' ? 'Partial' : 'Synced',
      ok: grounding === 'fixture' ? false : grounding === 'partial' ? null : true,
    },
    {
      label: 'Temporal State',
      status:
        status.maintenance?.lastRunAt
          ? new Date(status.maintenance.lastRunAt).toLocaleDateString()
          : status.maintenance
            ? 'Never run'
            : 'Unknown',
      ok: status.maintenance?.lastRunAt ? true : null,
    },
    {
      label: 'Model Providers',
      status: providerCount === null ? 'Unknown' : `${providerCount} configured`,
      ok: providerCount === null ? null : providerCount > 0,
    },
  ];

  return (
    <>
      <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative min-h-[280px] flex flex-col">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-[9px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-white/5 text-zinc-400 border border-white/10 font-bold">
                {selectedNode.category}
              </span>
              <h3 className="text-lg font-bold text-white mt-3 tracking-wide">
                <TextScrambleMorph text={selectedNode.title} speed={10} characters="01_@#" />
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1 font-medium">
                <TextScrambleMorph text={selectedNode.tagline} speed={8} />
              </p>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed mb-6">
            <TextScrambleMorph text={selectedNode.description} speed={2} triggerOnHover={false} />
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {selectedNode.resolvedMetrics.slice(0, 4).map((metric) => {
              const isDeclared = metric.source === 'declared';
              return (
                <div key={metric.label} className="bg-[#111] border border-white/5 rounded-xl p-3 relative overflow-hidden group">
                  <p className="text-[9px] uppercase text-zinc-500 font-bold tracking-wider mb-1 relative z-10">
                    {metric.label}
                    {isDeclared && <span className="ml-1 text-zinc-600 normal-case tracking-normal">(declared)</span>}
                  </p>
                  <p
                    className={`text-xs font-mono tabular-nums font-bold relative z-10 ${isDeclared ? 'text-zinc-500' : 'text-white'}`}
                    title={isDeclared ? 'Positioning statement — not a live measurement' : undefined}
                  >
                    {isDeclared ? metric.value : metric.value ?? '—'}
                  </p>
                  {/* Minimalist Sparkline Background */}
                  <div className="absolute inset-x-0 bottom-0 h-6 opacity-30 group-hover:opacity-70 transition-opacity pointer-events-none">
                    <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
                      <polyline
                        points="0,25 15,10 30,20 45,5 60,15 75,10 85,20 100,2"
                        fill="none"
                        stroke="#39FF14"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M0,30 L0,25 L15,10 L30,20 L45,5 L60,15 L75,10 L85,20 L100,2 L100,30 Z"
                        fill="url(#sparklineGradient)"
                        opacity="0.2"
                      />
                      <defs>
                        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#39FF14" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="#39FF14" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <button 
          onClick={onOpenDrawer ? onOpenDrawer : () => navigate(`/projects?focus=${selectedNode.id}`)}
          className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-zinc-200 text-black px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Inspect Project</span>
        </button>
      </div>

      <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-2">
            <h4 className="text-[10px] font-bold tracking-[0.15em] text-white uppercase">Evidence Fabric</h4>
            <Loader2 className={`w-3 h-3 animate-spin ${grounding === 'live' ? 'text-[#39FF14]' : 'text-amber-500'}`} />
          </div>
          <Link to="/evidence" className="text-[10px] text-zinc-500 hover:text-white transition-colors underline underline-offset-2">View Log</Link>
        </div>

        <div className="space-y-4">
          {evidenceRows.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs border-b border-white/5 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center space-x-3">
                <Database className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-zinc-300 font-medium">{item.label}</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                item.ok === true ? 'bg-white/10 text-white' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {item.status}
              </span>
            </div>
          ))}\n          {totalArtifacts > 0 && (
            <p className="text-[10px] font-mono text-zinc-500 pt-1">
              {totalArtifacts} canonical artifacts observed across grounded worlds.
            </p>
          )}
        </div>
        
        <button 
          onClick={() => navigate('/omni')}
          className="mt-5 w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#111] border border-white/10 hover:border-white/30 transition-all group"
        >
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
            <span className="text-xs font-mono text-zinc-400 group-hover:text-white transition-colors">Launch Omni-Command</span>
          </div>
          <span className="text-white font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity">_</span>
        </button>
      </div>
    </>
  );
}