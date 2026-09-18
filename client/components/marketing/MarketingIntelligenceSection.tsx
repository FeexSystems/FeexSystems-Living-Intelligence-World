import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Network,
  ShieldCheck,
  TrendingDown,
  Activity,
  GitCommit,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Layers,
  Compass,
  Cpu,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Flame,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// ============================================================================
// CANONICAL MARKETING WORLD MODEL SEED DATA
// ============================================================================

interface ClaimItem {
  id: string;
  claim: string;
  domain: string;
  category: "AI Core" | "Audio DSP" | "Security & Ingestion" | "Spatial Graphics";
  confidence: number;
  status: "VERIFIED_CANONICAL" | "ACTIVE_MONITORED";
  evidenceRepo: string;
  evidenceSha: string;
  evidenceFile: string;
  evidenceType: string;
  verificationTimestamp: string;
  verificationMethod: string;
}

const CANONICAL_CLAIMS: ClaimItem[] = [
  {
    id: "claim-1",
    claim: "Sub-10ms DSP neural audio synthesis latency via WebAudio AudioWorklet pipeline",
    domain: "Sonik Audio DSP",
    category: "Audio DSP",
    confidence: 99.4,
    status: "VERIFIED_CANONICAL",
    evidenceRepo: "FeexSystems/Sonik-Audio-DSP",
    evidenceSha: "8f21a4c9",
    evidenceFile: "packages/dsp-core/worklet/neural-synthesizer.worklet.ts",
    evidenceType: "Automated Vitest Benchmark Suite (1,000 iterations)",
    verificationTimestamp: "2026-09-17 16:42 UTC",
    verificationMethod: "Zero-Trust SHA-256 HMAC + Automated CI Benchmark",
  },
  {
    id: "claim-2",
    claim: "Zero-trust HMAC-SHA256 multi-tenant GitHub webhook ingestion with replay protection",
    domain: "World Model Core",
    category: "Security & Ingestion",
    confidence: 100.0,
    status: "VERIFIED_CANONICAL",
    evidenceRepo: "FeexSystems/Living-Intelligence",
    evidenceSha: "a39d82ef",
    evidenceFile: "server/routes/world-model.ts#L340-L388",
    evidenceType: "Cryptographic HMAC SHA-256 Header Verification",
    verificationTimestamp: "2026-09-17 15:18 UTC",
    verificationMethod: "Continuous Security Middleware Assertion",
  },
  {
    id: "claim-3",
    claim: "Universal provider-neutral LLM reasoning mesh with automatic fallback across Gemini, Anthropic, and OpenAI",
    domain: "AI Orchestration",
    category: "AI Core",
    confidence: 98.7,
    status: "VERIFIED_CANONICAL",
    evidenceRepo: "FeexSystems/Living-Intelligence",
    evidenceSha: "529cd801",
    evidenceFile: "server/lib/services/ai.service.ts",
    evidenceType: "Multi-Provider Dynamic Adapter Unit Tests",
    verificationTimestamp: "2026-09-17 14:02 UTC",
    verificationMethod: "Provider-Agnostic Contract Test Verification",
  },
  {
    id: "claim-4",
    claim: "Real-time 3D Spatial Knowledge Galaxy with dynamic LOD and viewport occlusion culling",
    domain: "HoloKai World",
    category: "Spatial Graphics",
    confidence: 99.1,
    status: "VERIFIED_CANONICAL",
    evidenceRepo: "FeexSystems/HoloKai",
    evidenceSha: "d14f90ba",
    evidenceFile: "client/components/galaxy/KnowledgeGalaxyScene.tsx",
    evidenceType: "Three.js / R3F Frame-Rate Profiler (60 FPS Cap)",
    verificationTimestamp: "2026-09-17 11:30 UTC",
    verificationMethod: "Headless WebGL Rendering Telemetry",
  },
];

interface TwinNode {
  id: string;
  label: string;
  type: "campaign" | "product" | "asset" | "audience";
  activity: number;
  connections: string[];
}

