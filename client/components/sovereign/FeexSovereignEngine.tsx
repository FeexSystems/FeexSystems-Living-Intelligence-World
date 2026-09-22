import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LeftSidebar, RightSidebar } from './SovereignHUD';
import { SovereignScene } from './SovereignScene';
import { Globe, Activity, Sprout, DollarSign, Music, Anchor, Bot, Terminal, Sparkles, Flame, Key, Compass, ArrowRight, Database, Layers, X, Search } from 'lucide-react';

function getStatusColor(status: string) {
  if (status === 'Operational' || status === 'Live') return '#39FF14'; // Neon Green
  if (status.includes('Secured') || status.includes('Synchronizing') || status.includes('Archived')) return '#708090'; // Dim Blue-Gray
  if (status.includes('Warning') || status.includes('Degraded')) return '#FFBF00'; // Amber
  if (status.includes('Critical') || status.includes('Offline')) return '#DC143C'; // Crimson
  return '#39FF14';
}

// Canonical 8 Worlds defined in PR #34 / PASS 11 synchronization
export const ECOSYSTEM_NODES = [
  { id: 'yurrheeler', title: 'YURRHEELER AI', tagline: 'Healthcare Intelligence System', category: 'HEALTHCARE', description: 'Advanced medical intelligence platform providing real-time diagnostics, genomics synthesis, and autonomous clinical workflow optimization.', icon: Activity, metrics: { status: 'Operational', latency: '12ms', nodes: '450+' }, position: { top: '22%', left: '26%' } },
  { id: 'firehouse', title: 'FIREHOUSE GRILLS', tagline: 'AI Shopping & Voice Intelligence', category: 'RETAIL & COMMERCE', description: 'Immersive smart-retail infrastructure powered by autonomous multi-modal voice agents and predictive supply chain execution.', icon: Flame, metrics: { status: 'Operational', throughput: '1.2M req/s', efficiency: '+340%' }, position: { top: '15%', left: '50%' } },
  { id: 'farmplug', title: 'FARMPLUG AI', tagline: 'Voice Crop Guidance & Market Intel', category: 'AGRICULTURE', description: 'Precision agronomy operating system leveraging satellite telemetry and voice neural nets to maximize yield and direct market liquidity.', icon: Sprout, metrics: { status: 'Operational', telemetry: 'Active', markets: '14' }, position: { top: '22%', left: '74%' } },
  { id: 'feexkeeauth', title: 'FEEXKEEAUTH', tagline: 'Zero-Trust Security Mesh', category: 'SECURITY & IDENTITY', description: 'Quantum-resistant zero-trust encryption mesh safeguarding distributed planetary assets against autonomous cyber threats.', icon: Key, metrics: { status: 'Secured', uptime: '99.999%', encryption: 'Active' }, position: { top: '48%', left: '20%' } },
  { id: 'holokai', title: 'HOLOKAI', tagline: 'Nigerian Renaissance Robot', category: 'ROBOTICS & AGENTS', description: 'Next-generation humanoid robotics platform equipped with emotional intelligence, spatial computing, and localized cultural neural frameworks.', icon: Bot, metrics: { status: 'Synchronizing', processing: '400 PFLOPS', autonomy: 'Level 5' }, position: { top: '42%', left: '78%' } },
  { id: 'rentall', title: 'RENTALL', tagline: 'Maritime & Property Intelligence', category: 'MARITIME & LIVING', description: 'Autonomous property intelligence and maritime logistics tracking system optimizing energy grids and vessel routing across the Atlantic.', icon: Anchor, metrics: { status: 'Operational', vessels: '128 Active', grids: 'Optimized' }, position: { top: '65%', left: '26%' } },
  { id: 'kappaxchangefin', title: 'KAPPAXCHANGEFIN', tagline: 'Finance & Trading Infrastructure', category: 'FINANCE', description: 'High-frequency decentralized liquidity engine connecting emerging African markets with global algorithmic institutional capital.', icon: DollarSign, metrics: { status: 'Operational', latency: '1.4ms', pools: '1,200+' }, position: { top: '72%', left: '50%' } },
  { id: '3wm', title: '3WM SONIK LABS', tagline: 'Creative & Audio Intelligence', category: 'CREATIVE MEDIA', description: 'AI-native audio synthesis and creative intelligence world generating dynamic auditory environments and multi-modal media.', icon: Music, metrics: { status: 'Operational', synthesis: 'Real-time', nodes: 'Active' }, position: { top: '65%', left: '74%' } },
  { id: 'vyralabs', title: 'VYRA LABS', tagline: 'Creator AI Chat Interface', category: 'SOCIAL INTELLIGENCE', description: 'The first creator chat interface platform with full AI Core features and FanDNA. Repo is on feexsystems github.', icon: Layers, metrics: { status: 'Live', AI: 'Core Features', Engine: 'FanDNA' }, position: { top: '48%', left: '86%' } }
];

