import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send, X, Volume2, VolumeX } from "lucide-react";
import { sonikAudio } from "../../lib/sonikAudio";
import { useSpeechNavigation } from "../../hooks/useSpeechNavigation";
import { normalizeNavigatorResponse } from "../../lib/normalizeNavigatorResponse";
import { DataSourceBadge } from "../../../packages/feex-eil/renderer/DataSourceBadge";
import type { DataSourceLabel } from "../../../packages/feex-eil/contracts/agent-state";

interface Message {
  role: "user" | "holokai";
  text: string;
  timestamp: string;
  /** Calibrated confidence supplied by the backend. Never defaulted. */
  confidence?: number;
  /** Provenance of the response — mirrors the EIL DataSourceLabel contract. */
  sourceLabel?: DataSourceLabel;
  /** Model/provider that produced the response, when reported. */
  model?: string;
  suggestions?: string[];
}

interface HoloKaiVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEcosystem?: string;
}

const ECOSYSTEM_PROMPTS = [
  "Status report on BushFeexer protocols",
  "Analyze FarmPlug AI crop intelligence",
  "Diagnostic on Yurrheeler Med-Net 16 AIs",
  "Telemetry for Rentall Smarts Homes IoT mesh",
  "Inspect Firehouse Grills thermal telemetry",
  "Audit FeexKeeAuth cryptographic security",
  "Query KappaXchangefin liquidity matrix",
  "Explain 3WM Sonik audio DSP architecture"
];

