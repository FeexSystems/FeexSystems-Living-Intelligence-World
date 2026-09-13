/**
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
  body: z.string().max(100_000).optional(),
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
      (data.worldModelEvidenceIds?.length ?? 0) > 0 ||
      (data.marketingEvidence?.length ?? 0) > 0,
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

export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type CreateClaim = z.infer<typeof CreateClaimSchema>;
export type CreateContentAsset = z.infer<typeof CreateContentAssetSchema>;
export type CreateCampaign = z.infer<typeof CreateCampaignSchema>;
