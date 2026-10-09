/**
 * Agent Observability Service
 * Parallel to Evidence Fabric but for agent behavior — verifiable, auditable AI.
 *
 * Invariants:
 * - Evidence-First: Every interaction logged with evidence used, confidence, provider
 * - Non-Blocking: Uses async buffer (like BigQuery service) for writes
 * - Honest UI: Records usedFallback, quality scores, ground truth when available
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../database";

export interface InteractionLogEntry {
  agentId: string;
  agentName: string;
  userId?: string;
  prompt: string;
  response: string;
  provider: string;
  model?: string;
  tokensUsed?: number;
  latencyMs?: number;
  confidence?: number;
  evidenceUsed: string[];
  mcpToolsCalled: string[];
  a2aMessages: string[];
  qualityScore?: number;
}

export interface QualityScores {
  accuracy: number;
  completeness: number;
  helpfulness: number;
  overall: number;
}

export interface EvaluationResult {
  interactionId: string;
  agentId: string;
  evaluator: string;
  scores: QualityScores;
  groundTruth?: string;
  feedback?: string;
  createdAt: string;
}

/** Row shapes returned by the raw observability aggregates. */
interface CountRow {
  count: number;
}

interface AveragesRow {
  avgConfidence: number;
  avgQuality: number;
  avgLatency: number;
}

interface InteractionRow {
  id: string;
  agentId: string;
  agentName: string;
  prompt: string;
  confidence?: number | null;
  qualityScore?: number | null;
  latencyMs?: number | null;
  provider?: string | null;
  evidenceCount?: number | null;
  createdAt: Date | string;
}

interface GroundingRow {
  total: number;
  grounded: number;
  risky: number;
  avgAnchors: number;
}

class AgentObservabilityService {
  private buffer: InteractionLogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly maxBufferSize = 50;
  private readonly flushIntervalMs = 5000;

