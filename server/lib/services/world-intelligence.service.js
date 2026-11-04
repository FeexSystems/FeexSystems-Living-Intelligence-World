 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Feex World Intelligence service (Mission 003).
 *
 * Reads canonical World Model records, asks the provider-neutral gateway for a
 * structured interpretation, validates every citation against the *retrieved*
 * evidence ids, and persists the result in a table that is separate from
 * canonical data. It never writes to canonical tables.
 */

import { randomUUID } from 'crypto';
import { prisma } from '../database';
import { aiGateway } from './ai-gateway.service';
import {
  buildDeterministicInterpretation,
  buildInterpretationUserPrompt,

  INTERPRETATION_SYSTEM_PROMPT,
  parseModelInterpretation,

  validateClaims,
} from './world-interpretation';


export class WorldIntelligenceError extends Error {
  constructor(
    message,
     code,
     statusCode
  ) {
    super(message);this.code = code;this.statusCode = statusCode;;
    this.name = 'WorldIntelligenceError';
  }
}

export class WorldIntelligenceService {
  /** Load a bounded, read-only slice of canonical records for one project. */
  async getCanonicalContext(projectId) {
    const project = await prisma.worldModelProject.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new WorldIntelligenceError('World Model project not found', 'PROJECT_NOT_FOUND', 404);
    }

    const [evidence, artifactCount, relationshipCount] = await Promise.all([
      prisma.worldModelEvidence.findMany({
        where: { projectId },
        orderBy: { observedAt: 'desc' },
        take: 50,
      }),
      prisma.worldModelArtifact.count({ where: { projectId } }),
      prisma.worldModelRelationship.count({
        where: { OR: [{ sourceId: projectId }, { targetId: projectId }] },
      }),
    ]);

    return {
      project: {
        id: project.id,
        name: project.name,
        repository: project.repository,
        description: project.description,
        url: project.url,
        lastObservedAt: project.lastObservedAt.toISOString(),
      },
      evidence: evidence.map((e) => ({
        id: e.id,
        evidenceType: e.evidenceType,
        sourceUrl: e.sourceUrl,
        sourceRef: e.sourceRef,
        observedAt: e.observedAt.toISOString(),
      })),
      artifactCount,
      relationshipCount,
    };
  }

  /**
   * Interpret a question about a canonical project.
   *
   * If no provider is configured, or the model output is invalid, a
   * deterministic canonical-only summary is used. Fabricated citations are
   * dropped and their claims are marked unsupported before persistence.
   */
  async interpret(input



) {
    const context = await this.getCanonicalContext(input.projectId);
    const correlationId = randomUUID();
    const allowedEvidenceIds = context.evidence.map((e) => e.id);

    let parsed = buildDeterministicInterpretation(context);
    let provider = 'deterministic';
    let model = null;
    let measuredUsage = false;
    let totalTokens = 0;

    try {
      const ai = await aiGateway.generateObject(
        INTERPRETATION_SYSTEM_PROMPT,
        buildInterpretationUserPrompt(context, input.question),
        { temperature: 0.1, maxTokens: 1400, correlationId }
      );

      if (_optionalChain([ai, 'optionalAccess', _ => _.object])) {
        const raw = parseModelInterpretation(ai.object);
        if (raw) {
          const { claims, fabricatedCitationCount, unsupportedCount } = validateClaims(
            raw.claims,
            allowedEvidenceIds
          );

          const limitations = [...raw.limitations];
          if (fabricatedCitationCount > 0) {
            limitations.push(
              `${fabricatedCitationCount} citation(s) referenced evidence that was not retrieved and were removed.`
            );
          }
          if (unsupportedCount > 0) {
            limitations.push(
              `${unsupportedCount} claim(s) had no supporting evidence and are marked unsupported.`
            );
          }

          parsed = {
            answer: raw.answer,
            claims,
            limitations,
            confidence: raw.confidence,
            fabricatedCitationCount,
          };
          provider = ai.provider;
          model = _nullishCoalesce(ai.model, () => ( null));
          measuredUsage = Boolean(_optionalChain([ai, 'access', _2 => _2.usage, 'optionalAccess', _3 => _3.measured]));
          totalTokens = _nullishCoalesce(_optionalChain([ai, 'access', _4 => _4.usage, 'optionalAccess', _5 => _5.totalTokens]), () => ( 0));
        }
      }
    } catch (error) {
      console.warn('[world-intelligence] provider error; using deterministic summary', error);
    }

    const supportedClaimCount = parsed.claims.filter((c) => c.supported).length;
    const unsupportedClaimCount = parsed.claims.length - supportedClaimCount;

    const record = await prisma.worldModelInterpretation.create({
      data: {
        projectId: input.projectId,
        question: input.question,
        answer: parsed.answer,
        claims: parsed.claims ,
        limitations: parsed.limitations ,
        confidence: parsed.confidence,
        provider,
        model,
        correlationId,
        supportedClaimCount,
        unsupportedClaimCount,
      },
    });

    // Append-only usage trail; units remain 0 unless the provider measured them.
    try {
      await prisma.platformUsageEvent.create({
        data: {
          tenantId: `world-model:${input.projectId}`,
          actorId: _nullishCoalesce(input.actorId, () => ( null)),
          operation: 'world.interpret',
          provider,
          model,
          units: measuredUsage ? totalTokens : 0,
          measured: measuredUsage,
          correlationId,
          metadata: {
            supportedClaimCount,
            unsupportedClaimCount,
            fabricatedCitationCount: parsed.fabricatedCitationCount,
          },
        },
      });
    } catch (error) {
      console.warn('[world-intelligence] usage record failed', error);
    }

    return this.toDTO(record);
  }

  async listInterpretations(projectId, limit = 20) {
    const rows = await prisma.worldModelInterpretation.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
    return rows.map((row) => this.toDTO(row));
  }

   toDTO(row













) {
    return {
      id: row.id,
      projectId: row.projectId,
      question: row.question,
      answer: row.answer,
      claims: Array.isArray(row.claims) ? (row.claims ) : [],
      limitations: Array.isArray(row.limitations) ? (row.limitations ) : [],
      confidence: row.confidence,
      provider: row.provider,
      model: row.model,
      correlationId: row.correlationId,
      supportedClaimCount: row.supportedClaimCount,
      unsupportedClaimCount: row.unsupportedClaimCount,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

export const worldIntelligenceService = new WorldIntelligenceService();
