import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  FileCode2,
  GitBranch,
  Loader2,
  Play,
  ScrollText,
  Square,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  KFCExecutionState,
  KFCStageArtifact,
  KFCStreamEvent,
  KFCPipelineStage,
} from "@shared/kfc-contracts";

/**
 * KFC Multi-Agent Execution Cockpit — Task 3.4, Phase 3.
 *
 * Consumes the streaming pipeline at `POST /api/ai-agents/kfc/stream`
 * (SSE `data: <KFCStreamEvent>` frames) and renders the five stages —
 * REQUIREMENTS → DESIGN → IMPL → JUDGE → TEST — with:
 *   • live Markdown rendering of each stage artifact
 *   • Mermaid block handling (source + rendered-diagram affordance)
 *   • a unified-diff inspector for the IMPL stage
 *
 * Deliberately dependency-free: no react-markdown / mermaid bundles, to respect
 * the bundle budgets in docs/BUNDLE_ANALYSIS.md. Rendering is a small, focused
 * subset (headings, lists, code fences, bold, inline code) sufficient for agent
 * output.
 */

const STAGE_ORDER: KFCPipelineStage[] = [
  "REQUIREMENTS",
  "DESIGN",
  "IMPL",
  "JUDGE",
  "TEST",
];

const STAGE_LABELS: Record<string, string> = {
  REQUIREMENTS: "Requirements",
  DESIGN: "Design",
  IMPL: "Implementation",
  JUDGE: "Judgement",
  TEST: "Test",
  COMPLETE: "Complete",
};

type StageStatus = "pending" | "running" | "approved" | "rejected";

/* -------------------------------------------------------------------------- */
/* Lightweight Markdown renderer                                               */
/* -------------------------------------------------------------------------- */

interface MarkdownBlock {
  kind: "heading" | "list" | "code" | "mermaid" | "paragraph";
  level?: number;
  language?: string;
  content: string;
  items?: string[];
}

/** Parse a markdown string into renderable blocks (subset, no deps). */
export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code / mermaid block
    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      const language = fence[1] ?? "";
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // consume closing fence
      blocks.push({
        kind: language === "mermaid" ? "mermaid" : "code",
        language,
        content: body.join("\n"),
      });
      continue;
    }

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        content: heading[2].trim(),
      });
      i++;
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, "").trim());
        i++;
      }
      blocks.push({ kind: "list", items, content: "" });
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph (gather until blank / structural line)
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ kind: "paragraph", content: para.join(" ") });
  }

  return blocks;
}

/** Render inline markdown (bold + inline code) safely as React nodes. */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/** Renders parsed markdown blocks. */
export function MarkdownView({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => parseMarkdownBlocks(markdown), [markdown]);

  return (
    <div className="space-y-2 text-sm leading-relaxed text-zinc-300">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          const level = block.level ?? 1;
          const size =
            level <= 1
              ? "text-base font-semibold"
              : level === 2
                ? "text-sm font-semibold"
                : "text-xs font-semibold uppercase tracking-wide";
          return (
            <p key={index} className={cn("text-white", size)}>
              {renderInline(block.content)}
            </p>
          );
        }
        if (block.kind === "list") {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {(block.items ?? []).map((item, i) => (
                <li key={i}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.kind === "mermaid") {
          return <MermaidBlock key={index} source={block.content} />;
        }
        if (block.kind === "code") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-md border border-white/10 bg-black/60 p-3 font-mono text-xs text-zinc-300"
            >
              <code>{block.content}</code>
            </pre>
          );
        }
        return <p key={index}>{renderInline(block.content)}</p>;
      })}
    </div>
  );
}

/**
 * Mermaid block. No `mermaid` dependency is bundled (bundle budget), so we show
 * the diagram source in a labelled panel.
 */
