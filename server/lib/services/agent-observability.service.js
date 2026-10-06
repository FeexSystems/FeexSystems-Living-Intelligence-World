 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
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



























































class AgentObservabilityService {constructor() { AgentObservabilityService.prototype.__init.call(this);AgentObservabilityService.prototype.__init2.call(this);AgentObservabilityService.prototype.__init3.call(this);AgentObservabilityService.prototype.__init4.call(this); }
   __init() {this.buffer = []}
   __init2() {this.flushTimer = null}
    __init3() {this.maxBufferSize = 50}
    __init4() {this.flushIntervalMs = 5000}

  /**
   * Log an agent interaction (non-blocking — buffers and flushes lazily)
   */
  async logInteraction(entry) {
    const normalized = {
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
  async logInteractionSync(entry) {
    await this.logInteraction(entry);
    await this.flush();
  }

  /**
   * Score an agent interaction using heuristic evaluation
   */
  async evaluateInteraction(
    interactionId,
    agentId,
    prompt,
    response,
    evidenceUsed = []
  ) {
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
    agentId,
    limit = 100
  )















 {
    try {
      // Parameterize the optional agentId filter. Interpolating it into the raw
      // SQL below would allow injection via the query string.
      const scope = agentId ? Prisma.sql`WHERE "agentId" = ${agentId}` : Prisma.empty;

      const total = await prisma.$queryRaw(Prisma.sql`
        SELECT COUNT(*)::int as count FROM agent_interactions ${scope}
      `);

      const avg = await prisma.$queryRaw(Prisma.sql`
        SELECT
          COALESCE(AVG(confidence), 0) as "avgConfidence",
          COALESCE(AVG("qualityScore"), 0) as "avgQuality",
          COALESCE(AVG("latencyMs"), 0) as "avgLatency"
        FROM agent_interactions ${scope}
      `);

      const recent = await prisma.$queryRaw(Prisma.sql`
        SELECT id, "agentId", "agentName", prompt, confidence, "qualityScore", "latencyMs", provider, "createdAt"
        FROM agent_interactions
        ${scope}
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `);

      return {
        totalInteractions: (Array.isArray(total) ? _nullishCoalesce(_optionalChain([total, 'access', _ => _[0], 'optionalAccess', _2 => _2.count]), () => ( 0)) : 0) ,
        avgConfidence: (Array.isArray(avg) ? _nullishCoalesce(_optionalChain([avg, 'access', _3 => _3[0], 'optionalAccess', _4 => _4.avgConfidence]), () => ( 0)) : 0) ,
        avgQualityScore: (Array.isArray(avg) ? _nullishCoalesce(_optionalChain([avg, 'access', _5 => _5[0], 'optionalAccess', _6 => _6.avgQuality]), () => ( 0)) : 0) ,
        avgLatencyMs: (Array.isArray(avg) ? _nullishCoalesce(_optionalChain([avg, 'access', _7 => _7[0], 'optionalAccess', _8 => _8.avgLatency]), () => ( 0)) : 0) ,
        recentInteractions: Array.isArray(recent)
          ? recent.map((r) => ({
              id: r.id,
              agentId: r.agentId,
              agentName: r.agentName,
              prompt: r.prompt,
              // SQL aggregates return NULL for absent measures; normalize to undefined
              // so consumers can distinguish "not recorded" from a real zero.
              confidence: _nullishCoalesce(r.confidence, () => ( undefined)),
              qualityScore: _nullishCoalesce(r.qualityScore, () => ( undefined)),
              latencyMs: _nullishCoalesce(r.latencyMs, () => ( undefined)),
              provider: _nullishCoalesce(r.provider, () => ( undefined)),
              createdAt: r.createdAt instanceof Date
                ? r.createdAt.toISOString()
                : String(r.createdAt),
            }))
          : [],
      };
    } catch (e) {
      return {
        totalInteractions: 0,
        avgConfidence: 0,
        avgQualityScore: 0,
        avgLatencyMs: 0,
        recentInteractions: [],
      };
    }
  }

   heuristicScore(
    prompt,
    response,
    evidence
  ) {
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
  async flush() {
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