export function FeexSovereignEngine({ onSwitchToDossier }: { onSwitchToDossier?: () => void }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ALL SYSTEMS');
  const [selectedNode, setSelectedNode] = useState(ECOSYSTEM_NODES[0]);
  const [isOmniCommandOpen, setIsOmniCommandOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [omniInput, setOmniInput] = useState('');
  const omniInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOmniCommandOpen(prev => !prev);
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

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans relative overflow-x-hidden selection:bg-white selection:text-black">
      {/* Background Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-[#050505]/80 to-[#050505] pointer-events-none z-0" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/5 blur-[120px] rounded-full pointer-events-none z-0" />
      
      {/* CRT Emulation Layer */}
      <div 
        className="fixed inset-0 pointer-events-none z-40 opacity-[0.03] mix-blend-overlay"
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
          />
        </div>

        {/* Center Canvas: The Spatial OS */}
        <div className="lg:col-span-6 space-y-6">
          <div className="relative h-[520px] w-full rounded-3xl bg-[#020202] border border-white/10 overflow-hidden shadow-2xl flex flex-col items-center justify-center group">
            
            {/* React Three Fiber Canvas Mount */}
            <div className="absolute inset-0 z-0 opacity-90">
              <SovereignScene />
            </div>
            
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none" />
            
            {/* Central Title */}
            <div className="absolute top-8 z-10 text-center pointer-events-none">
              <h2 className="text-3xl lg:text-4xl font-black tracking-[0.2em] text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                FEEX WORLD
              </h2>
              <p className="text-[10px] font-semibold tracking-[0.4em] text-zinc-400 mt-2 uppercase">
                Interactive Persona OS
              </p>
            </div>

            {/* Evidence Fabric Data Packets SVG Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              {ECOSYSTEM_NODES.map((node) => {
                const statusColor = getStatusColor(node.metrics.status);
                // Convert percentage strings to numbers
                const top = parseFloat(node.position.top);
                const left = parseFloat(node.position.left);
                // Add a random delay for the animation
                const delay = Math.random() * 5;
                const duration = 2 + Math.random() * 3;
                
                return (
                  <g key={`connection-${node.id}`}>
                    <line 
                      x1="50%" 
                      y1="50%" 
                      x2={`${left}%`} 
                      y2={`${top}%`} 
                      stroke={statusColor} 
                      strokeWidth="1" 
                      opacity="0.15" 
                      strokeDasharray="4 4"
                    />
                    <circle r="2" fill={statusColor} filter="drop-shadow(0 0 4px currentColor)">
                      <animateMotion 
                        path={`M 50 50 L ${left} ${top}`}
                        dur={`${duration}s`}
                        begin={`${delay}s`}
                        repeatCount="indefinite"
                        keyPoints="0;1"
                        keyTimes="0;1"
                        calcMode="linear"
                      />
                      <animate 
                        attributeName="opacity"
                        values="0;1;0"
                        dur={`${duration}s`}
                        begin={`${delay}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                );
              })}
            </svg>

            {/* Interactive Canonical Nodes */}
            {ECOSYSTEM_NODES.map((node) => {
              const IconComp = node.icon;
              const isSelected = selectedNode.id === node.id;
              const statusColor = getStatusColor(node.metrics.status);
              
              return (
                <button
                  key={node.id}
                  onClick={() => {
                    setSelectedNode(node);
                    setActiveTab(node.id);
                  }}
                  style={{ top: node.position.top, left: node.position.left }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center group/node transition-all duration-500 ease-out cursor-crosshair`}
                >
                  <div 
                    className={`relative p-3.5 rounded-2xl backdrop-blur-md transition-all duration-300 ${
                      isSelected ? 'shadow-[0_0_30px_rgba(255,255,255,0.4)] scale-110 border-2' : 'bg-black/80 border hover:scale-105 shadow-xl'
                    }`}
                    style={{
                      borderColor: isSelected ? '#fff' : `${statusColor}40`,
                      backgroundColor: isSelected ? statusColor : 'rgba(0,0,0,0.8)',
                      color: isSelected ? '#000' : statusColor
                    }}
                  >
                    <IconComp className="w-5 h-5" />
                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white rounded-full border-2 border-black animate-ping" />
                    )}
                  </div>
                  <span 
                    className={`mt-2 px-3 py-1 rounded-full text-[9px] font-bold tracking-[0.1em] uppercase whitespace-nowrap backdrop-blur-md transition-all border`}
                    style={{
                      backgroundColor: isSelected ? statusColor : 'rgba(0,0,0,0.9)',
                      color: isSelected ? '#000' : statusColor,
                      borderColor: isSelected ? statusColor : `${statusColor}40`
                    }}
                  >
                    {node.title}
                  </span>
                </button>
              );
            })}

            {/* Bottom Controls */}
            <div className="absolute bottom-6 z-10 flex items-center space-x-4 bg-black/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 text-xs text-zinc-300 shadow-xl">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
                <span className="font-mono tracking-wider">SYNCED</span>
              </div>
              <span className="text-zinc-700">|</span>
              <span><strong className="text-white tracking-widest">{selectedNode.title}</strong></span>
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
                    onClick={() => setIsDrawerOpen(true)}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 uppercase text-[10px] tracking-wider font-bold transition-colors"
                  >
                    <span>Technical Dossier</span>
                    <Database className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <RightSidebar selectedNode={selectedNode} onOpenDrawer={() => setIsDrawerOpen(true)} />
        </div>

      </main>

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
          <button onClick={() => setIsDrawerOpen(true)} className="hover:text-white transition-colors">Technical Dossier</button>
          <span className="hover:text-white transition-colors cursor-pointer">Security Mesh</span>
          <Link to="/health" className="hover:text-white transition-colors">System Health</Link>
        </div>
        <p className="mt-8 font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-600">© 2026 FEEXSYSTEMS INC. ALL RIGHTS RESERVED.</p>
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
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-[#111] border border-white/10 rounded-xl p-5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Subject: {selectedNode.title}</h4>
                <p className="text-sm text-zinc-400 leading-relaxed font-mono">
                  {selectedNode.description}
                  <br /><br />
                  Entity anchored to Canonical Architecture. Grounded retrieval indicates active telemetry and stable synchronization.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(selectedNode.metrics).map(([k, v]) => (
                  <div key={k} className="bg-white/5 rounded-lg p-4 border border-white/5">
                    <span className="block text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1">{k}</span>
                    <span className="block text-sm font-mono text-emerald-400 font-bold">{v}</span>
                  </div>
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
