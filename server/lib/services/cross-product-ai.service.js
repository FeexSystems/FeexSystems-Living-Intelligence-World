 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Cross-Product AI Reasoning Pipeline Service (Priority 3 — Nice-to-Have)
 *
 * Orchestrates: Enquiry (Mission 001) → Interpretation (Mission 003) → Advisory (Mission 005)
 */

import { prisma } from '../database';
import { aiGateway } from './ai-gateway.service';
import { logger } from '../logging';
import { verifyClaimProofs } from './claim-proof.service';
import { writeAuditLog } from './audit-log.service';





















export async function executeCrossProductReasoningPipeline(
  input
) {
  const steps = [];
  const { tenantId, actorUserId, projectId, advisoryPlotId } = input;

  try {
    const idempotencyKey = `cross-product-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const enquiry = await prisma.operationsEnquiry.create({
      data: {
        tenantId,
        createdByUserId: _nullishCoalesce(actorUserId, () => ( null)),
        idempotencyKey,
        source: 'cross-product-pipeline',
        contactName: _nullishCoalesce(input.contactName, () => ( '')),
        contactEmail: _nullishCoalesce(input.contactEmail, () => ( '')),
        subject: input.enquirySubject,
        message: input.enquiryMessage,
        status: 'RECEIVED',
        aiProvider: 'deterministic',
      },
    });

    await prisma.operationsEnquiryEvent.create({
      data: {
        enquiryId: enquiry.id,
        type: 'enquiry.received',
        fromStatus: null,
        toStatus: 'RECEIVED',
      },
    });

    steps.push({
      step: 'enquiry_created',
      status: 'completed',
      details: `Enquiry ${enquiry.id} created for tenant ${tenantId}`,
    });

    // Step 2: Generate interpretation via AI gateway.
    let interpretationId = '';
    try {
      const aiResult = await aiGateway.generateObject



(
        'You are an engineering intelligence analyst. Analyze the enquiry.',
        `Enquiry: ${input.enquirySubject}\n${input.enquiryMessage}\nProject: ${projectId}`,
        { temperature: 0.3, maxTokens: 2000 }
      );

      const claims = _nullishCoalesce(_optionalChain([aiResult, 'optionalAccess', _ => _.object, 'optionalAccess', _2 => _2.claims]), () => ( []));
      const answer = _nullishCoalesce(_optionalChain([aiResult, 'optionalAccess', _3 => _3.object, 'optionalAccess', _4 => _4.answer]), () => ( 'No answer generated'));
      const limitations = _nullishCoalesce(_optionalChain([aiResult, 'optionalAccess', _5 => _5.object, 'optionalAccess', _6 => _6.limitations]), () => ( []));

      const claimStatements = claims.map((c) => c.statement);
      const proofResult = await verifyClaimProofs(projectId, claimStatements);

      const interpretation = await prisma.worldModelInterpretation.create({
        data: {
          projectId,
          question: input.enquirySubject,
          answer,
          claims: claims.map((c, idx) => ({
            statement: c.statement,
            confidence: _nullishCoalesce(c.confidence, () => ( 0.5)),
            supported: _nullishCoalesce(_optionalChain([proofResult, 'access', _7 => _7.claimResults, 'access', _8 => _8[idx], 'optionalAccess', _9 => _9.supported]), () => ( false)),
            evidenceCount: _nullishCoalesce(_optionalChain([proofResult, 'access', _10 => _10.claimResults, 'access', _11 => _11[idx], 'optionalAccess', _12 => _12.evidenceCount]), () => ( 0)),
          })),
          limitations,
          confidence: proofResult.adjustedConfidence,
          provider: _nullishCoalesce(_optionalChain([aiResult, 'optionalAccess', _13 => _13.provider]), () => ( 'deterministic')),
          model: _nullishCoalesce(_optionalChain([aiResult, 'optionalAccess', _14 => _14.model]), () => ( null)),
          correlationId: enquiry.id,
          supportedClaimCount: proofResult.claimResults.filter((r) => r.supported).length,
          unsupportedClaimCount: proofResult.claimResults.filter((r) => !r.supported).length,
        },
      });

      interpretationId = interpretation.id;

      steps.push({
        step: 'interpretation_generated',
        status: 'completed',
        details: `Interpretation created with ${proofResult.allClaimsSupported ? 'all' : 'some'} claims supported`,
      });
    } catch (aiError) {
      steps.push({
        step: 'interpretation_generated',
        status: 'failed',
        details: aiError instanceof Error ? aiError.message : String(aiError),
      });
    }

    // Step 3: Create advisory request if plotId provided.
    let advisoryRequestId;
    if (advisoryPlotId) {
      try {
        const advisory = await prisma.advisoryRequest.create({
          data: {
            plotId: advisoryPlotId,
            reportedByUserId: _nullishCoalesce(actorUserId, () => ( tenantId)),
            question: input.enquirySubject,
            observations: input.enquiryMessage,
            advisoryText: '',
            aiProvider: 'deterministic',
            aiModel: null,
            confidence: 0,
            status: 'PENDING',
          },
        });
        advisoryRequestId = advisory.id;

        steps.push({
          step: 'advisory_request_created',
          status: 'completed',
          details: `Advisory request ${advisory.id} created`,
        });
      } catch (advError) {
        steps.push({
          step: 'advisory_request_created',
          status: 'failed',
          details: advError instanceof Error ? advError.message : String(advError),
        });
      }
    } else {
      steps.push({
        step: 'advisory_request_created',
        status: 'skipped',
        details: 'No plotId provided — advisory step skipped',
      });
    }

    await writeAuditLog({
      tenantId,
      actorId: actorUserId,
      resourceType: 'CrossProductPipeline',
      resourceId: enquiry.id,
      action: 'executed',
      metadata: {
        interpretationId,
        advisoryRequestId,
        claimCount: 0,
        supportedClaimCount: 0,
        finalConfidence: 0,
      },
    });

    return {
      enquiryId: enquiry.id,
      interpretationId,
      advisoryRequestId,
      claims: [],
      finalConfidence: 0,
      pipelineSteps: steps,
    };
  } catch (error) {
    logger.error('[cross-product-ai] pipeline failed', {
      tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      enquiryId: '',
      interpretationId: '',
      advisoryRequestId: undefined,
      claims: [],
      finalConfidence: 0,
      pipelineSteps: [{
        step: 'enquiry_created',
        status: 'failed',
        details: error instanceof Error ? error.message : String(error),
      }],
    };
  }
}