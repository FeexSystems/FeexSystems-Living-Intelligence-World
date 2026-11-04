/**
 * Cross-Product AI Reasoning Pipeline Service (Priority 3 — Nice-to-Have)
 *
 * Orchestrates: Enquiry (Mission 001) → Interpretation (Mission 003) → Advisory (Mission 005)
 */

import { prisma } from '../database';
import { aiGateway } from './ai-gateway.service';
import { logger } from '../logging';
import { verifyClaimProofs } from './claim-proof.service';
import { writeAuditLog } from './audit-log.service';

export interface CrossProductReasoningInput {
  tenantId: string;
  actorUserId?: string;
  enquirySubject: string;
  enquiryMessage: string;
  contactName?: string;
  contactEmail?: string;
  projectId: string;
  advisoryPlotId?: string;
}

export interface CrossProductReasoningResult {
  enquiryId: string;
  interpretationId: string;
  advisoryRequestId?: string;
  claims: Array<{ statement: string; supported: boolean; evidenceCount: number }>;
  finalConfidence: number;
  pipelineSteps: Array<{ step: string; status: 'completed' | 'skipped' | 'failed'; details?: string }>;
}

export async function executeCrossProductReasoningPipeline(
  input: CrossProductReasoningInput
): Promise<CrossProductReasoningResult> {
  const steps: CrossProductReasoningResult['pipelineSteps'] = [];
  const { tenantId, actorUserId, projectId, advisoryPlotId } = input;

  try {
    const idempotencyKey = `cross-product-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const enquiry = await prisma.operationsEnquiry.create({
      data: {
        tenantId,
        createdByUserId: actorUserId ?? null,
        idempotencyKey,
        source: 'cross-product-pipeline',
        contactName: input.contactName ?? null,
        contactEmail: input.contactEmail ?? null,
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
      const aiResult = await aiGateway.generateObject<{
        claims: Array<{ statement: string; confidence?: number }>;
        answer: string;
        limitations: string[];
      }>(
        'You are an engineering intelligence analyst. Analyze the enquiry.',
        `Enquiry: ${input.enquirySubject}\n${input.enquiryMessage}\nProject: ${projectId}`,
        { temperature: 0.3, maxTokens: 2000 }
      );

      const claims = aiResult?.object?.claims ?? [];
      const answer = aiResult?.object?.answer ?? 'No answer generated';
      const limitations = aiResult?.object?.limitations ?? [];

      const claimStatements = claims.map((c) => c.statement);
      const proofResult = await verifyClaimProofs(projectId, claimStatements);

      const interpretation = await prisma.worldModelInterpretation.create({
        data: {
          projectId,
          question: input.enquirySubject,
          answer,
          claims: claims.map((c, idx) => ({
            statement: c.statement,
            confidence: c.confidence ?? 0.5,
            supported: proofResult.claimResults[idx]?.supported ?? false,
            evidenceCount: proofResult.claimResults[idx]?.evidenceCount ?? 0,
          })),
          limitations,
          confidence: proofResult.adjustedConfidence,
          provider: aiResult?.provider ?? 'deterministic',
          model: aiResult?.model ?? null,
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
    let advisoryRequestId: string | undefined;
    if (advisoryPlotId) {
      try {
        const advisory = await prisma.advisoryRequest.create({
          data: {
            plotId: advisoryPlotId,
            reportedByUserId: actorUserId ?? tenantId,
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