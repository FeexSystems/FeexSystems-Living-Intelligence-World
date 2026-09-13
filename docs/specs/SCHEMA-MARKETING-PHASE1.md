# Prisma changes for Phase 1 (apply to prisma/schema.prisma)

## A. Reverse relations on existing models

On `WorldModelProject` add:
```
  marketingProducts MarketingProduct[]
  marketingEvents   MarketingEvent[]
```

On `WorldModelEvidence` add:
```
  claimLinks   MarketingClaimEvidence[]
```

On `WorldModelTechnology` add:
```
  marketingFeatures MarketingFeature[]
```

On `Repository` add:
```
  marketingProducts MarketingProduct[]
```

## B. New models and enums (append)

See full fragment in repo artifacts / local Phase 1 package. Key models:

- MarketingProduct (FK worldModelProjectId, repositoryId)
- MarketingFeature (FK productId, technologyId)
- MarketingTopic
- MarketingContentAsset (lifecycle enum, lineage parentId)
- MarketingCampaign + join tables
- MarketingAudience (no PII)
- MarketingChannel
- MarketingClaim + MarketingClaimEvidence (requires WorldModelEvidence or MarketingEvidence)
- MarketingEvidence (external sources only)
- MarketingEvent

Enums: ContentLifecycleState, MarketingChannelType

**Rule:** Material claims require ≥1 evidence link at create (Zod + service).

After applying: `npx prisma migrate dev --name marketing_phase_1_schema`
