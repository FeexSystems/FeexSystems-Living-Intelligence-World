 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
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

 



























// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM = `You are Bushfeexer / FEEXSYSTEMS Living Intelligence assistant.
You answer ONLY from the provided World Model context.
Rules:
- Do not invent repositories, SHAs, or projects absent from context.
- If context is thin, say so and suggest syncing the World Model.
- Prefer short, structured answers with bullet evidence.
- Tone: precise, engineering, confident but honest.`;

// ── Prompt builder ───────────────────────────────────────────────────────────

function buildUserPrompt(ctx) {
  return [
    `User query: ${ctx.query}`,
    ``,
    `Retrieval mode: ${_optionalChain([ctx, 'access', _ => _.ranking, 'optionalAccess', _2 => _2.mode]) || "unknown"} (vectorHits=${_nullishCoalesce(_optionalChain([ctx, 'access', _3 => _3.ranking, 'optionalAccess', _4 => _4.vectorHits]), () => ( 0))})`,
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
      (t) => `- ${t.name} (${_nullishCoalesce(t.projectCount, () => ( "?"))} projects)`
    ),
    ``,
    `Artifacts:`,
    ...(ctx.artifacts || []).slice(0, 12).map(
      (a) => `- ${a.path} sha:${_optionalChain([a, 'access', _5 => _5.sha, 'optionalAccess', _6 => _6.slice, 'call', _7 => _7(0, 12)]) || "—"} (${a.kind || "file"})`
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

function templateAnswer(ctx) {
  const lines = [];
  if (ctx.explanation) lines.push(ctx.explanation);
  if (_optionalChain([ctx, 'access', _8 => _8.projects, 'optionalAccess', _9 => _9.length])) {
    lines.push("", "**Projects**");
    for (const p of ctx.projects.slice(0, 5)) {
      lines.push(
        `- **${p.name}**${p.repository ? ` (\`${p.repository}\`)` : ""}`
      );
    }
  }
  if (_optionalChain([ctx, 'access', _10 => _10.technologies, 'optionalAccess', _11 => _11.length])) {
    lines.push("", "**Technologies**");
    for (const t of ctx.technologies.slice(0, 6)) lines.push(`- ${t.name}`);
  }
  if (!_optionalChain([ctx, 'access', _12 => _12.projects, 'optionalAccess', _13 => _13.length]) && !_optionalChain([ctx, 'access', _14 => _14.technologies, 'optionalAccess', _15 => _15.length])) {
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
  ctx
) {
  const user = buildUserPrompt(ctx);
  
  const out = await aiGateway.generateText(SYSTEM, user);
  if (_optionalChain([out, 'optionalAccess', _16 => _16.text])) {
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
export async function getLlmProviderStatus()





 {
  return {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    default: process.env.DEFAULT_AI_PROVIDER || "gemini",
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  };
}
