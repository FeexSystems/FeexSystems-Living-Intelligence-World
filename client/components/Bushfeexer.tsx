/**
 * Bushfeexer — FeexSystems Living Intelligence Chat
 *
 * Consolidated from InteractiveChatInterface + LiveChatbot.
 * Primary path: GET /api/world-model/navigator (grounded retrieval + AI explanation).
 * Fallback: local keyword heuristics when the server is unreachable.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/use-auth';

interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  suggestions?: string[];
  evidenceCount?: number;
  isError?: boolean;
  /** LLM provider that generated this message */
  provider?: "gemini" | "openai" | "none";
  /** True if the response fell back to template (no live LLM key) */
  usedFallback?: boolean;
}

interface NavigatorResult {
  explanation: string;
  projects?: Array<{ name: string; description?: string }>;
  technologies?: string[];
  groundedEvidenceCount?: number;
}

/* ─── Rich Code Block & Message Renderer ─── */
function MessageContent({ text }: { text: string }) {
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts: Array<{ type: "text" | "code"; content: string; lang?: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", lang: match[1] || "code", content: match[2].trimEnd() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  return (
    <div className="space-y-2">
      {parts.map((part, idx) => {
        if (part.type === "code") {
          return (
            <div key={idx} className="my-2 rounded-xl border border-white/20 bg-black/90 overflow-hidden font-mono text-[11px]">
              <div className="flex items-center justify-between px-3 py-1 bg-white/10 border-b border-white/10 text-white/60 text-[10px]">
                <span className="uppercase font-semibold tracking-wider">{part.lang}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(part.content)}
                  className="text-[10px] text-zinc-300 hover:text-white transition-colors"
                >
                  Copy
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-emerald-400 font-mono text-xs leading-relaxed">
                <code>{part.content}</code>
              </pre>
            </div>
          );
        }
        return (
          <div key={idx} className="whitespace-pre-wrap leading-relaxed">
            {part.content}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Heuristic fallback (no-server / graceful degrade) ─── */
function heuristicResponse(query: string): { text: string; suggestions: string[] } {
  const q = query.toLowerCase();

  if (q.match(/hello|hi|hey|greetings|start/)) {
    return {
      text: "👋 Hi! I'm **Bushfeexer**, your FeexSystems Living Intelligence Director.\n\nI can help you explore the World Model, explain system architecture, write or review code, inspect live repository evidence, or navigate our 3D Galaxy. What are you working on today?",
      suggestions: ["Tell me about FeexSystems", "Show me the projects in the World Model", "Write a code example", "Explain the 3D Galaxy"],
    };
  }

  if (q.match(/who are you|what is bushfeexer|what can you do/)) {
    return {
      text: "🤖 I am **Bushfeexer**, the autonomous Living Intelligence Director of **FEEXSYSTEMS**.\n\nI combine deep-reasoning AI with our canonical World Model—a real-time, evidence-backed knowledge graph of our GitHub ecosystem, repositories, commits, and dependencies. I can write production code, answer technical questions, and ground claims in verifiable evidence.",
      suggestions: ["What is the World Model?", "Show me projects", "How does Evidence Fabric work?", "Compare subscription plans"],
    };
  }

  if (q.match(/code|function|typescript|react|python|algorithm|sql|rust|go|debug|write/)) {
    return {
      text: "💻 **Engineering & Code Reasoning**:\n\n```typescript\n// Example: Type-Safe Async Ingestion in FeexSystems\nexport async function ingestEntity<T extends { id: string }>(\n  entity: T,\n  evidenceSha: string\n): Promise<{ success: boolean; recordedAt: string }> {\n  console.log(`Ingesting entity ${entity.id} anchored to SHA: ${evidenceSha}`);\n  return { success: true, recordedAt: new Date().toISOString() };\n}\n```\n\nAsk me for any specific function, algorithm, or component in TypeScript, Python, React, Go, Rust, or SQL, and I'll generate the complete, tested implementation.",
      suggestions: ["Write an LRU Cache in TypeScript", "Explain React Server Components", "Show database schema patterns", "How do we write unit tests with Vitest?"],
    };
  }

  if (q.match(/feex|world model|ecosystem|galaxy|spatial/)) {
    return {
      text: "🌐 **FEEXSYSTEMS World Model & 3D Spatial Galaxy**:\n\n- **Canonical Graph**: Authoritative mapping of repositories (`FEEXSYSTEMS-Persona-Digital-Portfolio`, `yurrheeler-med-advisor`), dependencies, and artifacts.\n- **Evidence Fabric**: Cryptographic commit SHAs proving every claimed architectural capability.\n- **Spatial Galaxy (`/world`)**: Three.js WebGL scene visualizing domains and system relationships.\n- **Omni-Command (`/omni`)**: Multi-agent directive orchestration.",
      suggestions: ["Open 3D Galaxy at /world", "View Projects at /projects", "Explore Evidence Fabric", "See pricing tiers"],
    };
  }

  if (q.match(/tech|docker|kubernetes|cloud|aws|gcp|database|prisma|redis|vector/)) {
    return {
      text: "⚡ **Technology Stack & Architecture**:\n\n- **Core Runtime**: React 18, React Router 7, Vite, Express 5, Node 24\n- **Data Architecture**: PostgreSQL 15 + pgvector, Prisma ORM, Redis (ioredis) + Bull queue\n- **Intelligence**: Google Gemini Interactions API (gemini-3.7-flash) with deep thinking & multi-provider routing\n- **Security**: SOC 2 Type II, ISO 27001 ready, HMAC SHA-256 webhook signatures, JWT sessions",
      suggestions: ["Explain pgvector semantic search", "How does Redis Bull queue work?", "Explain Gemini Interactions API", "Tell me about Paystack billing"],
    };
  }

  if (q.match(/pric|cost|plan|subscri|\$/)) {
    return {
      text: "💳 **FeexSystems Subscription Tiers** (Backed by Paystack):\n\n- **Starter ($29/mo)**: Individual developers, 10 World Model projects, basic AI queries.\n- **Professional ($99/mo)**: Scaling engineering teams, unlimited project nodes, priority AI reasoning, evidence exports.\n- **Enterprise ($299/mo)**: Dedicated infrastructure, SOC 2 compliance, custom AI director agent, 24/7 SLA.",
      suggestions: ["Upgrade to Professional", "Explore Starter features", "Enterprise deployment", "Contact sales"],
    };
  }

  return {
    text: "💡 **FEEXSYSTEMS Living Intelligence**:\n\nI can answer questions on code, architecture, FeexSystems, and technology. What would you like to explore?",
    suggestions: ["Explore World Model", "Write a TypeScript function", "Explain cloud architecture", "View pricing plans"],
  };
}

/* ─── API call to World Model navigator with Multi-Turn History ─── */
async function queryNavigator(
  query: string,
  history?: Array<{ role: "user" | "assistant"; text: string }>
): Promise<{
  text: string;
  suggestions: string[];
  evidenceCount?: number;
  provider?: "gemini" | "openai" | "none";
  usedFallback?: boolean;
}> {
  // 1. Try POST with history
  try {
    const postRes = await fetch("/api/world-model/navigator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, history }),
    });

    if (postRes.status === 429) {
      const rateLimitErr = new Error("RATE_LIMIT_EXCEEDED");
      (rateLimitErr as any).status = 429;
      throw rateLimitErr;
    }

    if (postRes.ok) {
      const json = await postRes.json();
      if (json.success && json.data) {
        const data = json.data;
        const llm = data.llm;
        const suggestions = (data.suggestions && data.suggestions.length > 0)
          ? data.suggestions
          : (llm?.suggestions?.length ? llm.suggestions : null)
          ?? (data.projects || []).slice(0, 2).map((p: any) => `Tell me about ${p.name}`);
        if (!suggestions.length) {
          suggestions.push("Tell me more", "Explain the architecture", "Show code examples");
        }
        return {
          text: data.explanation || "Analyzed query against the FeexSystems Living Intelligence engine.",
          suggestions,
          evidenceCount: data.groundedEvidenceCount,
          provider: llm?.provider,
          usedFallback: llm?.usedFallback,
        };
      }
    }
  } catch (err: any) {
    if (err?.status === 429) throw err;
  }

  // 2. Fallback to GET
  const res = await fetch(`/api/world-model/navigator?q=${encodeURIComponent(query)}`, {
    headers: { "Content-Type": "application/json" },
  });

  if (res.status === 429) {
    const rateLimitErr = new Error("RATE_LIMIT_EXCEEDED");
    (rateLimitErr as any).status = 429;
    throw rateLimitErr;
  }

  if (!res.ok) throw new Error(`Navigator returned ${res.status}`);

  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Navigator query failed");

  const data: NavigatorResult = json.data;
  const llm = (json.data as any)?.llm;
  const suggestions = (json.data?.suggestions && json.data.suggestions.length > 0)
    ? json.data.suggestions
    : (llm?.suggestions?.length ? llm.suggestions : null)
    ?? (data.projects || []).slice(0, 2).map((p) => `Tell me about ${p.name}`);
  if (!suggestions.length) suggestions.push("Tell me more", "Show code examples", "Explore 3D Galaxy");

  return {
    text: data.explanation || "Here's what I found in the FeexSystems World Model.",
    suggestions,
    evidenceCount: data.groundedEvidenceCount,
    provider: llm?.provider,
    usedFallback: llm?.usedFallback,
  };
}

/* ─── Component ─── */
export function Bushfeexer() {
  const { user } = useAuth();
  const roomId = user?.id || 'guest-session';
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track provider status on mount
  useEffect(() => {
    fetch("/api/world-model/providers/status")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          const { gemini, openai } = json.data;
          if (!gemini && !openai) {
            setAiWarning("No LLM keys configured. Responses use template fallback (provider: none).");
          }
        }
      })
      .catch(() => { /* non-fatal */ });
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  // Auto-greet on first open
  useEffect(() => {
    if (isOpen && !hasGreeted && messages.length === 0) {
      const timer = setTimeout(() => {
        const greeting: ChatMessage = {
          id: `greet-${Date.now()}`,
          text: "👋 Hi! I'm **Bushfeexer**, your FeexSystems Living Intelligence assistant. I'm grounded in the real World Model — synced from our live GitHub ecosystem. What would you like to explore?",
          sender: "bot",
          timestamp: new Date(),
          suggestions: [
            "Tell me about FeexSystems",
            "What projects are in the World Model?",
            "Show me the tech stack",
            "How does Evidence Fabric work?",
          ],
        };
        
        if (db) {
          addDoc(collection(db, "chat_rooms", roomId, "messages"), {
            ...greeting,
            timestamp: serverTimestamp()
          }).catch(console.error);
        } else {
          setMessages([greeting]);
        }
        setHasGreeted(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen, hasGreeted, messages.length, roomId]);

  // Firestore real-time listener
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "chat_rooms", roomId, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedMessages.push({
          id: doc.id,
          text: data.text,
          sender: data.sender,
          timestamp: data.timestamp ? (data.timestamp as Timestamp).toDate() : new Date(),
          suggestions: data.suggestions,
          evidenceCount: data.evidenceCount,
          isError: data.isError,
          provider: data.provider,
          usedFallback: data.usedFallback
        });
      });
      if (loadedMessages.length > 0) {
        setMessages(loadedMessages);
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;

      const userMsg = {
        text,
        sender: "user",
        timestamp: serverTimestamp(),
      };

      if (db) {
        await addDoc(collection(db, "chat_rooms", roomId, "messages"), userMsg);
      } else {
        setMessages((prev) => [...prev, { ...userMsg, id: `u-${Date.now()}`, timestamp: new Date() } as ChatMessage]);
      }
      
      setInput("");
      setIsTyping(true);

      try {
        const history = messages
          .slice(-6)
          .map(m => ({ role: m.sender === "user" ? ("user" as const) : ("assistant" as const), text: m.text }));

        const { text: responseText, suggestions, evidenceCount, provider, usedFallback } = await queryNavigator(text, history);
        
        const botMsg = {
            text: responseText,
            sender: "bot",
            timestamp: serverTimestamp(),
            suggestions,
            evidenceCount,
            provider,
            usedFallback,
        };

        if (db) {
            await addDoc(collection(db, "chat_rooms", roomId, "messages"), botMsg);
        } else {
            setMessages((prev) => [...prev, { ...botMsg, id: `b-${Date.now()}`, timestamp: new Date() } as ChatMessage]);
        }

      } catch (err: any) {
        if (err?.status === 429 || err?.message === "RATE_LIMIT_EXCEEDED" || err?.message?.includes("429")) {
          const errMsg = {
              text: "⚠️ **Rate Limit Reached (Max 5 queries per 15 min)**: You have reached the query limit. Please wait a few minutes before querying again, or explore the interactive 3D Galaxy directly.",
              sender: "bot",
              timestamp: serverTimestamp(),
              suggestions: ["Explore 3D Galaxy", "View Projects", "Return to Home"],
              isError: true,
          };
          if (db) addDoc(collection(db, "chat_rooms", roomId, "messages"), errMsg);
          else setMessages((prev) => [...prev, { ...errMsg, id: `b-${Date.now()}`, timestamp: new Date() } as ChatMessage]);
        } else {
          // Graceful fallback — heuristic responses
          const fallback = heuristicResponse(text);
          const fallbackMsg = {
              text: fallback.text,
              sender: "bot",
              timestamp: serverTimestamp(),
              suggestions: fallback.suggestions,
              isError: true,
          };
          if (db) addDoc(collection(db, "chat_rooms", roomId, "messages"), fallbackMsg);
          else setMessages((prev) => [...prev, { ...fallbackMsg, id: `b-${Date.now()}`, timestamp: new Date() } as ChatMessage]);
        }
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, messages, roomId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* ── Launcher button ── */}
      <button
        id="bushfeexer-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Bushfeexer AI assistant"
        aria-expanded={isOpen}
        aria-controls="bushfeexer-window"
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center
          bg-black text-white border border-white/30
          hover:border-white hover:shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-all duration-300
          hover:scale-105 ${isOpen ? "rotate-45" : ""}`}
      >
        {isOpen ? (
          <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <div className="relative">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {/* Live indicator */}
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full animate-pulse border-2 border-black" />
          </div>
        )}
      </button>

      {/* ── Chat window ── */}
      {isOpen && (
        <div
          id="bushfeexer-window"
          role="dialog"
          aria-label="Bushfeexer AI chat"
          className="fixed bottom-24 right-6 z-50 w-96 h-[32rem] flex flex-col overflow-hidden rounded-2xl
            shadow-[0_8px_64px_rgba(0,0,0,0.8)] border border-white/20
            bg-black/95 backdrop-blur-xl font-mono"
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10
              bg-zinc-950/80"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-white text-black shrink-0">
              FX
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-sm truncate">BUSHFEEXER</h3>
              <p className="text-[10px] text-white/50 truncate uppercase tracking-wider">
                Living Intelligence // Monochrome
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* AI Warning Banner — shown when no LLM keys configured */}
          {aiWarning && !warningDismissed && (
            <div role="alert" className="flex items-start gap-2 px-3 py-2 bg-amber-950/60 border-b border-amber-500/30 text-[10px] font-mono text-amber-300">
              <span className="shrink-0 mt-0.5">⚠</span>
              <span className="flex-1">{aiWarning}</span>
              <button
                onClick={() => setWarningDismissed(true)}
                aria-label="Dismiss AI warning"
                className="shrink-0 text-amber-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[84%] space-y-1.5">
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed
                      ${
                        msg.sender === "user"
                          ? "bg-white text-black font-medium rounded-br-sm shadow whitespace-pre-wrap"
                          : msg.isError
                          ? "bg-zinc-900 text-white/90 border border-white/30 rounded-bl-sm"
                          : "bg-zinc-900/90 text-white/90 border border-white/10 rounded-bl-sm"
                      }`}
                  >
                    <MessageContent text={msg.text} />
                  </div>

                  {/* Evidence badge */}
                  {msg.evidenceCount != null && msg.evidenceCount > 0 && (
                    <p className="text-[10px] text-white/40 flex items-center gap-1.5 pl-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                      {msg.evidenceCount} evidence source{msg.evidenceCount !== 1 ? "s" : ""}
                    </p>
                  )}
                  {/* Provider badge — shows which LLM (or template) answered */}
                  {msg.sender === "bot" && msg.provider && (
                    <p className="text-[9px] text-white/30 pl-1 font-mono uppercase tracking-wider">
                      [{msg.provider === "none" ? "TEMPLATE" : msg.provider.toUpperCase()}]
                      {msg.usedFallback && msg.provider !== "none" ? " (fallback)" : ""}
                    </p>
                  )}
                  {msg.isError && (
                    <p className="text-[10px] text-white/60 pl-1 font-mono">
                      [LOCAL FALLBACK - SERVER UNREACHABLE]
                    </p>
                  )}

                  {/* Suggestion chips */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {msg.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(s)}
                          className="px-2.5 py-1 text-[10px] font-mono rounded-full border border-white/20
                            text-white/70 hover:text-white hover:border-white
                            hover:bg-white/10 transition-all duration-200"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-[9px] text-white/30 pl-1 font-mono">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-zinc-900 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "240ms" }} />
                    <span className="text-[10px] text-white/50 ml-1.5 font-mono">REASONING WORLD MODEL…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10 bg-black/60">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                id="bushfeexer-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Query World Model..."
                disabled={isTyping}
                aria-label="Chat input"
                className="flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-white/20 bg-zinc-900
                  text-white placeholder-white/30 focus:outline-none focus:ring-1
                  focus:ring-white focus:border-white
                  disabled:opacity-50 transition-all"
              />
              <button
                id="bushfeexer-send"
                onClick={() => sendMessage(input)}
                disabled={isTyping || !input.trim()}
                aria-label="Send message"
                className="px-3.5 py-2 rounded-xl bg-white text-black font-semibold
                  hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed
                  transition-all active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-[9px] text-white/30 text-center mt-2 font-mono uppercase tracking-wider">
              FEEXSYSTEMS · MONOCHROME REASONING
            </p>
          </div>
        </div>
      )}
    </>
  );
}
