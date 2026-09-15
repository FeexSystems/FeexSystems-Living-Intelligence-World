 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Marketing domain contracts (Phase 1)
 * Spec: docs/specs/marketing-module-layout.md
 * Capability mapping: 03, 07, partial 08, 12 (lifecycle enum)
 */
import { z } from "zod";

export const ContentLifecycleStateSchema = z.enum([
  "IDEA",
  "RESEARCH",
  "BRIEF",
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "MEASURED",
  "OPTIMIZED",
  "REPURPOSED",
  "ARCHIVED",
  "REFRESHED",
]);

export const MarketingChannelTypeSchema = z.enum([
  "LINKEDIN",
  "X",
  "YOUTUBE",
  "NEWSLETTER",
  "SITE",
  "DOCS",
  "FEEX_WORLD",
  "OTHER",
]);

export const CreateProductSchema = z.object({
  slug: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  worldModelProjectId: z.string().optional().nullable(),
  repositoryId: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const CreateFeatureSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  technologyId: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateTopicSchema = z.object({
  slug: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateContentAssetSchema = z.object({
  slug: z.string().min(1).max(160),
  title: z.string().min(1).max(300),
  summary: z.string().max(2000).optional(),
  body: z.string().max(100000).optional(),
  format: z.string().max(80).optional(),
  lifecycle: ContentLifecycleStateSchema.optional(),
  productId: z.string().optional().nullable(),
  topicId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  channelType: MarketingChannelTypeSchema.optional().nullable(),
  objective: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateContentAssetSchema = CreateContentAssetSchema.partial();

export const CreateCampaignSchema = z.object({
  slug: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  objective: z.string().max(2000).optional(),
  status: z.string().max(40).optional(),
  productIds: z.array(z.string()).optional(),
  contentIds: z.array(z.string()).optional(),
  audienceIds: z.array(z.string()).optional(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateAudienceSchema = z.object({
  slug: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  /** Interests / segments only — no PII */
  interests: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Material claims require at least one evidence reference.
 * Prefer worldModelEvidenceId when the proof lives in the World Model.
 */
export const CreateClaimSchema = z
  .object({
    statement: z.string().min(1).max(2000),
    productId: z.string().optional().nullable(),
    confidence: z.number().min(0).max(1).optional(),
    metadata: z.record(z.unknown()).optional(),
    worldModelEvidenceIds: z.array(z.string()).optional(),
    marketingEvidence: z
      .array(
        z.object({
          sourceType: z.string().min(1),
          sourceUrl: z.string().url(),
          sourceRef: z.string().optional(),
          confidence: z.number().min(0).max(1).optional(),
        })
      )
      .optional(),
  })
  .refine(
    (data) =>
      (_nullishCoalesce(_optionalChain([data, 'access', _ => _.worldModelEvidenceIds, 'optionalAccess', _2 => _2.length]), () => ( 0))) > 0 ||
      (_nullishCoalesce(_optionalChain([data, 'access', _3 => _3.marketingEvidence, 'optionalAccess', _4 => _4.length]), () => ( 0))) > 0,
    {
      message:
        "Material claims require at least one evidence link (worldModelEvidenceIds or marketingEvidence)",
    }
  );

export const CreateMarketingEventSchema = z.object({
  eventType: z.string().min(1).max(120),
  worldModelProjectId: z.string().optional().nullable(),
  contentAssetId: z.string().optional().nullable(),
  campaignId: z.string().optional().nullable(),
  payload: z.record(z.unknown()).optional(),
  occurredAt: z.coerce.date().optional(),
});

 




// --- Phase 6: Marketing Navigator (grounded Q&A + explainable recommendations) ---

/** Query contract — mirrors existing navigator query style (`?q=<query>`). */
export const MarketingNavigatorQuerySchema = z.object({
  q: z.string().min(1).max(500),
  /** Optional product scoping for focused answers. */
  productId: z.string().optional(),
  /** Max retrieved items per category (claims/content/campaigns). Default 5, max 20. */
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

 

/** A recommendation produced from grounded signals — never invented by the LLM. */
export const NavigatorRecommendationSchema = z.object({
  id: z.string(),
  kind: z.enum(["CONTENT_GAP", "CONTENT_DECAY", "OPPORTUNITY", "EVIDENCE_REFRESH", "NEXT_ACTION"]),
  title: z.string().max(300),
  rationale: z.string().max(2000),
  confidence: z.number().min(0).max(1),
  /** Ordered entity path explaining WHY (e.g. product → feature → claim → evidence). */
  graphPath: z.array(z.object({
    id: z.string(),
    type: z.string().max(60),
    label: z.string().max(300),
  })).min(1),
  /** Evidence anchors backing the recommendation (repo url, sha, source url). */
  evidence: z.array(z.object({
    id: z.string(),
    sourceUrl: z.string().url().optional(),
    sourceRef: z.string().max(300).optional(),
    observedAt: z.string().datetime().optional(),
  })).default([]),
});
 

/** Full grounded answer returned by GET /api/marketing/navigator. */
export const MarketingNavigatorAnswerSchema = z.object({
  version: z.literal("1.0"),
  query: z.string(),
  answer: z.string(),                       // grounded prose (LLM-interpreted, template fallback)
  grounded: z.boolean(),                    // false when template fallback was used
  provider: z.string().max(60).optional(),  // e.g. "gemini", "openai", "template"
  claims: z.array(z.object({
    id: z.string(),
    statement: z.string(),
    confidence: z.number().optional(),
    productId: z.string().nullable().optional(),
    evidenceCount: z.number().int().min(0),
  })),
  contentAssets: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    state: z.string(),
  })),
  campaigns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
  })),
  recommendations: z.array(NavigatorRecommendationSchema).max(10),
  suggestions: z.array(z.string().max(200)).max(6),
});
 
