const fs = require('fs');

const file = 'client/pages/Index.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Part 1: Replace lines 811-952 (1-indexed, so index 810 to 951)
const part1NewLines = `{/* ========================================================================= */}
        {/* SECTION // OUR CORE PRINCIPLE                                             */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-white/10 bg-[#050505]/85 backdrop-blur-[2px] py-20 md:py-28 relative overflow-hidden">
          <div className="container mx-auto max-w-5xl px-5 md:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
              <span className="size-1.5 rounded-full bg-white" />
              <span>// OUR CORE PRINCIPLE</span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-white max-w-4xl mx-auto my-4">
              We Build Systems, Not Just Applications.
            </h2>
            <p className="text-lg text-white/60 font-sans max-w-2xl mx-auto">
              The gap between "having AI capabilities" and "having an intelligent system" is engineering.
            </p>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION // 01 — OUR PHILOSOPHY                                             */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-white/10 bg-[#000000]/80 backdrop-blur-[2px] py-24 relative overflow-hidden">
          <div className="container mx-auto max-w-7xl px-5 md:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="max-w-2xl space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
                  <span>// 01 OUR PHILOSOPHY</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                  Intelligence Is an Ecosystem.
                </h2>
                <p className="text-base sm:text-lg text-white/60 font-sans leading-relaxed">
                  True intelligence doesn't live in a single model or a standalone API. It emerges when robust software architecture, authoritative data pipelines, and responsive human interfaces are woven together. We don't just prompt models; we build the foundational systems that allow models to reason accurately and operate safely.
                </p>
              </div>
              <div className="flex justify-center lg:justify-end">
                <div className="w-full aspect-video border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden flex items-center justify-center p-8">
                   <div className="w-full h-full opacity-50 flex flex-col justify-center gap-4">
                     <TransitionVisualizer />
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION // 02 — OUR ARCHITECTURE                                           */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-white/10 bg-[#050505]/85 backdrop-blur-[2px] py-24 relative overflow-hidden">
          <div className="container mx-auto max-w-7xl px-5 md:px-8 space-y-16">
            <div className="max-w-3xl space-y-4">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
                  <span>// 02 OUR ARCHITECTURE</span>
                </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
                The Spectrum of Intelligence.
              </h2>
              <p className="text-base sm:text-lg text-white/60 font-sans leading-relaxed">
                From deterministic data systems to autonomous agentic layers, we architect across the entire spectrum.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Canonical Databases', desc: 'Authoritative World Models.', icon: Database },
                { title: 'Evidence Fabrics', desc: 'Cryptographically verifiable state.', icon: ShieldCheck },
                { title: 'Semantic Search', desc: 'High-performance vector retrieval.', icon: Search },
                { title: 'Agentic Workflows', desc: 'Multi-agent orchestration and reasoning.', icon: GitBranch },
                { title: 'Spatial Interfaces', desc: '3D WebGL data visualization.', icon: Globe }
              ].map((card, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-black/60 p-6 space-y-4 hover:border-white/30 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <card.icon className="w-5 h-5 text-white/80" />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-white/90">{card.title}</h3>
                  <p className="text-sm text-zinc-400">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>`.split('\n');

const part2NewLines = `{/* ========================================================================= */}
        {/* SECTION // 04 — ENTERPRISE READINESS                                       */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-white/10 bg-[#050505]/85 backdrop-blur-[2px] py-24 relative overflow-hidden">
          <div className="container mx-auto max-w-7xl px-5 md:px-8 space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
                <span>// 04 ENTERPRISE READINESS</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
                Built for Production.
              </h2>
              <p className="text-base sm:text-lg text-white/60 font-sans leading-relaxed">
                Systems designed to scale securely from day one.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Security & Compliance', desc: 'Secure by design principles applied at every layer.', icon: ShieldAlert },
                { title: 'Observability & Telemetry', desc: 'Comprehensive monitoring, logging, and tracing.', icon: Activity },
                { title: 'Resilient Infrastructure', desc: 'Fault-tolerant architecture with automated recovery.', icon: Server }
              ].map((card, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-black/60 p-6 space-y-4 text-center hover:border-white/30 transition-all group">
                  <div className="w-12 h-12 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <card.icon className="w-6 h-6 text-white/80" />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-white/90">{card.title}</h3>
                  <p className="text-sm text-zinc-400">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>`.split('\n');

// We need to replace in two chunks. Since removing lines changes indices, 
// we'll replace the bottom chunk first, then the top chunk.

// Bottom chunk: Lines 1082 to 2071 (1-indexed). 
// Indices: 1081 to 2070. Length = 990.
lines.splice(1081, 990, ...part2NewLines);

// Top chunk: Lines 811 to 952 (1-indexed).
// Indices: 810 to 951. Length = 142.
lines.splice(810, 142, ...part1NewLines);

fs.writeFileSync(file, lines.join('\n'));
console.log('Done replacement.');
