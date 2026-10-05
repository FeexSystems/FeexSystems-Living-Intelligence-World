import React, { useState } from "react";
import {
  FileText,
  Code,
  ShieldCheck,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  Bot,
  Copy,
  Check,
  AlertCircle,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type {
  KFCPipelineStage,
  KFCStageArtifact,
  KFCStreamEvent,
} from "../../../shared/kfc-contracts";

const ECOSYSTEM_TARGETS = [
  { name: "3WM DSP Sonik", repo: "FeexSystems/3wm-dsp-sonik", domain: "Audio DSP" },
  { name: "Yurrheeler Med-Net", repo: "FeexSystems/yurrheeler-med-advisor", domain: "Healthcare AI" },
  { name: "FarmPlug AI", repo: "FeexSystems/farmplug-ai", domain: "AgriTech" },
  { name: "Firehouse Grills", repo: "FeexSystems/firehouse-grills", domain: "Culinary IoT" },
  { name: "FeexKeeAuth Security", repo: "FeexSystems/feexkeeauth-security", domain: "Security" },
  { name: "KappaXchangeFin", repo: "FeexSystems/kappaxchangefin", domain: "Finance" },
  { name: "Rentall Smarts Homes", repo: "FeexSystems/rentall-smarts-homes", domain: "PropTech" },
  { name: "Persona Digital Portfolio", repo: "FeexSystems/FEEXSYSTEMS-Persona-Digital-Portfolio", domain: "Intelligence" },
];

export function KFCPipelineCockpit() {
  const [selectedRepo, setSelectedRepo] = useState(ECOSYSTEM_TARGETS[1].repo);
  const [prompt, setPrompt] = useState("Add automated health telemetry sync and HIPAA boundary checks");
  const [activeStage, setActiveStage] = useState<KFCPipelineStage>("REQUIREMENTS");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>("Ready to execute spec pipeline");
  const [artifacts, setArtifacts] = useState<Partial<Record<KFCPipelineStage, KFCStageArtifact>>>({});
  const [copiedStage, setCopiedStage] = useState<string | null>(null);

  const handleCopy = (text: string, stage: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStage(stage);
    setTimeout(() => setCopiedStage(null), 2000);
  };

  const runPipeline = async () => {
    setIsRunning(true);
    setProgress(5);
    setStatusMessage("Connecting to KFC multi-agent stream...");
    setArtifacts({});

    const target = ECOSYSTEM_TARGETS.find((e) => e.repo === selectedRepo);

    try {
      const response = await fetch("/api/ai-agents/kfc/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: target?.name || "Ecosystem Project",
          repository: selectedRepo,
          prompt,
          targetDomain: target?.domain,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Failed to initialize stream (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.replace(/^data:\s*/, "").trim();
          if (!trimmed) continue;

          try {
            const event = JSON.parse(trimmed) as KFCStreamEvent;
            if (event.progressPercent) setProgress(event.progressPercent);
            if (event.message) setStatusMessage(event.message);

            if (event.type === "stage_start") {
              setActiveStage(event.stage);
            } else if (event.type === "stage_complete" && event.artifact) {
              setArtifacts((prev) => ({ ...prev, [event.stage]: event.artifact }));
              setActiveStage(event.stage);
            } else if (event.type === "error") {
              setStatusMessage(`Error: ${event.error || "Execution halted"}`);
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }
      setStatusMessage("KFC Spec Pipeline Completed Successfully!");
      setProgress(100);
    } catch (err) {
      setStatusMessage(`Stream error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setIsRunning(false);
    }
  };

  const currentArtifact = artifacts[activeStage];

  return (
    <div className="space-y-6 font-mono">
      {/* Control Console Card */}
      <div className="p-5 rounded-xl border border-white/15 bg-black/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00ff41]" />
              <h3 className="text-base font-bold text-white tracking-wide">
                KFC MULTI-AGENT SPEC COCKPIT
              </h3>
              <Badge className="bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/30 text-[10px]">
                AUTONOMOUS
              </Badge>
            </div>
            <p className="text-xs text-zinc-300 mt-1">
              Runs the 5-stage KFC agent specification pipeline grounded in the World Model Evidence Fabric.
            </p>
          </div>

          <Button
            onClick={runPipeline}
            disabled={isRunning || !prompt.trim()}
            className="bg-[#00ff41] hover:bg-[#00ff41]/90 text-black font-semibold text-xs tracking-wider px-5 py-2 shadow-[0_0_20px_rgba(0,255,65,0.3)] transition"
          >
            {isRunning ? (
              <>
                <Bot className="w-4 h-4 mr-2 animate-spin" />
                <span>EXECUTING STAGES...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2 fill-current" />
                <span>RUN SPEC PIPELINE</span>
              </>
            )}
          </Button>
        </div>

        {/* Input Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-[11px] text-zinc-300 block mb-1">TARGET ECOSYSTEM REPOSITORY</label>
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              disabled={isRunning}
              className="w-full bg-black/80 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00ff41]"
            >
              {ECOSYSTEM_TARGETS.map((t) => (
                <option key={t.repo} value={t.repo}>
                  {t.name} ({t.repo})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] text-zinc-300 block mb-1">SPECIFICATION PROMPT / FEATURE OBJECTIVE</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isRunning}
              placeholder="Describe the feature or architectural requirement..."
              className="w-full bg-black/80 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00ff41]"
            />
          </div>
        </div>

        {/* Progress & Live Telemetry Bar */}
        <div className="space-y-1.5 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#00ff41]" />
              <span>{statusMessage}</span>
            </span>
            <span className="text-zinc-300 font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-white/10" />
        </div>
      </div>

      {/* 5-Stage Stepper Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {(["REQUIREMENTS", "DESIGN", "IMPL", "JUDGE", "TEST"] as KFCPipelineStage[]).map((stg, idx) => {
          const hasArtifact = Boolean(artifacts[stg]);
          const isCurrent = activeStage === stg;
          return (
            <button
              key={stg}
              onClick={() => setActiveStage(stg)}
              className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                isCurrent
                  ? "border-[#00ff41] bg-[#00ff41]/10 text-white shadow-[0_0_15px_rgba(0,255,65,0.15)]"
                  : hasArtifact
                  ? "border-white/20 bg-white/5 text-zinc-300 hover:border-white/40"
                  : "border-white/10 bg-black/40 text-zinc-400 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-400">STAGE 0{idx + 1}</span>
                {hasArtifact && <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff41]" />}
              </div>
              <span className="font-bold text-xs">{stg}</span>
            </button>
          );
        })}
      </div>

      {/* Artifact Viewer Stage */}
      <div className="p-5 rounded-xl border border-white/15 bg-black/70 backdrop-blur-xl min-h-[360px] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#00ff41]" />
              <h4 className="text-sm font-bold text-white tracking-wide">
                {currentArtifact?.title || `Stage Artifact: ${activeStage}`}
              </h4>
              {currentArtifact?.confidenceScore && (
                <Badge variant="outline" className="text-[10px] border-[#00ff41]/30 text-[#00ff41]">
                  Confidence: {currentArtifact.confidenceScore}%
                </Badge>
              )}
            </div>

            {currentArtifact?.markdownContent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(currentArtifact.markdownContent, activeStage)}
                className="text-xs border-white/15 text-white hover:bg-white/10"
              >
                {copiedStage === activeStage ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-[#00ff41]" />
                    <span>COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    <span>COPY ARTIFACT</span>
                  </>
                )}
              </Button>
            )}
          </div>

          {currentArtifact?.markdownContent ? (
            <div className="prose prose-invert max-w-none text-xs leading-relaxed overflow-x-auto max-h-[460px] overflow-y-auto pr-2">
              <pre className="p-4 rounded-lg bg-black/60 border border-white/10 whitespace-pre-wrap font-mono text-zinc-200">
                {currentArtifact.markdownContent}
              </pre>
            </div>
          ) : (
            <div className="py-20 text-center text-zinc-400">
              <Bot className="w-8 h-8 mx-auto mb-2 text-zinc-400 animate-pulse" />
              <p className="text-xs">
                {isRunning
                  ? `Stage ${activeStage} is currently being generated by the KFC agents...`
                  : `Run the spec pipeline to produce the ${activeStage} artifact.`}
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        {currentArtifact && (
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Anchored in World Model Repository: {selectedRepo}</span>
            <span>Generated: {new Date(currentArtifact.timestamp).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default KFCPipelineCockpit;