export function HoloKaiVoiceModal({ isOpen, onClose, activeEcosystem: _activeEcosystem }: HoloKaiVoiceModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "holokai",
      text: "HoloKai Uplink established. I am the cognitive ghost of the Feex World Planetary OS. Speak or enter command to query canonical ecosystem intelligence.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      sourceLabel: "SIMULATED",
      suggestions: [
        "Status report on BushFeexer protocols",
        "Analyze FarmPlug AI crop intelligence",
        "Telemetry for Rentall Smarts Homes IoT mesh"
      ]
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechMuted, setSpeechMuted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const handleSubmitRef = useRef<(query?: string) => Promise<void>>(async () => {});
  const speech = useSpeechNavigation({
    autoSubmit: true,
    onFinalTranscript: (text) => { void handleSubmitRef.current(text); },
    onInterimTranscript: setInputText,
  });
  const isListening = speech.isListening;
  const toggleListening = () => {
    if (!speech.supported) {
      alert("Speech recognition is not supported in this browser. You can type commands directly.");
      return;
    }
    if (!speech.isListening) sonikAudio.unlockAudio();
    speech.toggle();
  };

  // Auto-scroll messages safely (guard for JSDOM)
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Audio visualizer loop (neon green phosphor sine wave & audio reactive bars)
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Draw horizontal reference reticle
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // Dynamic activity amplitude
      let amp = 6;
      if (isListening) amp = 24 + Math.sin(phase * 4) * 8;
      else if (isSpeaking) amp = 30 + Math.cos(phase * 5) * 12;
      else if (isLoading) amp = 16 + Math.sin(phase * 8) * 6;

      // Primary Phosphor Green Wave
      ctx.strokeStyle = "#00ff41";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00ff41";
      ctx.shadowBlur = 8;
      ctx.beginPath();

      const numPoints = 80;
      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * width;
        const normalized = (i - numPoints / 2) / (numPoints / 2);
        const envelope = Math.exp(-normalized * normalized * 2.5); // Gaussian bell envelope
        const y = centerY + Math.sin(i * 0.2 + phase) * amp * envelope;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Secondary harmonics
      ctx.strokeStyle = "rgba(0, 255, 65, 0.3)";
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * width;
        const normalized = (i - numPoints / 2) / (numPoints / 2);
        const envelope = Math.exp(-normalized * normalized * 2.5);
        const y = centerY + Math.cos(i * 0.3 - phase * 1.2) * (amp * 0.5) * envelope;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += isListening || isSpeaking ? 0.08 : 0.03;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen, isListening, isSpeaking, isLoading]);

  // Vocalize HoloKai response with Web Speech Synthesis
  const speakResponse = (text: string) => {
    if (speechMuted || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, "").slice(0, 320); // Keep vocalization crisp
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;

    // Pick crisp English voice if available
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural")));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = async (queryToSubmit?: string) => {
    const text = (queryToSubmit || inputText).trim();
    if (!text || isLoading) return;

    setInputText("");
    sonikAudio.playCyberClick(1.1);

    const userMsg: Message = {
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // POST to Gemini-powered World Model navigator endpoint
      const response = await fetch("/api/world-model/navigator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          hybrid: true,
          history: messages.slice(-6).map((m) => ({
            role: m.role === "holokai" ? "assistant" : "user",
            text: m.text
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Terminal uplink returned HTTP ${response.status}`);
      }

      const envelope = await response.json();

      // The endpoint returns { success: true, data: NavigatorResult }.
      // Read provenance fields from the unwrapped payload — reading the
      // transport envelope directly yields undefined llm/projects/
      // explanation and silently degrades every answer to "no results".
      const normalized = normalizeNavigatorResponse(envelope);
      if (normalized.kind !== "success" || !normalized.data) {
        throw new Error(normalized.errorMessage || "Navigator response unavailable");
      }
      // The normalizer preserves the source payload. No EIL evidence object
      // is constructed from summaries, provider metadata, or evidence counts.
      const data = normalized.data as any;

      // Provenance: the navigator result carries an `llm` block describing
      // which provider answered and whether it fell back. Surface it honestly
      // instead of inventing operational status.
      const llm = data.llm ?? {};
      const usedFallback = llm.usedFallback === true || llm.provider === "none";
      const sourceLabel: DataSourceLabel = usedFallback ? "FALLBACK" : "LIVE";

      // Explanation: only text the backend actually produced. When the
      // enrichment layer returned nothing, compose strictly from returned
      // retrieval metadata — never assert telemetry or system health.
      let explanation =
        typeof data.explanation === "string" && data.explanation.trim()
          ? data.explanation
          : typeof data.summary === "string" && data.summary.trim()
            ? data.summary
            : null;

      if (!explanation) {
        const projects = Array.isArray(data.projects) ? data.projects : [];
        const evidenceCount =
          typeof data.groundedEvidenceCount === "number" ? data.groundedEvidenceCount : 0;
        const names = projects
          .slice(0, 3)
          .map((p: any) => p?.name)
          .filter(Boolean)
          .join(", ");
        explanation =
          projects.length > 0
            ? `Retrieval returned ${projects.length} project${projects.length === 1 ? "" : "s"}` +
              (names ? ` (${names})` : "") +
              (evidenceCount > 0 ? ` with ${evidenceCount} grounded evidence references.` : ".") +
              (usedFallback ? " AI reasoning layer unavailable — retrieval metadata only." : "")
            : "No matching World Model entities retrieved for this query." +
              (usedFallback ? " AI reasoning layer unavailable." : "");
      }

      // Confidence is only surfaced when the backend supplies a calibrated
      // value in [0, 1]. The navigator contract does not currently emit one,
      // so the field stays absent rather than displaying an invented score.
      const rawConfidence = data.confidence;
      const confidence =
        typeof rawConfidence === "number" &&
        Number.isFinite(rawConfidence) &&
        rawConfidence >= 0 &&
        rawConfidence <= 1
          ? rawConfidence
          : undefined;

      const holokaiMsg: Message = {
        role: "holokai",
        text: explanation,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        confidence,
        sourceLabel,
        model: typeof data.aiModel === "string" ? data.aiModel : llm.model,
        suggestions: data.suggestions || llm.suggestions || []
      };

      setMessages((prev) => [...prev, holokaiMsg]);
      speakResponse(explanation);
    } catch (err: any) {
      console.warn("[HoloKai Uplink] Error:", err);
      // Honest failure: no fabricated telemetry claims. The operator sees
      // exactly what happened and that no analysis was performed.
      const statusMatch = /HTTP (\d+)/.exec(String(err?.message ?? ""));
      const detail = statusMatch ? ` (HTTP ${statusMatch[1]})` : "";
      const fallbackMsg: Message = {
        role: "holokai",
        text: `[LINK ERROR]: Navigator uplink failed${detail}. No analysis was performed and no system status can be reported. Retry, or check backend availability.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        sourceLabel: "ERROR"
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      speakResponse(fallbackMsg.text);
    } finally {
      setIsLoading(false);
    }
  };

  handleSubmitRef.current = handleSubmit;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md font-mono select-none">
      {/* Swiss Monochromatic Clinical Window Container */}
      <div className="relative w-full max-w-3xl bg-[#050505] border border-[#222] shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col h-[85vh] max-h-[750px]">
        {/* Cybernetic Corner Brackets */}
        <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-[#00ff41] z-20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-[#00ff41] z-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-[#00ff41] z-20 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-[#00ff41] z-20 pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-[#070707]">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff41] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff41]" />
            </span>
            <div className="text-xs uppercase tracking-[0.25em] font-semibold text-white">
              HOLOKAI REASONING CORE // <span className="text-[#00ff41]">GEMINI INTERACTIONS API</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSpeechMuted(!speechMuted);
                if (!speechMuted && typeof window !== "undefined") window.speechSynthesis?.cancel();
              }}
              className="p-1.5 border border-[#333] hover:border-[#00ff41] text-[#777] hover:text-[#00ff41] transition"
              title={speechMuted ? "Unmute HoloKai Voice" : "Mute HoloKai Voice"}
            >
              {speechMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              aria-label="Close HoloKai voice console"
              onClick={() => {
                speech.stop();
                if (typeof window !== "undefined") window.speechSynthesis?.cancel();
                onClose();
              }}
              className="p-1.5 border border-[#333] hover:border-[#ff0055] text-[#777] hover:text-[#ff0055] transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Real-time Oscilloscope / Waveform Visualizer */}
        <div className="relative border-b border-[#1f1f1f] bg-[#030303] px-6 py-3 flex items-center justify-between">
          <div className="w-48 sm:w-64 h-12">
            <canvas
              ref={canvasRef}
              width={260}
              height={48}
              className="w-full h-full block"
            />
          </div>

          <div className="text-right text-[10px] tracking-widest text-[#777]">
            <div>STATUS: {isListening ? <span className="text-[#00ff41] animate-pulse">MIC ACTIVE // TRANSCRIBING</span> : isSpeaking ? <span className="text-[#00ff41] animate-pulse">HOLOKAI VOCALIZING</span> : isLoading ? <span className="text-[#00ff41] animate-pulse">NAVIGATOR UPLINK</span> : "STANDBY"}</div>
            <div>SOURCE: WORLD MODEL NAVIGATOR</div>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-mono">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-4 border ${
                msg.role === "holokai"
                  ? "border-[#1c1c1c] bg-[#060606] text-[#e0e0e0]"
                  : "border-[#00ff41]/40 bg-[#00ff41]/5 text-white ml-8"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-[#666] mb-2 tracking-wider">
                <span className="flex items-center gap-2">
                  <span className={msg.role === "holokai" ? "text-[#00ff41] font-bold" : "text-white"}>
                    {msg.role === "holokai" ? "// HOLOKAI COGNITION" : "// OPERATOR COMMAND"}
                  </span>
                  {msg.sourceLabel && <DataSourceBadge label={msg.sourceLabel} />}
                  {typeof msg.confidence === "number" && (
                    <span className="text-[#888]">conf {(msg.confidence * 100).toFixed(0)}%</span>
                  )}
                  {msg.model && <span className="text-[#555]">{msg.model}</span>}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>

              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#1a1a1a] flex flex-wrap gap-2">
                  {msg.suggestions.map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleSubmit(sug)}
                      className="text-[10px] px-2.5 py-1 border border-[#2a2a2a] hover:border-[#00ff41] hover:text-[#00ff41] transition text-[#888] bg-black/40"
                    >
                      {">"} {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="p-4 border border-[#00ff41]/30 bg-[#00ff41]/5 text-[#00ff41] text-xs flex items-center gap-3">
              <span className="inline-block w-2 h-2 rounded-full bg-[#00ff41] animate-ping" />
              <span>Grounded retrieval from FeexSystems Evidence Fabric in progress...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Suggestions Ribbon */}
        <div className="px-6 py-2 border-t border-[#1a1a1a] bg-[#040404] overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2">
          {ECOSYSTEM_PROMPTS.map((prompt, pIdx) => (
            <button
              key={pIdx}
              onClick={() => handleSubmit(prompt)}
              className="text-[10px] px-2.5 py-1 border border-[#222] hover:border-[#00ff41] hover:text-[#00ff41] text-[#666] transition inline-block bg-black shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Bottom Input Console */}
        <div className="p-4 border-t border-[#1f1f1f] bg-[#070707] flex items-center gap-3">
          <button
            onClick={toggleListening}
            className={`p-3 border transition flex items-center justify-center ${
              isListening
                ? "border-[#00ff41] bg-[#00ff41] text-black shadow-[0_0_15px_rgba(0,255,65,0.5)]"
                : "border-[#333] text-[#777] hover:border-[#00ff41] hover:text-[#00ff41] bg-black"
            }`}
            title={isListening ? "Listening... click to stop" : "Speak to HoloKai (Push to Talk)"}
          >
            {isListening ? <MicOff className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4" />}
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex-1 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Speak command or enter directive for HoloKai..."
              className="flex-1 bg-black border border-[#222] focus:border-[#00ff41] px-4 py-2.5 text-xs text-white placeholder-[#555] outline-hidden font-mono transition"
            />

            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="px-4 py-2.5 border border-[#333] hover:border-[#00ff41] text-[#888] hover:text-[#00ff41] disabled:opacity-30 disabled:hover:border-[#333] disabled:hover:text-[#888] transition bg-black flex items-center gap-1.5 text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">TRANSMIT</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
