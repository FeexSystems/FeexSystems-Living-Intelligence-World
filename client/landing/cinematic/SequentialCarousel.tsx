import React, { useState, useEffect } from "react";
import { ArrowRight, CheckCircle2, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SequenceStep {
  stepNumber: string;
  title: string;
  subtitle: string;
  codeSnippet: string;
  details: string[];
  status: "active" | "queued" | "completed";
}

const DEFAULT_STEPS: SequenceStep[] = [
  {
    stepNumber: "01",
    title: "Webhook Ingestion & HMAC Verification",
    subtitle: "GitHub Event Dispatch",
    codeSnippet: 'POST /api/world-model/webhook\nX-Hub-Signature-256: sha256=d3b07384...27\nPayload: { repository: "feex-world-model", action: "push" }',
    details: ["Cryptographic verification of GitHub signature", "Non-blocking event dispatch to background worker", "Payload schema validation with Zod"],
    status: "completed",
  },
  {
    stepNumber: "02",
    title: "Artifact Extraction & Graph Synthesis",
    subtitle: "Relational Knowledge Pipeline",
    codeSnippet: 'const node = await prisma.worldModelNode.upsert({\n  where: { canonicalKey: "feexsystems" },\n  create: { type: "PROJECT", domain: "CORE" }\n});',
    details: ["AST analysis of repository tree", "Extraction of packages, frameworks & licenses", "Relational edge binding (CONTAINS, USES)"],
    status: "completed",
  },
  {
    stepNumber: "03",
    title: "Evidence Fabric Anchoring",
    subtitle: "Immutable Proof Generation",
    codeSnippet: 'EvidenceFabric.anchor({\n  commitSha: "9b3c4f...a81",\n  targetFile: "client/pages/SpatialWorld.tsx",\n  timestamp: new Date().toISOString()\n});',
    details: ["Commit SHA cryptographic binding", "Line-range implementation provenance", "Verifiable audit ledger update"],
    status: "active",
  },
  {
    stepNumber: "04",
    title: "Agent Reasoning & Projection",
    subtitle: "World Model Grounded Inference",
    codeSnippet: 'OmniStage.dispatch({\n  context: worldModel.getGraphTopology(),\n  query: "Explain architecture of SpatialWorld"\n});',
    details: ["Provider-neutral LLM adapter invocation", "Grounded zero-hallucination citation output", "Real-time 3D topology projection"],
    status: "queued",
  },
];

export interface SequentialCarouselProps {
  steps?: SequenceStep[];
  autoPlayInterval?: number; // ms
  className?: string;
}

export function SequentialCarousel({
  steps = DEFAULT_STEPS,
  autoPlayInterval = 5000,
  className,
}: SequentialCarouselProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [isPlaying, steps.length, autoPlayInterval]);

  const step = steps[currentStep];

  return (
    <div className={cn("w-full max-w-5xl mx-auto my-8 select-none", className)}>
      {/* Top Stepper Timeline Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          {steps.map((s, idx) => (
            <button
              key={s.stepNumber}
              onClick={() => setCurrentStep(idx)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-none text-xs font-mono transition-all",
                idx === currentStep
                  ? "bg-white/10 text-white border border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.1)]"
                  : "bg-white/5 text-gray-400 border border-white/10 hover:text-white"
              )}
            >
              <span className="font-bold">{s.stepNumber}</span>
              <span className="hidden sm:inline">{s.subtitle}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors"
          aria-label={isPlaying ? "Pause autoplay" : "Resume autoplay"}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main Sequential Display Card */}
      <div className="relative rounded-2xl bg-black/80 border border-white/15 p-6 md:p-8 backdrop-blur-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Left: Metadata & Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-none text-xs font-mono font-bold bg-white/10 text-white border border-white/20">
              PHASE {step.stepNumber}
            </span>
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
              {step.subtitle}
            </span>
          </div>

          <h3 className="text-2xl font-bold font-mono text-white leading-tight">
            {step.title}
          </h3>

          <ul className="space-y-2 pt-2">
            {step.details.map((detail, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>

          <div className="pt-4 flex items-center gap-4">
            <button
              onClick={() => setCurrentStep((currentStep + 1) % steps.length)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-all"
            >
              Next Phase <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Code Snippet Stage */}
        <div className="rounded-none bg-[#08090f] border border-white/10 p-4 font-mono text-xs shadow-inner space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[10px] text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-none bg-gray-600" />
              <span className="w-2 h-2 rounded-none bg-gray-500" />
              <span className="w-2 h-2 rounded-none bg-gray-400" />
            </div>
            <span>EVIDENCE TRACE</span>
          </div>
          <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {step.codeSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default SequentialCarousel;
