const fs = require('fs');

const filePath = 'client/pages/Index.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add LutPipelineCanvas import if not present
if (!content.includes('import { LutPipelineCanvas }')) {
  content = content.replace(
    'import { TextScrambleMorph } from "@/components/motion/TextScrambleMorph";',
    'import { TextScrambleMorph } from "@/components/motion/TextScrambleMorph";\nimport { LutPipelineCanvas } from "@/components/LutPipelineCanvas";'
  );
}

// 2. Replace VideoOverlayBackground in Hero with LutPipelineCanvas
const newHeroVideo = `<LutPipelineCanvas
            src="/media/feex/feex-robotics.mp4"
            poster="/media/feex/feex-robotics-poster.webp"
            lutMap="/media/feex/lut-cinematic-16.png"
            lutIntensity={0.75}
            mask="radial"
            className="opacity-40"
            ariaLabel="FEEX Systems Neural Robotics Telemetry"
            showPauseControl={true}
          />`;

content = content.replace(/<VideoOverlayBackground[\s\S]*?\/>/, newHeroVideo);

// 3. Define the 4 restored interactive sections
const restoredSections = `
        {/* ========================================================================= */}
        {/* SECTION // 04 — SELECTED SYSTEM WORLDS                                    */}
        {/* ========================================================================= */}
        <section id="worlds" className="w-full border-b border-white/10 bg-[#050505]/85 backdrop-blur-[2px] py-24 relative overflow-hidden">
          <div className="container mx-auto max-w-7xl px-5 md:px-8 space-y-12">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
                  <span className="size-1.5 rounded-full bg-white" />
                  <span>// 04 SYSTEM WORLDS</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white">
                  Selected System Worlds
                </h2>
                <p className="text-base sm:text-lg text-white/60 font-sans leading-relaxed">
                  The ecosystem organizes production architectures across six domains, backed by World Model dossiers and verifiable GitHub evidence.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/world"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-xs text-white hover:bg-white/10 transition-colors font-mono"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Explore in 3D Galaxy</span>
                </Link>
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-xs text-white hover:bg-white/10 transition-colors font-mono"
                >
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>View All Projects</span>
                </Link>
              </div>
            </div>

            {/* 3D PERSPECTIVE CYLINDER CAROUSEL */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-6 backdrop-blur-md shadow-2xl">
              <div className="text-xs font-mono text-zinc-300 mb-4 uppercase tracking-wider font-semibold flex items-center justify-between">
                <span>3D PERSPECTIVE CYLINDER // CORE ARCHITECTURE SHOWCASE</span>
                <span className="text-[10px] text-white/60">INTERACTIVE CAROUSEL</span>
              </div>
              <SushCinematicCarousel items={DASHBOARD_CAROUSEL_ITEMS} />
            </div>

            {/* The 6 Worlds Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              {SYSTEM_WORLDS.map((world) => (
                <div
                  key={world.id}
                  className="rounded-xl border border-white/10 bg-black/80 p-6 space-y-4 hover:border-white/30 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs font-mono">
                      <span className="text-zinc-200 font-bold">{world.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-white/80">
                        {world.status}
                      </span>
                    </div>

                    {world.image && (
                      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-white/10 bg-black/60">
                        <img
                          src={world.image}
                          alt={world.name}
                          className="w-full h-full object-cover grayscale contrast-125 group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[9px] font-mono bg-black/80 border border-white/20 text-white/90 backdrop-blur-sm">
                          CANONICAL ASSET // {world.id}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-white/90 transition-colors">
                        {world.name}
                      </h3>
                      <div className="text-xs text-zinc-300 font-mono mt-0.5 font-semibold">
                        {world.domain}
                      </div>
                    </div>

                    <p className="text-xs text-white/60 font-sans leading-relaxed line-clamp-3">
                      {world.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {world.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 font-mono"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <GitHubGuardLink
                      repoName={world.repo}
                      repoUrl={world.repoUrl}
                      className="text-white hover:underline flex items-center gap-1.5"
                    >
                      <FolderGit2 className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[150px]">{world.repo}</span>
                      <ExternalLink className="w-3 h-3 text-zinc-400" />
                    </GitHubGuardLink>
                    <Link
                      to="/world"
                      className="text-zinc-300 hover:text-white transition-colors"
                    >
                      Explore →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION // 05 — 3D SPATIAL GALAXY PREVIEW                                */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-white/10 bg-[#000000]/90 backdrop-blur-[2px] py-24 relative overflow-hidden">
          <div className="container mx-auto max-w-7xl px-5 md:px-8 space-y-12">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
                  <span className="size-1.5 rounded-full bg-white" />
                  <span>// 05 SPATIAL KNOWLEDGE GALAXY</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white">
                  3D Topological Knowledge Galaxy
                </h2>
                <p className="text-base sm:text-lg text-white/60 font-sans leading-relaxed">
                  Real-time WebGL spatial graph mapping repositories, artifacts, and systems into an explorable cosmos with orbital relationships.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/world"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/20 bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all shadow-xl font-mono"
                >
                  <Globe className="w-4 h-4 text-black" />
                  <span>Launch Full Galaxy Stage</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              <div className="lg:col-span-2 rounded-2xl border border-white/15 bg-black/80 p-4 relative aspect-[16/9] overflow-hidden group">
                <img
                  src="/docs/brand-assets/screenshots/world-screenshot.webp"
                  alt="3D Spatial Knowledge Galaxy"
                  className="w-full h-full object-cover rounded-xl grayscale group-hover:grayscale-0 transition-all duration-700 opacity-90 group-hover:opacity-100"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-mono text-white font-semibold">WORLD MODEL SPATIAL ENGINE v3.8</div>
                    <div className="text-[11px] text-zinc-300 font-sans">Three.js + R3F + Procedural Planetary Shaders</div>
                  </div>
                  <Link
                    to="/world"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs font-mono text-white backdrop-blur-md hover:bg-white/20 transition-all"
                  >
                    <span>Full Screen</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="rounded-xl border border-white/10 bg-black/60 p-5 space-y-2">
                  <div className="text-zinc-400 uppercase text-[10px] font-semibold">Graph Topology Nodes</div>
                  <div className="text-2xl font-light text-white">48+ Active Entities</div>
                  <p className="text-[11px] text-zinc-400 font-sans">Repositories, artifacts, systems, and technologies interconnected via directional links.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/60 p-5 space-y-2">
                  <div className="text-zinc-400 uppercase text-[10px] font-semibold">pgvector Semantic Clustering</div>
                  <div className="text-2xl font-light text-white">&lt;50ms Latency</div>
                  <p className="text-[11px] text-zinc-400 font-sans">Sub-50 millisecond spatial vector indexing dynamically positioning semantically related systems.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/60 p-5 space-y-2">
                  <div className="text-zinc-400 uppercase text-[10px] font-semibold">Inspection & Telemetry</div>
                  <div className="text-2xl font-light text-white">Realtime Dossiers</div>
                  <p className="text-[11px] text-zinc-400 font-sans">Clicking any planetary node inspects its commit SHAs, file tree, and architecture specifications.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION // 06 — TERMINAL INTELLIGENCE CLI STAGE                          */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-white/10 bg-[#050505]/85 backdrop-blur-[2px] py-24 relative overflow-hidden">
          <div className="container mx-auto max-w-7xl px-5 md:px-8 space-y-12">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
                  <span className="size-1.5 rounded-full bg-white" />
                  <span>// 06 TERMINAL INTELLIGENCE</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white">
                  Omni Command Interface
                </h2>
                <p className="text-base sm:text-lg text-white/60 font-sans leading-relaxed">
                  Interactive agentic terminal for executing ecosystem queries, verifying cryptographic proofs, and inspecting topology.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/omni"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-xs text-white hover:bg-white/10 transition-colors font-mono"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Open Omni Command</span>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-black/90 p-6 font-mono shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-white/40" />
                  <span className="size-2.5 rounded-full bg-white/20" />
                  <span className="size-2.5 rounded-full bg-white/10" />
                  <span className="ml-2 text-zinc-400">feex-omni-v2.1.0 --interactive</span>
                </div>
                <span className="text-[10px] text-zinc-300">STREAMING SSE ENABLED</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="text-white font-bold">&gt;</span> feex system status --all
                </div>
                <div className="text-zinc-300 pl-4 space-y-1">
                  <div>✓ World Model DB: Connected (PostgreSQL 15 + pgvector)</div>
                  <div>✓ Canonical Entities: 48 registered / 6 core system worlds</div>
                  <div>✓ Evidence Fabric: HMAC-verified, 0 broken hashes</div>
                  <div>✓ Omni Reasoning Engine: Ready (gemini-3.8-flash, multi-provider active)</div>
                </div>

                <div className="flex items-center gap-2 text-zinc-400 pt-2">
                  <span className="text-white font-bold">&gt;</span> feex navigator --query "Summarize HoloKai artifact intelligence architecture"
                </div>
                <div className="text-white/80 pl-4 space-y-1 border-l border-white/20 ml-1 py-1">
                  <div>↳ Grounded Context: 4 evidence anchors retrieved from FeexSystems/HoloKai-Systems-Labs</div>
                  <div>↳ Response: HoloKai functions as the cultural intelligence domain, implementing immutable 3D artifact models with schema-backed knowledge graph edges.</div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Press Tab for auto-completion. 14 ecosystem commands available.</span>
                  <Link to="/omni" className="text-white hover:underline flex items-center gap-1 font-semibold">
                    <span>Enter CLI Stage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION // 07 — EVIDENCE FABRIC PROVENANCE LEDGER                         */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-white/10 bg-[#000000]/90 backdrop-blur-[2px] py-24 relative overflow-hidden">
          <div className="container mx-auto max-w-7xl px-5 md:px-8 space-y-12">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
                  <span className="size-1.5 rounded-full bg-white" />
                  <span>// 07 EVIDENCE FABRIC</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white">
                  Cryptographic Evidence Fabric
                </h2>
                <p className="text-base sm:text-lg text-white/60 font-sans leading-relaxed">
                  Every fact in the FeexSystems World Model is anchored to verifiable implementation evidence: commit SHAs, file paths, and cryptographically verified webhook events.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/evidence"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-xs text-white hover:bg-white/10 transition-colors font-mono"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>View Full Evidence Ledger</span>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/80 overflow-hidden shadow-2xl backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-white/10 bg-white/[0.02] text-zinc-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-6">Domain / World</th>
                      <th className="py-3 px-6">Repository</th>
                      <th className="py-3 px-6">Commit SHA</th>
                      <th className="py-3 px-6">Canonical Artifact</th>
                      <th className="py-3 px-6 text-right">Verification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-white/80">
                    {[
                      { world: "01 // Sonik Audio DSP", repo: "FeexSystems/3WM-SONIK-LABS", sha: "8e25507a", artifact: "Audio DSP Neural Kernel v2.4.0", status: "VERIFIED" },
                      { world: "02 // HoloKai", repo: "FeexSystems/HoloKai-Systems-Labs", sha: "06a1046b", artifact: "3D Planetary Core & World Model", status: "VERIFIED" },
                      { world: "03 // Yurrheeler AI", repo: "FeexSystems/yurrhealer-med-advisor", sha: "9eb3057c", artifact: "Coordinated Medical Agent Swarm", status: "VERIFIED" },
                      { world: "04 // KappaXchangefin", repo: "FeexSystems/kappaxchangefin-ledger", sha: "55ed422d", artifact: "ISO 20022 Financial Telemetry", status: "VERIFIED" },
                      { world: "05 // VYRA LABS", repo: "FeexSystems/VYRA-LABS", sha: "20dd705e", artifact: "Conversational Media Engine", status: "VERIFIED" },
                      { world: "06 // Rental Paradise", repo: "FeexSystems/Rental-Paradise", sha: "1b45c59f", artifact: "Property Discovery Architecture", status: "VERIFIED" },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-3.5 px-6 font-semibold text-white">{row.world}</td>
                        <td className="py-3.5 px-6 text-zinc-300">{row.repo}</td>
                        <td className="py-3.5 px-6 font-mono text-zinc-400">{row.sha}</td>
                        <td className="py-3.5 px-6 text-white/70">{row.artifact}</td>
                        <td className="py-3.5 px-6 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-white/10 border border-white/20 text-white font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
`;