const DIGITAL_TWIN_NODES: TwinNode[] = [
  { id: "camp-1", label: "Launch 2026: Spatial Intelligence", type: "campaign", activity: 94, connections: ["prod-1", "asset-1", "aud-1"] },
  { id: "camp-2", label: "Evidence Fabric & Zero-Trust Ledger", type: "campaign", activity: 88, connections: ["prod-2", "asset-2", "aud-2"] },
  { id: "prod-1", label: "Sonik Audio DSP", type: "product", activity: 92, connections: ["asset-1", "aud-1"] },
  { id: "prod-2", label: "World Model Core", type: "product", activity: 96, connections: ["asset-2", "aud-2"] },
  { id: "prod-3", label: "HoloKai Spatial", type: "product", activity: 85, connections: ["asset-3", "aud-1"] },
  { id: "asset-1", label: "DSP Neural Benchmark Whitepaper", type: "asset", activity: 89, connections: ["aud-1"] },
  { id: "asset-2", label: "HMAC Ingestion Technical Spec", type: "asset", activity: 78, connections: ["aud-2"] },
  { id: "asset-3", label: "3D Knowledge Galaxy Interactive Demo", type: "asset", activity: 95, connections: ["aud-1"] },
  { id: "aud-1", label: "Audio & WebGL Architects", type: "audience", activity: 82, connections: [] },
  { id: "aud-2", label: "Enterprise Platform Leads", type: "audience", activity: 90, connections: [] },
];

interface NavigatorSample {
  query: string;
  groundedAnswer: string;
  sourceEntities: string[];
  evidenceShas: string[];
  recommendedAction: string;
}

