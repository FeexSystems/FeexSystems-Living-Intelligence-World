import { geminiService } from "./gemini.service";
import { generateGroundedAnswer, LlmProviderId } from "./llm-grounded.service";

export interface NavigatorProject {
  name: string;
  description?: string;
  repository?: string;
}

/**
 * Result of a navigator retrieval, extended with the optional AI enrichment
 * metadata attached by the Gemini interactions layer and the grounded-answer
 * layer.
 */
export interface NavigatorResult {
  query: string;
  explanation: string;
  projects: NavigatorProject[];
  technologies: Array<{ name: string; projectCount?: number }>;
  artifacts: Array<{ path: string; kind?: string; sha?: string; projectName?: string }>;
  groundedEvidenceCount: number;
  ranking?: { mode?: string; vectorHits?: number };
  aiModel?: string;
  aiMode?: string;
  suggestions?: string[];
  llm?: {
    provider: LlmProviderId;
    model?: string;
    usedFallback: boolean;
    suggestions: string[];
  };
}

export interface NavigatorQueryOptions {
  /** Use hybrid (keyword + vector) retrieval. Defaults to true. */
  hybrid?: boolean;
  /** Optional multi-turn conversation history for the Gemini interactions layer. */
  history?: Array<{ role: "user" | "assistant"; text: string }>;
  /** Label used in fallback warnings so callers can identify themselves. */
  source?: string;
}

/**
 * Enriches a raw navigator retrieval result with two AI layers:
 *
 * 1. Deep interactive reasoning via the Gemini Interactions API
 *    (sets explanation / suggestions / aiModel / aiMode).
 * 2. A standardized grounded-answer layer that attaches an `llm` metadata
 *    block describing which provider answered.
 *
 * Both layers fail soft: if either AI call throws, the raw retrieval result
 * is returned with a clearly-labeled fallback `llm` block instead of
 * failing the whole request.
 */
export async function enrichNavigatorResult(
  result: NavigatorResult,
  options: NavigatorQueryOptions = {}
): Promise<NavigatorResult> {
  const label = options.source || "Navigator";

  // Layer 1: Gemini Interactions API reasoning
  try {
    const interactive = await geminiService.generateInteractiveResponse({
      prompt: result.query,
      history: options.history,
      groundedEntities: (result.projects || []).map((p) => ({
        name: p.name,
        type: "project",
        description: p.description,
        repository: p.repository,
      })),
      technologies: result.technologies,
      artifacts: result.artifacts,
    });

    if (interactive.explanation) {
      result.explanation = interactive.explanation;
    }
    result.suggestions = interactive.suggestions;
    result.aiModel = interactive.model;
    result.aiMode = interactive.mode;
  } catch (aiErr) {
    console.warn(`[${label}] Gemini reasoning fallback:`, aiErr);
  }

  // Layer 2: grounded answer with standardized llm metadata block
  try {
    const grounded = await generateGroundedAnswer({
      query: result.query,
      explanation: result.explanation,
      projects: result.projects,
      technologies: result.technologies,
      artifacts: result.artifacts,
      ranking: result.ranking,
    });
    // Use grounded prose only if Interactions API didn't already set a rich explanation
    if (!result.explanation || grounded.provider !== "none") {
      result.explanation = grounded.text;
    }
    result.llm = {
      provider: grounded.provider,
      model: grounded.model,
      usedFallback: grounded.usedFallback,
      suggestions: grounded.suggestions,
    };
    // Prefer grounded suggestions if the interactions layer didn't provide any
    if (!result.suggestions?.length) {
      result.suggestions = grounded.suggestions;
    }
  } catch (groundedErr) {
    console.warn(`[${label}] Grounded answer fallback:`, groundedErr);
    result.llm = { provider: "none", usedFallback: true, suggestions: [] };
  }

  return result;
}