// 4. Renumber Enterprise Readiness to Section 08 and Pricing to Section 09
const targetStr = 'ENTERPRISE READINESS';
const targetIdx = content.indexOf(targetStr);

if (targetIdx !== -1) {
  const dividerIdx = content.lastIndexOf('{/* ===', targetIdx);
  if (dividerIdx !== -1) {
    const before = content.substring(0, dividerIdx);
    let after = content.substring(dividerIdx);
    
    // Renumber sections in after
    after = after.replace(/SECTION \/\/ 04 \u2014 ENTERPRISE READINESS/, 'SECTION // 08 — ENTERPRISE READINESS');
    after = after.replace(/\/\/ 04 ENTERPRISE READINESS/, '// 08 ENTERPRISE READINESS');
    after = after.replace(/SECTION \/\/ 05 \u2014 PRICING/, 'SECTION // 09 — PRICING');
    after = after.replace(/\/\/ 05 PRICING/, '// 09 PRICING');
    after = after.replace(/SECTION \/\/ 13 \u2014 FREQUENTLY ANSWERED OBJECTIONS/, 'SECTION // 10 — FREQUENTLY ANSWERED OBJECTIONS');
    after = after.replace(/\/\/ 06 FAQ/, '// 10 FAQ');
    after = after.replace(/SECTION \/\/ 14 \u2014 FINAL CLOSING CONVERSION STAGE/, 'SECTION // 11 — FINAL CLOSING CONVERSION STAGE');
    
    content = before + restoredSections + '\n' + after;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully integrated hybrid landing page sections and updated Index.tsx!');
  } else {
    console.error('Divider before Section 04 not found');
  }
} else {
  console.error('Section 04 Enterprise Readiness not found');
}