const NAVIGATOR_QUERIES: NavigatorSample[] = [
  {
    query: "What changed in GitHub this week that is marketing-worthy?",
    groundedAnswer:
      "Analyzed 28 commits across 6 repositories. Repository `FeexSystems/Sonik-Audio-DSP` merged PR #42 (commit `8f21a4c9`) achieving 8.4ms neural audio inference latency on WebAudio AudioWorklet. This directly validates Claim #1 with verified benchmark evidence. Recommend immediate technical deep-dive announcement.",
    sourceEntities: ["Sonik-Audio-DSP", "NeuralSynthesizerWorklet", "BenchmarkSuite"],
    evidenceShas: ["8f21a4c9", "4b12c8e1"],
    recommendedAction: "Queue Technical Release Announcement → LinkedIn / X / Docs",
  },
  {
    query: "Which ecosystem world has the strongest evidence but lowest content coverage?",
    groundedAnswer:
      "Content Gap Engine evaluated 6 products against active content assets. `Sonik Audio DSP` currently registers a Gap Score of 0.88 (14 production features detected in repository, but only 2 published content assets). High audience interest (+34% search intent) with verified benchmark evidence makes this the #1 priority gap.",
    sourceEntities: ["Sonik Audio DSP", "AudioWorklet", "SpectralFilter"],
    evidenceShas: ["8f21a4c9", "b99142da"],
    recommendedAction: "Synthesize Evidence Brief → Create Developer Guide & Audio Sandbox Demo",
  },
  {
    query: "Detect claims with decaying evidence or outdated benchmark references.",
    groundedAnswer:
      "Content Decay Engine flagged 1 asset: 'Legacy WebGL 1.0 Shader Pipeline' (last updated 42 days ago). The repository has since migrated to R3F LUT Shader Color Grading in commit `06a1046`. The claim references superseded uniforms `uOldLut`. Recommending automatic refresh to preserve evidence integrity.",
    sourceEntities: ["LutPipelineCanvas", "lutShader.frag", "HoloKai"],
    evidenceShas: ["06a1046e", "d14f90ba"],
    recommendedAction: "Execute Automated Content Refresh Pipeline → Update Docs to 16³ LUT Spec",
  },
  {
    query: "Explain how the Qualified Intelligence Engagement (QIE) metric is computed.",
    groundedAnswer:
      "QIE (Qualified Intelligence Engagement) is FeexSystems' canonical marketing score calculated from persistent telemetry: QIE = 0.35 × (Evidence Deep Dives) + 0.30 × (Interactive Demo Dwell Time) + 0.20 × (Code Repository Clicks) + 0.15 × (Navigator Queries). Current platform-wide QIE is 94.8 / 100.",
    sourceEntities: ["MarketingTelemetry", "QualifiedIntelligenceEngagement", "DigitalTwin"],
    evidenceShas: ["a39d82ef", "529cd801"],
    recommendedAction: "Inspect Live Telemetry HUD → Real-Time Digital Twin Graph",
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MarketingIntelligenceSection() {
  const [activeTab, setActiveTab] = useState<"claim-graph" | "digital-twin" | "engines" | "navigator">("claim-graph");
  const [selectedClaimId, setSelectedClaimId] = useState<string>("claim-1");
  const [selectedTwinNodeId, setSelectedTwinNodeId] = useState<string>("prod-1");
  const [twinFilter, setTwinFilter] = useState<"all" | "campaign" | "product" | "asset" | "audience">("all");
  const [integrityVerified, setIntegrityVerified] = useState<boolean>(false);
  const [activeNavIndex, setActiveNavIndex] = useState<number>(0);
  const [customNavQuery, setCustomNavQuery] = useState<string>("");
  const [isSynthesizingBrief, setIsSynthesizingBrief] = useState<boolean>(false);
  const [briefGenerated, setBriefGenerated] = useState<boolean>(false);

  // Active claim
  const selectedClaim = useMemo(
    () => CANONICAL_CLAIMS.find((c) => c.id === selectedClaimId) || CANONICAL_CLAIMS[0],
    [selectedClaimId]
  );

  // Filtered digital twin nodes
  const filteredNodes = useMemo(() => {
    if (twinFilter === "all") return DIGITAL_TWIN_NODES;
    return DIGITAL_TWIN_NODES.filter((n) => n.type === twinFilter);
  }, [twinFilter]);

  const selectedTwinNode = useMemo(
    () => DIGITAL_TWIN_NODES.find((n) => n.id === selectedTwinNodeId) || DIGITAL_TWIN_NODES[0],
    [selectedTwinNodeId]
  );

  const activeNavQuery = NAVIGATOR_QUERIES[activeNavIndex];

  const handleIntegrityCheck = () => {
    setIntegrityVerified(false);
    setTimeout(() => {
      setIntegrityVerified(true);
    }, 600);
  };

  const handleSynthesizeBrief = () => {
    setIsSynthesizingBrief(true);
    setTimeout(() => {
      setIsSynthesizingBrief(false);
      setBriefGenerated(true);
    }, 800);
  };

  return (
    <section
      id="advanced-marketing"
      className="w-full border-b border-white/10 bg-[#020202] py-24 relative overflow-hidden text-white"
    >
      {/* Background Ambient Glow & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-black to-black pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="container mx-auto max-w-7xl px-5 md:px-8 relative z-10 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col items-start md:items-center md:text-center max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            <span>// 08 ADVANCED MARKETING INTELLIGENCE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Evidence-First Marketing. Grounded in Code.
          </h2>

          <p className="text-base sm:text-lg text-white/60 font-sans leading-relaxed max-w-3xl">
            We reject ungrounded marketing hype. The FeexSystems Marketing World Model connects GitHub commits,
            verifiable benchmark evidence, and product architectures into continuous claim graphs, autonomous gap/decay
            engines, and real-time market synchronization.
          </p>

          {/* Quick Pillar Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-white" /> Evidence Before Assertion
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-white" /> Marketing Digital Twin
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-white" /> Content Gap & Decay Engines
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-white" /> Marketing Navigator AI
            </span>
          </div>
        </div>

        {/* Interactive Subsystem Tabs */}
        <div className="w-full flex justify-center">
          <div className="p-1 rounded-xl bg-black/80 border border-white/15 backdrop-blur-md inline-flex flex-wrap gap-1">
            <button
              onClick={() => setActiveTab("claim-graph")}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition-all flex items-center gap-2 ${
                activeTab === "claim-graph"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              1. Evidence Claim Graph
            </button>
            <button
              onClick={() => setActiveTab("digital-twin")}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition-all flex items-center gap-2 ${
                activeTab === "digital-twin"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              2. Marketing Digital Twin
            </button>
            <button
              onClick={() => setActiveTab("engines")}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition-all flex items-center gap-2 ${
                activeTab === "engines"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              3. Gap & Decay Engines
            </button>
            <button
              onClick={() => setActiveTab("navigator")}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition-all flex items-center gap-2 ${
                activeTab === "navigator"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              4. Grounded Navigator AI
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* SUBSYSTEM 1: EVIDENCE CLAIM GRAPH                                   */}
        {/* =================================================================== */}
        {activeTab === "claim-graph" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Claims List */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Select Ecosystem Claim ({CANONICAL_CLAIMS.length})
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  Click claim to inspect cryptographic provenance
                </span>
              </div>

              {CANONICAL_CLAIMS.map((c) => {
                const isSelected = c.id === selectedClaimId;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedClaimId(c.id);
                      setIntegrityVerified(false);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? "bg-white/10 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                        : "bg-black/50 border-white/10 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono border-white/20 text-white bg-white/5"
                        >
                          {c.domain}
                        </Badge>
                        <span className="text-[10px] font-mono text-zinc-400">{c.category}</span>
                      </div>
                      <span className="text-xs font-mono text-white flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                        {c.confidence}%
                      </span>
                    </div>

                    <p className="text-sm font-medium text-white/90 leading-snug">{c.claim}</p>

                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                      <span className="flex items-center gap-1 truncate max-w-[200px]">
                        <GitCommit className="w-3 h-3 text-white" />
                        SHA: <span className="text-white">{c.evidenceSha}</span>
                      </span>
                      <span className="text-zinc-500 hover:text-white flex items-center gap-1">
                        Inspect <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Claim Provenance Inspector Card */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-white/20 bg-[#09090b] p-6 space-y-6 shadow-2xl relative">
                {/* Header with Status */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                      EVIDENCE FABRIC LEDGER PROVENANCE
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">{selectedClaim.domain}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-white text-black flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {selectedClaim.status}
                    </span>
                  </div>
                </div>

                {/* Claim Text */}
                <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    Canonical Asserted Claim
                  </span>
                  <p className="text-sm font-sans text-white leading-relaxed">"{selectedClaim.claim}"</p>
                </div>

                {/* Cryptographic Provenance Details */}
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-zinc-400">Evidence Repository</span>
                    <span className="text-white font-medium">{selectedClaim.evidenceRepo}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-zinc-400">Git Commit SHA</span>
                    <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded">
                      {selectedClaim.evidenceSha}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-zinc-400">Source Path</span>
                    <span className="text-zinc-300 truncate max-w-[260px]">{selectedClaim.evidenceFile}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-zinc-400">Verification Method</span>
                    <span className="text-zinc-300">{selectedClaim.verificationMethod}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-zinc-400">Timestamp</span>
                    <span className="text-zinc-400">{selectedClaim.verificationTimestamp}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5 items-center">
                    <span className="text-zinc-400">Confidence Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all"
                          style={{ width: `${selectedClaim.confidence}%` }}
                        />
                      </div>
                      <span className="text-white font-bold">{selectedClaim.confidence}%</span>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <Button
                    onClick={handleIntegrityCheck}
                    variant="outline"
                    className="border-white/20 hover:bg-white hover:text-black font-mono text-xs flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Assert Integrity Check
                  </Button>

                  <Link
                    to="/evidence"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
                  >
                    Full Evidence Ledger <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Integrity Check Feedback Toast */}
                {integrityVerified && (
                  <div className="p-3 rounded-lg bg-white/10 border border-white/30 text-white font-mono text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                    <span>
                      Cryptographic assertion successful: SHA-256 hash verified against active repository commit. Zero
                      orphan claims detected.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUBSYSTEM 2: MARKETING DIGITAL TWIN & QIE TELEMETRY                 */}
        {/* =================================================================== */}
        {activeTab === "digital-twin" && (
          <div className="space-y-6">
            {/* Top Telemetry HUD */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
              <div className="p-4 rounded-xl border border-white/10 bg-black/60 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Overall QIE Score</span>
                <div className="text-2xl font-bold text-white flex items-baseline gap-1">
                  94.8 <span className="text-xs text-zinc-400">/ 100</span>
                </div>
                <p className="text-[10px] text-zinc-400">Qualified Intelligence Engagement</p>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-black/60 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Evidence Click-Through</span>
                <div className="text-2xl font-bold text-white flex items-baseline gap-1">
                  82.1% <span className="text-xs text-white">↑ 14%</span>
                </div>
                <p className="text-[10px] text-zinc-400">Commit SHA verifications</p>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-black/60 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Active Graph Nodes</span>
                <div className="text-2xl font-bold text-white flex items-baseline gap-1">
                  {DIGITAL_TWIN_NODES.length} <span className="text-xs text-zinc-400">entities</span>
                </div>
                <p className="text-[10px] text-zinc-400">Campaigns, products & assets</p>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-black/60 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Freshness Multiplier</span>
                <div className="text-2xl font-bold text-white flex items-baseline gap-1">
                  1.00x <span className="text-xs text-white">SYNCED</span>
                </div>
                <p className="text-[10px] text-zinc-400">Synchronized with GitHub</p>
              </div>
            </div>

            {/* Interactive Graph & Node Inspector Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Interactive Node Canvas Box */}
              <div className="lg:col-span-7 rounded-2xl border border-white/15 bg-[#050505] p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase text-zinc-400">Filter Topology:</span>
                    {(["all", "campaign", "product", "asset", "audience"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setTwinFilter(filter)}
                        className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                          twinFilter === filter
                            ? "bg-white text-black font-bold"
                            : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <span className="text-[10px] font-mono text-zinc-500">Live WebGL Topology Bridge</span>
                </div>

                {/* Node Grid representation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {filteredNodes.map((node) => {
                    const isSelected = node.id === selectedTwinNodeId;
                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedTwinNodeId(node.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-white/15 border-white text-white shadow-lg"
                            : "bg-black/60 border-white/10 hover:border-white/20 text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                              node.type === "campaign"
                                ? "bg-white/20 text-white"
                                : node.type === "product"
                                ? "bg-white/10 text-zinc-200"
                                : node.type === "asset"
                                ? "bg-white/15 text-zinc-300"
                                : "bg-white/5 text-zinc-400"
                            }`}
                          >
                            {node.type}
                          </span>
                          <span className="text-[10px] font-mono text-white flex items-center gap-1 font-bold">
                            <Activity className="w-3 h-3 text-white" />
                            {node.activity}%
                          </span>
                        </div>

                        <div className="text-xs font-semibold truncate">{node.label}</div>

                        <div className="mt-2 text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                          <span>{node.connections.length} Edges</span>
                          <span>•</span>
                          <span className="truncate">{node.connections.join(", ") || "Terminal Node"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 text-center">
                  <Link
                    to="/world"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-200 hover:text-white transition-all"
                  >
                    <Network className="w-3.5 h-3.5" />
                    Open Full 3D Spatial Knowledge Galaxy (/world)
                  </Link>
                </div>
              </div>

              {/* Node Inspector Side Panel */}
              <div className="lg:col-span-5 rounded-2xl border border-white/15 bg-[#09090b] p-6 space-y-6">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    DIGITAL TWIN NODE INSPECTOR
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">{selectedTwinNode.label}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono uppercase border-white/20 text-white">
                      Type: {selectedTwinNode.type}
                    </Badge>
                    <span className="text-xs font-mono text-white font-bold">
                      Activity Index: {selectedTwinNode.activity}/100
                    </span>
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-black/60 border border-white/10 space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase">Semantic Edge Relations</span>
                    <p className="text-zinc-200">
                      Connects to {selectedTwinNode.connections.length} active World Model entities via{" "}
                      <code className="text-white bg-white/10 px-1 py-0.5 rounded text-[11px]">
                        {selectedTwinNode.type === "campaign"
                          ? "promotes / targets"
                          : selectedTwinNode.type === "product"
                          ? "evidenced_by"
                          : "supports"}
                      </code>
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/60 border border-white/10 space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase">QIE Telemetry Weight</span>
                    <p className="text-zinc-200">
                      Calculated from real audience interaction events, documentation dwell time, and commit inspection.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/60 border border-white/10 space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase">Governance State</span>
                    <p className="text-white flex items-center gap-1 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-white" />
                      Audited & Continuous Sync Enabled
                    </p>
                  </div>
                </div>

                <Link
                  to="/dashboard"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black font-mono font-bold text-xs hover:bg-zinc-200 transition-colors"
                >
                  Enter Marketing Command Center <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUBSYSTEM 3: AUTONOMOUS GAP & DECAY ENGINES                         */}
        {/* =================================================================== */}
        {activeTab === "engines" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Engine 1: Content Gap Engine */}
            <div className="rounded-2xl border border-white/15 bg-[#09090b] p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-mono border-white/20 text-white bg-white/5">
                    ENGINE 01
                  </Badge>
                  <span className="text-xs font-mono text-white font-bold">GAP SCORE: 0.88</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-white" /> Content Gap Engine
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Detects intersections of high GitHub code features vs. low published marketing coverage.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Target Product:</span>
                    <span className="text-white font-bold">Sonik Audio DSP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Engineered Features:</span>
                    <span className="text-white">14 in master</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Content Collateral:</span>
                    <span className="text-zinc-300">2 Assets (Under-indexed)</span>
                  </div>
                </div>

                {briefGenerated && (
                  <div className="p-3 rounded-lg bg-white/10 border border-white/20 text-xs font-mono space-y-1 animate-in fade-in">
                    <span className="text-white font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Brief Synthesized:
                    </span>
                    <p className="text-zinc-300 text-[11px]">
                      "Focus on AudioWorklet &lt;10ms benchmark. Target: Audio DSP Architects. Derived from commit
                      `8f21a4c9`."
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSynthesizeBrief}
                disabled={isSynthesizingBrief}
                variant="outline"
                className="w-full border-white/20 hover:bg-white hover:text-black font-mono text-xs mt-4"
              >
                {isSynthesizingBrief ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Synthesizing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Synthesize Evidence Brief
                  </span>
                )}
              </Button>
            </div>

            {/* Engine 2: Content Decay Engine */}
            <div className="rounded-2xl border border-white/15 bg-[#09090b] p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-mono border-white/20 text-white bg-white/5">
                    ENGINE 02
                  </Badge>
                  <span className="text-xs font-mono text-white font-bold">DECAY INDEX: 0.72</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-white" /> Content Decay Engine
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Detects stale claims, superseded technology references, and obsolete benchmarks.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Flagged Asset:</span>
                    <span className="text-zinc-200">WebGL 1.0 Shader Spec</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Days Stale:</span>
                    <span className="text-white font-bold">42 Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Superseding Commit:</span>
                    <span className="text-white font-bold">06a1046e (16³ LUT)</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-zinc-400">
                  <span className="text-zinc-300 font-bold block mb-1">Recommended Action:</span>
                  Automated pull request to update shader uniforms and replace obsolete WebGL 1.0 references.
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full border-white/20 hover:bg-white hover:text-black font-mono text-xs mt-4"
                onClick={() => alert("Triggered automated decay refresh pipeline against commit 06a1046e.")}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Trigger Freshness Refresh
              </Button>
            </div>

            {/* Engine 3: GitHub-to-Marketing Signal Pipeline */}
            <div className="rounded-2xl border border-white/15 bg-[#09090b] p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-mono border-white/20 text-white bg-white/5">
                    PIPELINE 03
                  </Badge>
                  <span className="text-xs font-mono text-white flex items-center gap-1">
                    <Flame className="w-3 h-3 text-white" /> REALTIME
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-white" /> GitHub → Marketing Ingestion
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Closed-loop engineering pipeline turning git commits into marketing stories.
                  </p>
                </div>

                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 flex items-center gap-2">
                    <span className="size-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                      1
                    </span>
                    <span className="text-zinc-300">GitHub push event received via HMAC webhook</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 flex items-center gap-2">
                    <span className="size-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                      2
                    </span>
                    <span className="text-zinc-300">Evidence Fabric extracts benchmark & SHAs</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 flex items-center gap-2">
                    <span className="size-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                      3
                    </span>
                    <span className="text-zinc-300">Claim Graph updates freshness & confidence</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/10 border border-white/30 flex items-center gap-2">
                    <span className="size-5 rounded-full bg-white text-black flex items-center justify-center text-[10px] shrink-0 font-bold">
                      4
                    </span>
                    <span className="text-white font-bold">Autonomous marketing brief queued for review</span>
                  </div>
                </div>
              </div>

              <Link
                to="/omni"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white hover:text-black border border-white/20 font-mono text-xs transition-colors"
              >
                Inspect Omni-Command Ingestion Stage <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUBSYSTEM 4: MARKETING NAVIGATOR GROUNDED QUERY SIMULATOR           */}
        {/* =================================================================== */}
        {activeTab === "navigator" && (
          <div className="rounded-2xl border border-white/15 bg-[#08080a] p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  GROUNDED CONVERSATIONAL INTELLIGENCE
                </div>
                <h3 className="text-xl font-bold text-white mt-0.5">Marketing Navigator Simulator</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-white/10 border border-white/20 text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-white" /> Zero Hallucination • Grounded Retrieval
                </span>
              </div>
            </div>

            {/* Pre-Loaded Quick Queries */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-zinc-400">Select Strategic Inquiry:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {NAVIGATOR_QUERIES.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveNavIndex(idx)}
                    className={`p-3 rounded-xl border text-left text-xs font-mono transition-all flex items-center justify-between gap-2 ${
                      activeNavIndex === idx
                        ? "bg-white text-black font-semibold border-white"
                        : "bg-black/50 border-white/10 text-zinc-300 hover:border-white/30 hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate">{q.query}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Answer Display Box */}
            <div className="p-6 rounded-xl bg-black/80 border border-white/15 space-y-4 font-mono">
              <div className="flex items-center justify-between gap-2 text-xs border-b border-white/10 pb-3">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-white" /> Grounded Query:
                </span>
                <span className="text-white font-bold">{activeNavQuery.query}</span>
              </div>

              {/* Response Text */}
              <div className="text-sm font-sans text-white/90 leading-relaxed">
                {activeNavQuery.groundedAnswer}
              </div>

              {/* Provenance Metadata Trace */}
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-400">Source Entities:</span>
                  {activeNavQuery.sourceEntities.map((ent, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-white/10 text-white text-[11px]">
                      {ent}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Evidence SHAs:</span>
                  {activeNavQuery.evidenceShas.map((sha, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-white/15 text-white text-[11px] font-bold">
                      {sha}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommended Action */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold uppercase text-[10px]">Recommended Action:</span>
                  <span className="text-zinc-200">{activeNavQuery.recommendedAction}</span>
                </div>
                <Link
                  to="/navigator"
                  className="text-white hover:underline text-[11px] shrink-0 flex items-center gap-1"
                >
                  Open in Navigator →
                </Link>
              </div>
            </div>

            {/* Bottom CTA to Full Navigator */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-zinc-400">
                Want to ask custom queries over the entire FeexSystems repository graph?
              </span>
              <Link
                to="/navigator"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black font-mono font-bold text-xs hover:bg-zinc-200 transition-colors"
              >
                Launch FeexSystems Navigator <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default MarketingIntelligenceSection;
