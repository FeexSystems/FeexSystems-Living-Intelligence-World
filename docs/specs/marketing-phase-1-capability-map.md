# Phase 1 PR — Capability Mapping

| Capability | Status in this PR |
|------------|-------------------|
| 03 Entity Model | Partial — Product, Feature, Topic, ContentAsset, Campaign, Audience, Channel, Claim, Evidence links, Event |
| 06 World Model Principle | Enforced — FKs to WorldModelProject / WorldModelEvidence / WorldModelTechnology |
| 07 Marketing Data Model | Initial schema + Zod contracts |
| 08 Evidence-First Marketing | Claim create requires ≥1 evidence link |
| 12 Content Lifecycle | Enum present; transitions validated later |

**Non-goals in this PR:** Gap/decay engines, Navigator tools, Command Center UI, autonomy.