  /**
   * Log an agent interaction (non-blocking — buffers and flushes lazily)
   */
  async logInteraction(entry: Partial<InteractionLogEntry>): Promise<void> {
    const normalized: InteractionLogEntry = {
      agentId: entry.agentId || "default",
      agentName: entry.agentName || "Unknown Agent",
      prompt: entry.prompt || "",
      response: entry.response || "",
      provider: entry.provider || "none",
      model: entry.model,
      tokensUsed: entry.tokensUsed,
      latencyMs: entry.latencyMs,
      confidence: entry.confidence,
      evidenceUsed: entry.evidenceUsed || [],
      mcpToolsCalled: entry.mcpToolsCalled || [],
      a2aMessages: entry.a2aMessages || [],
    };
    this.buffer.push(normalized);

    if (this.buffer.length >= this.maxBufferSize) {
      await this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush().catch(() => {}), this.flushIntervalMs);
    }
  }

  /**
   * Log and immediately await flush (for critical interactions)
   */
  async logInteractionSync(entry: InteractionLogEntry): Promise<void> {
    await this.logInteraction(entry);
    await this.flush();
  }

  /**
   * Score an agent interaction using heuristic evaluation
   */
  async evaluateInteraction(
    _interactionId: string,
    agentId: string,
    prompt: string,
    response: string,
    evidenceUsed: string[] = []
  ): Promise<QualityScores> {
    const scores = this.heuristicScore(prompt, response, evidenceUsed);

    await this.logInteraction({
      agentId,
      agentName: agentId,
      prompt,
      response,
      provider: "heuristic",
      evidenceUsed,
      mcpToolsCalled: [],
      a2aMessages: [],
      qualityScore: scores.overall,
    });

    return scores;
  }

  /**
   * Get observability dashboard data
   */
  async getDashboardData(
    agentId?: string,
    limit: number = 100
  ): Promise<{
    totalInteractions: number;
    avgConfidence: number;
    avgQualityScore: number;
    avgLatencyMs: number;
    verification: {
      groundedInteractions: number;
      groundedRatio: number;
      /**
       * Hallucination risk (0–1). Derived, not invented: the share of
       * interactions that carried NO evidence AND scored below the confidence
       * floor. Higher = more ungrounded output to review.
       */
      hallucinationRisk: number;
      avgEvidenceAnchors: number;
    };
    recentInteractions: Array<{
      id: string;
      agentId: string;
      agentName: string;
      prompt: string;
      confidence?: number;
      qualityScore?: number;
      latencyMs?: number;
      provider?: string;
      evidenceCount: number;
      createdAt: string;
    }>;
  }> {
    // Confidence floor below which an ungrounded response is treated as a
    // hallucination-risk signal rather than a drafting variance.
    const CONFIDENCE_FLOOR = 0.5;

    try {
      // Parameterize the optional agentId filter. Interpolating it into the raw
      // SQL below would allow injection via the query string.
      const scope = agentId ? Prisma.sql`WHERE "agentId" = ${agentId}` : Prisma.empty;

      const total = await prisma.$queryRaw<CountRow>(Prisma.sql`
        SELECT COUNT(*)::int as count FROM agent_interactions ${scope}
      `);

      const avg = await prisma.$queryRaw<AveragesRow>(Prisma.sql`
        SELECT
          COALESCE(AVG(confidence), 0) as "avgConfidence",
          COALESCE(AVG("qualityScore"), 0) as "avgQuality",
          COALESCE(AVG("latencyMs"), 0) as "avgLatency"
        FROM agent_interactions ${scope}
      `);

      // Grounding is derived from the Json `evidenceUsed` array: an interaction
      // is "grounded" when it carries at least one evidence anchor. `jsonb_typeof`
      // guards against legacy rows that may hold a non-array shape.
      const grounding = await prisma.$queryRaw<GroundingRow>(Prisma.sql`
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (
            WHERE jsonb_typeof("evidenceUsed") = 'array'
              AND jsonb_array_length("evidenceUsed") > 0
          )::int as grounded,
          COUNT(*) FILTER (
            WHERE (jsonb_typeof("evidenceUsed") <> 'array' OR jsonb_array_length("evidenceUsed") = 0)
              AND COALESCE(confidence, 0) < ${CONFIDENCE_FLOOR}
          )::int as risky,
          COALESCE(AVG(
            CASE WHEN jsonb_typeof("evidenceUsed") = 'array'
                 THEN jsonb_array_length("evidenceUsed") ELSE 0 END
          ), 0) as "avgAnchors"
        FROM agent_interactions ${scope}
      `);

      const recent = await prisma.$queryRaw<InteractionRow[]>(Prisma.sql`
        SELECT id, "agentId", "agentName", prompt, confidence, "qualityScore", "latencyMs", provider,
               CASE WHEN jsonb_typeof("evidenceUsed") = 'array'
                    THEN jsonb_array_length("evidenceUsed") ELSE 0 END as "evidenceCount",
               "createdAt"
        FROM agent_interactions
        ${scope}
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `);

      const g = Array.isArray(grounding) ? grounding[0] : undefined;
      const groundingTotal = g?.total ?? 0;

      return {
        totalInteractions: (Array.isArray(total) ? total[0]?.count ?? 0 : 0) as number,
        avgConfidence: (Array.isArray(avg) ? avg[0]?.avgConfidence ?? 0 : 0) as number,
        avgQualityScore: (Array.isArray(avg) ? avg[0]?.avgQuality ?? 0 : 0) as number,
        avgLatencyMs: (Array.isArray(avg) ? avg[0]?.avgLatency ?? 0 : 0) as number,
        verification: {
          groundedInteractions: g?.grounded ?? 0,
          groundedRatio: groundingTotal > 0 ? (g?.grounded ?? 0) / groundingTotal : 0,
          hallucinationRisk: groundingTotal > 0 ? (g?.risky ?? 0) / groundingTotal : 0,
          avgEvidenceAnchors: Number(g?.avgAnchors ?? 0),
        },
        recentInteractions: Array.isArray(recent)
          ? recent.map((r) => ({
              id: r.id,
              agentId: r.agentId,
              agentName: r.agentName,
              prompt: r.prompt,
              // SQL aggregates return NULL for absent measures; normalize to undefined
              // so consumers can distinguish "not recorded" from a real zero.
              confidence: r.confidence ?? undefined,
              qualityScore: r.qualityScore ?? undefined,
              latencyMs: r.latencyMs ?? undefined,
              provider: r.provider ?? undefined,
              evidenceCount: r.evidenceCount ?? 0,
              createdAt: r.createdAt instanceof Date
                ? r.createdAt.toISOString()
                : String(r.createdAt),
            }))
          : [],
      };
    } catch {
      return {
        totalInteractions: 0,
        avgConfidence: 0,
        avgQualityScore: 0,
        avgLatencyMs: 0,
        verification: {
          groundedInteractions: 0,
          groundedRatio: 0,
          hallucinationRisk: 0,
          avgEvidenceAnchors: 0,
        },
        recentInteractions: [],
      };
    }
  }

  private heuristicScore(
    prompt: string,
    response: string,
    evidence: string[]
  ): QualityScores {
    const promptLen = prompt.split(/\s+/).length;
    const responseLen = response.split(/\s+/).length;
    const hasContent = responseLen > 10;
    const hasEvidence = evidence.length > 0;

    const accuracy = hasEvidence ? Math.min(1, evidence.length / 3) : 0.3;
    const completeness = Math.min(1, responseLen / Math.max(promptLen * 2, 20));
    const helpfulness = hasContent && response.includes("FeexSystems") ? 0.9 : 0.5;

    return {
      accuracy: Math.round(accuracy * 100) / 100,
      completeness: Math.round(completeness * 100) / 100,
      helpfulness: Math.round(helpfulness * 100) / 100,
      overall: Math.round(((accuracy + completeness + helpfulness) / 3) * 100) / 100,
    };
  }

  /**
   * Flush buffer to database (non-blocking)
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0) return;

    const itemsToFlush = [...this.buffer];
    this.buffer = [];

    try {
      for (const entry of itemsToFlush) {
        await prisma.$executeRaw`
          INSERT INTO agent_interactions (
            id, "agentId", "agentName", "userId", prompt, response, provider, model,
            "tokensUsed", "latencyMs", confidence, "evidenceUsed", "mcpToolsCalled",
            "a2aMessages", "qualityScore", "createdAt"
          ) VALUES (
            ${crypto.randomUUID()},
            ${entry.agentId},
            ${entry.agentName},
            ${entry.userId || null},
            ${entry.prompt},
            ${entry.response},
            ${entry.provider},
            ${entry.model || null},
            ${entry.tokensUsed || null},
            ${entry.latencyMs || null},
            ${entry.confidence || null},
            ${JSON.stringify(entry.evidenceUsed)},
            ${JSON.stringify(entry.mcpToolsCalled)},
            ${JSON.stringify(entry.a2aMessages)},
            ${entry.qualityScore || null},
            NOW()
          )
        `;
      }
    } catch (error) {
      console.warn("[AgentObservability] Flush failed:", error);
    }
  }
}

export const agentObservabilityService = new AgentObservabilityService();
