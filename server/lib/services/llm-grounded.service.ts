/**
 * LLM Grounded Answer Service — FeexSystems Living Intelligence
 *
 * Provider-neutral grounded answer generation over World Model retrieval context.
 * Uses raw fetch (no SDK dependency) alongside gemini.service.ts.
 *
 * Invariants:
 * - World Model is Authoritative: only explains retrieval, never invents facts.
 * - Provider-Neutral: Gemini → OpenAI → template, order driven by DEFAULT_AI_PROVIDER.
 * - Non-Blocking: missing keys → graceful template fallback, explicit provider: "none".
 * - Honest UI: always returns usedFallback flag for client badge display.
 */

export type LlmProviderId = "gemini" | "openai" | "none";

export interface GroundedContext {
  query: string;
  explanation?: string;
  projects?: Array<{
    id?: string;
    name: string;
    repository?: string;
    description?: string;
    url?: string;
  }>;
  technologies?: Array<{ name: string; projectCount?: number }>;
  artifacts?: Array<{ path: string; sha?: string; kind?: string }>;
  claims?: Array<{ statement: string; score?: number }>;
  contentAssets?: Array<{ title: string; type: string }>;
  campaigns?: Array<{ name: string; status?: string }>;
  ranking?: { mode?: string; vectorHits?: number };
}

export interface GroundedAnswer {
  text: string;
  provider: LlmProviderId;
  model?: string;
  usedFallback: boolean;
  suggestions: string[];
}

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM = `You are Bushfeexer / FEEXSYSTEMS Living Intelligence assistant.
You answer ONLY from the provided World Model context.
Rules:
- Do not invent repositories, SHAs, or projects absent from context.
- If context is thin, say so and suggest syncing the World Model.
- Prefer short, structured answers with bullet evidence.
- Tone: precise, engineering, confident but honest.`;

// ── Prompt builder ───────────────────────────────────────────────────────────

function buildUserPrompt(ctx: GroundedContext): string {
  return [
    `User query: ${ctx.query}`,
    ``,
    `Retrieval mode: ${ctx.ranking?.mode || "unknown"} (vectorHits=${ctx.ranking?.vectorHits ?? 0})`,
    `Template note: ${ctx.explanation || "(none)"}`,
    ``,
    `Projects:`,
    ...(ctx.projects || []).slice(0, 12).map(
      (p) =>
        `- ${p.name} | ${p.repository || p.id || ""} | ${p.description || ""} | ${p.url || ""}`
    ),
    ``,
    `Technologies:`,
    ...(ctx.technologies || []).slice(0, 12).map(
      (t) => `- ${t.name} (${t.projectCount ?? "?"} projects)`
    ),
    ``,
    `Artifacts:`,
    ...(ctx.artifacts || []).slice(0, 12).map(
      (a) => `- ${a.path} sha:${a.sha?.slice(0, 12) || "—"} (${a.kind || "file"})`
    ),
    ``,
    `Marketing Claims:`,
    ...(ctx.claims || []).slice(0, 8).map(
      (c) => `- ${c.statement}`
    ),
    ``,
    `Content Assets:`,
    ...(ctx.contentAssets || []).slice(0, 8).map(
      (a) => `- ${a.title} (${a.type})`
    ),
    ``,
    `Write a grounded answer for the user.`,
  ].join("\n");
}

// ── Template fallback (no LLM keys) ─────────────────────────────────────────

function templateAnswer(ctx: GroundedContext): GroundedAnswer {
  const lines: string[] = [];
  if (ctx.explanation) lines.push(ctx.explanation);
  if (ctx.projects?.length) {
    lines.push("", "**Projects**");
    for (const p of ctx.projects.slice(0, 5)) {
      lines.push(
        `- **${p.name}**${p.repository ? ` (\`${p.repository}\`)` : ""}`
      );
    }
  }
  if (ctx.technologies?.length) {
    lines.push("", "**Technologies**");
    for (const t of ctx.technologies.slice(0, 6)) lines.push(`- ${t.name}`);
  }
  if (!ctx.projects?.length && !ctx.technologies?.length) {
    lines.push(
      "No strong World Model matches yet. Run GitHub sync / embedding reindex, or try a project or technology name."
    );
  }
  const suggestions = [
    ...(ctx.projects || []).slice(0, 2).map((p) => `Tell me about ${p.name}`),
    "Show me the architecture graph",
    "What evidence backs this?",
  ].slice(0, 4);

  return {
    text: lines.join("\n"),
    provider: "none",
    usedFallback: true,
    suggestions,
  };
}

// ── Provider call helpers ────────────────────────────────────────────────────

import { aiGateway } from "./ai-gateway.service";

// ── Main export ──────────────────────────────────────────────────────────────

export async function generateGroundedAnswer(
  ctx: GroundedContext
): Promise<GroundedAnswer> {
  const user = buildUserPrompt(ctx);
  
  const out = await aiGateway.generateText(SYSTEM, user);
  if (out?.text) {
    const suggestions = [
      ...(ctx.projects || [])
        .slice(0, 2)
        .map((p) => `Tell me about ${p.name}`),
      ...(ctx.claims || [])
        .slice(0, 1)
        .map(() => "Show evidence for claims"),
      "Show architecture",
      "Show evidence",
    ].slice(0, 4);
    
    return {
      text: out.text,
      provider: out.provider,
      model: out.model,
      usedFallback: false,
      suggestions,
    };
  }

  return templateAnswer(ctx);
}

/** Returns a status object describing which LLM providers are configured. */
export async function getLlmProviderStatus(): Promise<{
  gemini: boolean;
  openai: boolean;
  anthropic: boolean;
  default: string;
  geminiModel: string;
}> {
  return {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    default: process.env.DEFAULT_AI_PROVIDER || "gemini",
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  };
}
