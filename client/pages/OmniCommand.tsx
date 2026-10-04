import React, { useCallback, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Stage } from "@/components/omni/Stage";
import { OmniCommandBar } from "@/components/omni/OmniCommandBar";
import { ReasoningTrace } from "@/components/omni/ReasoningTrace";
import { useOmniStore } from "@/stores/omniStore";
import type { OmniCommandResponse, ReasoningStep } from "@shared/orchestration";
import { Globe, Compass, Boxes, FileCode } from "lucide-react";
import { FullWidthNav, AppleDock, AmbientLivingBackground } from "@/landing/cinematic";

async function streamOmniCommand(
  query: string,
  context: Record<string, unknown>,
  onTrace: (s: ReasoningStep) => void
): Promise<OmniCommandResponse> {
  const res = await fetch("/api/world-model/omni-command/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ query, context }),
  });

  if (!res.ok || !res.body) {
    const fallback = await fetch("/api/world-model/omni-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, context }),
    });
    const json = await fallback.json();
    if (!fallback.ok || !json.success) throw new Error(json.error || "Omni-Command failed");
    return json.data as OmniCommandResponse;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: OmniCommandResponse | null = null;
  let currentEvent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() || "";

    for (const line of parts) {
      if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const raw = line.slice(5).trim();
        if (!raw) continue;
        try {
          const data = JSON.parse(raw);
          if (currentEvent === "trace") onTrace(data as ReasoningStep);
          else if (currentEvent === "result") finalResult = data as OmniCommandResponse;
          else if (currentEvent === "error") throw new Error(data.message || "Stream error");
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }

  if (!finalResult) throw new Error("Stream ended without result");
  return finalResult;
}

export default function OmniCommandPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const bootstrapped = useRef(false);

  const {
    isProcessing,
    setProcessing,
    payload,
    setPayload,
    liveTrace,
    appendTrace,
    clearTrace,
    context,
    setContext,
    setCommand,
    pushHistory,
  } = useOmniStore();

  const execute = useCallback(
    async (query: string) => {
      setProcessing(true);
      clearTrace();
      pushHistory(query);
      setSearchParams({ q: query }, { replace: true });

      try {
        const data = await streamOmniCommand(query, context as any, appendTrace);
        setPayload(data);
        if (data.context) {
          setContext({
            ...data.context,
            sessionId: context.sessionId || data.context.sessionId,
            lastQuery: query,
          });
        }
      } catch (err) {
        setPayload({
          version: "1.0",
          requestId: "client-error",
          intent: "ERROR",
          status: "error",
          confidence: 0,
          groundedEvidenceCount: 0,
          reasoning_trace: [],
          ui_directive: {
            component: "ErrorStage",
            props: {
              message: err instanceof Error ? err.message : "Request failed",
            },
          },
          context: {},
          suggestions: [
            "Show me the backend architecture",
            "Which projects use PostgreSQL?",
            "Run a health check on the platform",
          ],
          evidence_anchors: [],
          error: {
            code: "CLIENT_FETCH_ERROR",
            message: err instanceof Error ? err.message : "Unknown",
            recoverable: true,
          },
        });
      } finally {
        setProcessing(false);
      }
    },
    [
      context,
      setProcessing,
      setPayload,
      setContext,
      pushHistory,
      appendTrace,
      clearTrace,
      setSearchParams,
    ]
  );

  // Deep-link: /omni?q=...
  useEffect(() => {
    if (bootstrapped.current) return;
    const q = searchParams.get("q");
    if (q?.trim()) {
      bootstrapped.current = true;
      setCommand(q.trim());
      execute(q.trim());
    } else {
      bootstrapped.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestions =
    payload?.suggestions?.length
      ? payload.suggestions
      : [
          "Show me the backend architecture",
          "Which projects use PostgreSQL?",
          "Run a health check on the platform",
          "Show evidence for the knowledge graph",
        ];

  const displayTrace =
    liveTrace.length > 0 ? liveTrace : payload?.reasoning_trace ?? [];

  return (
    <div className="relative w-full h-screen bg-[#000000] text-white antialiased font-mono overflow-hidden flex flex-col selection:bg-white selection:text-black">
      {/* Ambient Living Starfield & Vector Background */}
      <AmbientLivingBackground fixed={true} opacity={28} linesOpacity={14} />

      {/* Global Technical Header */}
      <FullWidthNav />

      <div className="flex-1 relative w-full h-full pt-20 pb-40">
        <Stage payload={payload} />
        <ReasoningTrace steps={displayTrace} isProcessing={isProcessing} />
      </div>

      <OmniCommandBar onSubmit={execute} suggestions={suggestions} />

      {/* Floating quick dock — offset right so it never collides with the command bar */}
      <div className="fixed bottom-6 right-4 z-40 pointer-events-auto sm:right-6">
        <AppleDock />
      </div>
    </div>
  );
}