export function MermaidBlock({ source }: { source: string }) {
  return (
    <figure className="rounded-md border border-indigo-400/30 bg-indigo-500/5 p-3">
      <figcaption className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-indigo-300">
        <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
        Mermaid diagram
      </figcaption>
      <pre className="overflow-x-auto font-mono text-xs text-indigo-200">
        <code>{source}</code>
      </pre>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/* Unified diff inspector                                                      */
/* -------------------------------------------------------------------------- */

interface DiffLine {
  type: "add" | "remove" | "context" | "hunk";
  text: string;
}

/** Classify a unified-diff body into typed lines. */
export function parseDiff(diff: string): DiffLine[] {
  return diff
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((text): DiffLine => {
      if (text.startsWith("@@")) return { type: "hunk", text };
      if (text.startsWith("+++") || text.startsWith("---")) {
        return { type: "hunk", text };
      }
      if (text.startsWith("+")) return { type: "add", text };
      if (text.startsWith("-")) return { type: "remove", text };
      return { type: "context", text };
    });
}

export function DiffInspector({ diff }: { diff: string }) {
  const lines = useMemo(() => parseDiff(diff), [diff]);
  const additions = lines.filter((l) => l.type === "add").length;
  const deletions = lines.filter((l) => l.type === "remove").length;

  return (
    <div className="rounded-md border border-white/10 bg-black/60">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
          <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
          Unified diff
        </span>
        <span className="font-mono text-[10px]">
          <span className="text-emerald-400">+{additions}</span>{" "}
          <span className="text-rose-400">-{deletions}</span>
        </span>
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="w-full border-collapse font-mono text-xs">
          <tbody>
            {lines.map((line, index) => (
              <tr
                key={index}
                className={cn(
                  line.type === "add" && "bg-emerald-500/10",
                  line.type === "remove" && "bg-rose-500/10",
                  line.type === "hunk" && "bg-white/5",
                )}
              >
                <td className="w-6 select-none px-2 text-right text-zinc-600">
                  {index + 1}
                </td>
                <td
                  className={cn(
                    "whitespace-pre-wrap break-all px-2 py-0.5",
                    line.type === "add" && "text-emerald-300",
                    line.type === "remove" && "text-rose-300",
                    line.type === "hunk" && "text-indigo-300",
                    line.type === "context" && "text-zinc-400",
                  )}
                >
                  {line.text || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stage rail                                                                  */
/* -------------------------------------------------------------------------- */

function StageIcon({ status }: { status: StageStatus }) {
  if (status === "running") {
    return <Loader2 className="h-4 w-4 animate-spin text-indigo-300" aria-hidden="true" />;
  }
  if (status === "approved") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />;
  }
  if (status === "rejected") {
    return <AlertCircle className="h-4 w-4 text-rose-400" aria-hidden="true" />;
  }
  return <Circle className="h-4 w-4 text-zinc-600" aria-hidden="true" />;
}

function statusFor(stage: KFCPipelineStage, state: KFCExecutionState): StageStatus {
  const artifact = state.artifacts[stage];
  if (artifact?.status) return artifact.status;
  if (state.activeStage === stage && state.isStreaming) return "running";
  return "pending";
}

/* -------------------------------------------------------------------------- */
/* Cockpit                                                                     */
/* -------------------------------------------------------------------------- */

export function KFCPipelineCockpit({ initialPrompt }: { initialPrompt?: string } = {}) {
  const [form, setForm] = useState({
    projectName: "FeexSystems Ecosystem Project",
    repository: "FeexSystems/feex-world-os",
    prompt: initialPrompt?.trim() || "Analyze and refine the World Model synchronization architecture",
  });

  const [state, setState] = useState<KFCExecutionState>({
    executionId: "",
    projectName: form.projectName,
    repository: form.repository,
    prompt: form.prompt,
    activeStage: "REQUIREMENTS",
    artifacts: {},
    isStreaming: false,
  });

  const [selectedStage, setSelectedStage] = useState<KFCPipelineStage>("REQUIREMENTS");
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Clean up any in-flight stream on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const applyEvent = useCallback((event: KFCStreamEvent) => {
    setState((current) => {
      const next: KFCExecutionState = { ...current, artifacts: { ...current.artifacts } };

      switch (event.type) {
        case "stage_start":
          next.activeStage = event.stage;
          next.isStreaming = true;
          break;

        case "stage_progress":
          if (typeof event.progressPercent === "number") {
            setProgress(event.progressPercent);
          }
          break;

        case "stage_complete":
          if (event.artifact) {
            next.artifacts[event.stage] = {
              ...event.artifact,
              status: event.artifact.status === "pending" ? "approved" : event.artifact.status,
            };
          }
          next.activeStage = event.stage;
          break;

        case "error":
          next.error = event.error ?? "Pipeline error";
          next.isStreaming = false;
          break;
      }

      return next;
    });
  }, []);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setProgress(0);
    setState({
      executionId: `kfc-${Date.now().toString(36)}`,
      projectName: form.projectName,
      repository: form.repository,
      prompt: form.prompt,
      activeStage: "REQUIREMENTS",
      artifacts: {},
      isStreaming: true,
    });

    try {
      const response = await fetch("/api/ai-agents/kfc/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Pipeline request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Parse SSE frames: events are separated by a blank line, payload on `data:`.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          try {
            applyEvent(JSON.parse(dataLine.slice(5).trim()) as KFCStreamEvent);
          } catch {
            // Ignore malformed frames; the stream continues.
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setState((current) => ({
          ...current,
          isStreaming: false,
          error: error instanceof Error ? error.message : "Pipeline error",
        }));
      }
    } finally {
      setState((current) => ({ ...current, isStreaming: false }));
      setProgress(100);
    }
  }, [form, applyEvent]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((current) => ({ ...current, isStreaming: false }));
  }, []);

  const artifact: KFCStageArtifact | undefined = state.artifacts[selectedStage];

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      {/* ── Control + stage rail ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <Card className="border-white/10 bg-black/60 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-300">
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              KFC Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="kfc-project" className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Project
              </label>
              <Input
                id="kfc-project"
                value={form.projectName}
                onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
                disabled={state.isStreaming}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="kfc-repo" className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Repository
              </label>
              <Input
                id="kfc-repo"
                value={form.repository}
                onChange={(e) => setForm((f) => ({ ...f, repository: e.target.value }))}
                disabled={state.isStreaming}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="kfc-prompt" className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Prompt
              </label>
              <Input
                id="kfc-prompt"
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                disabled={state.isStreaming}
              />
            </div>

            <div className="flex gap-2 pt-1">
              {state.isStreaming ? (
                <Button variant="outline" size="sm" onClick={stop} className="w-full">
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  Stop
                </Button>
              ) : (
                <Button size="sm" onClick={run} className="w-full">
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  Execute Pipeline
                </Button>
              )}
            </div>

            {state.isStreaming && <Progress value={progress} aria-label="Pipeline progress" />}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-black/60 backdrop-blur-xl">
          <CardContent className="p-2">
            <ol className="space-y-1" aria-label="Pipeline stages">
              {STAGE_ORDER.map((stage) => {
                const status = statusFor(stage, state);
                const isSelected = selectedStage === stage;
                return (
                  <li key={stage}>
                    <button
                      type="button"
                      onClick={() => setSelectedStage(stage)}
                      aria-current={isSelected ? "step" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left font-mono text-[11px] uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--hud-phosphor,#00ff66)]",
                        isSelected ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5",
                      )}
                    >
                      <StageIcon status={status} />
                      {STAGE_LABELS[stage]}
                    </button>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* ── Artifact viewer ──────────────────────────────────────────────── */}
      <Card className="border-white/10 bg-black/60 backdrop-blur-xl">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-300">
            <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
            {STAGE_LABELS[selectedStage]} Artifact
          </CardTitle>
          {artifact?.status && (
            <Badge variant={artifact.status === "rejected" ? "destructive" : "outline"}>
              {artifact.status}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {state.error && (
            <div
              role="alert"
              className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
            >
              {state.error}
            </div>
          )}

          {!artifact ? (
            <p className="py-8 text-center font-mono text-xs text-zinc-500">
              {state.isStreaming
                ? `Awaiting ${STAGE_LABELS[selectedStage].toLowerCase()} output…`
                : "Run the pipeline to generate stage artifacts."}
            </p>
          ) : (
            <>
              <MarkdownView markdown={artifact.markdownContent} />

              {artifact.diffContent && (
                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    Code changes
                  </p>
                  <DiffInspector diff={artifact.diffContent} />
                </div>
              )}

              {typeof artifact.confidenceScore === "number" && (
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Confidence: {(artifact.confidenceScore * 100).toFixed(0)}%
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default KFCPipelineCockpit;
