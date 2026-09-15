# Implementation Phases — Advanced FeexSystems Marketing Intelligence  
  
Aligned to the locked delivery sequence in the architecture contract. Each phase produces testable, mergeable increments against the capability contract (not a big-bang rewrite).  
  
**Repo baseline:** PR #19 merged to `main`. Extend existing `WorldModel*` Prisma models and `server/lib/world-model/` — do not fork a parallel graph.  
  
## Phase 0 — Foundations & repo alignment (prerequisite)  
  
- Confirm architecture contract on `main` is binding.  
- Align with existing FEEXSYSTEMS invariants (World Model authoritative, Evidence Fabric, non-blocking init, provider-neutral AI, browser as projection, dual-mode routing, 3D spatial meaning).  
- Inventory existing Prisma schema (`WorldModelProject`, `WorldModelEvidence`, `WorldModelArtifact`, `WorldModelTechnology`, `WorldModelRelationship`, `WorldModelEvent`), server routes, Navigator, embeddings, GitHub ingestion, and telemetry patterns; reuse rather than duplicate.  
- Establish marketing-specific package/module boundaries under `server/` and `client/` (or agreed monorepo layout).  
- CI baseline: typecheck, lint, unit tests already green.  
  
**Exit criteria:** Architecture doc accepted as contract; team agrees on module layout and reuse points (especially World Model extension strategy).  
  
## Phase 1 — Marketing Schema  
  
- Extend Prisma with core marketing entities: Product, Technology (align/extend WorldModelTechnology), Feature, Topic, ContentAsset, Campaign, Audience, Channel, Experiment, Lead, Outcome, Competitor, MarketSignal, Opportunity.  
- Link to existing Repository / WorldModelProject where appropriate.  
- Add temporal fields and soft-history where required.  
- Migrations + seed fixtures for FeexSystems products and a few sample content/campaign records.  
- Typed shared contracts (Zod) for entity create/update.  
  
**Exit criteria:** Schema migrates cleanly; seeds load; API CRUD for primary entities with authz.  
  
## Phase 2 — Evidence + Claim Graph  
  
- Evidence and Claim models with provenance, confidence, freshness (extend/wrap WorldModelEvidence).  
- Typed edges: evidence→supports→claim, claim→about→product|feature|technology, content→asserts→claim.  
- Graph consistency checks (no orphan claims without evidence for material assertions).  
- Basic graph traversal helpers (recursive CTEs or application-level; reuse WorldModelRelationship patterns).  
  
**Exit criteria:** Claims can be created only with evidence links; dependency queries work; unit tests for graph integrity.  
  
## Phase 3 — Telemetry  
  
- Canonical marketing event catalog (repository.updated, content.published, content.viewed, lead.created, market.signal.detected, …).  
- Event ingestion API + worker; append-only event store linked to entities.  
- First-party instrumentation hooks from existing site/world surfaces where possible.  
  
**Exit criteria:** Events persist, are queryable by entity and time window, and feed basic counts.  
  
## Phase 4 — Product / Content / Campaign / Audience Graph  
  
- Full relationship set among Product, ContentAsset, Campaign, Audience, Channel.  
- Content lifecycle state machine + lineage (parentId / derivatives).  
- Campaign graph structure (objectives, assets, channels, experiments).  
- Privacy-conscious Audience model.  
  
**Exit criteria:** Neighborhood queries answer marketing questions; lifecycle transitions validated; lineage preserved.  
  
## Phase 5 — pgvector + Hybrid Retrieval  
  
- Reuse existing embeddings pipeline for content, claims, topics, research summaries.  
- Hybrid retrieval (vector + full-text + graph filters) with provenance always returned.  
- Indexing jobs on create/update of embeddable entities.  
  
**Exit criteria:** Semantic marketing search returns grounded results with sources.  
  
## Phase 6 — Marketing Navigator  
  
- Register marketing tools with existing Navigator/orchestration layer.  
- Tools: traverse graph, retrieve evidence, list gaps (stub), recommend next actions, explain claim.  
- Structured, cited responses; execution traces; provider-neutral LLM path only.  
  
**Exit criteria:** Navigator answers grounded marketing questions; every answer includes evidence/graph path summary.  
  
## Phase 7 — GitHub → Marketing Intelligence  
  
- Verified GitHub webhooks (HMAC) + API adapters.  
- Map significant events → Evidence and/or MarketSignal (extend world-model sync patterns).  
- Optional draft Opportunity or content brief suggestion.  
- Link Repository / WorldModelProject into marketing graph.  
  
**Exit criteria:** Release or feature commit produces marketing signal; e2e fixture webhook test passes.  
  
## Phase 8 — Gap / Decay / Opportunity Engines  
  
- Content Gap Engine, Content Decay Engine, Opportunity Detection with explainable factors.  
- Evidence freshness propagation job.  
- Content recycling stubs preserving lineage.  
  
**Exit criteria:** Engines produce ranked, explainable lists; jobs run; scoring tests pass.  
  
## Phase 9 — Campaign + Experimentation  
  
- Campaign CRUD + graph attachment.  
- Experiment model (hypothesis, variants, cohorts, observations, decision).  
- Wire telemetry into outcome views; QIE as internal computed metric.  
  
**Exit criteria:** Campaign + content + experiment + basic performance from telemetry.  
  
## Phase 10 — Command Center + Graph UI  
  
- Marketing Command Center shells (WORLD, NAVIGATOR, CAMPAIGNS, CONTENT, AUDIENCE, SIGNALS, ANALYTICS, EVIDENCE, AUTOMATION, DIGITAL TWIN).  
- Graph visualization with selection/focus/relationship inspection; reuse Omni-Command spatial language.  
- Deep links into Navigator and entity detail.  
  
**Exit criteria:** Operators explore marketing graph and open Navigator from Command Center in staging.  
  
## Phase 11 — Analytics + Attribution + Digital Twin  
  
- Performance, temporal trends, cohort views from World Model + telemetry.  
- Privacy-conscious journey views.  
- Marketing Digital Twin snapshots and projection APIs.  
  
**Exit criteria:** Dashboards and twin views driven only by World Model + telemetry stores.  
  
## Phase 12 — Governance + CI + Security  
  
- Authz matrix, audit trail, secret isolation, webhook verification, rate limiting, RLS review.  
- Test matrix (unit, integration, graph consistency, ingestion, API contracts, Playwright smoke).  
- GitHub Actions gates; observability for ingestion and agents.  
  
**Exit criteria:** Security and reliability items in system Definition of Done satisfied.  
  
## Phase 13 — Controlled Autonomous Operations  
  
- Low-risk automation only (signal detection, classification, gap detection, draft generation, stale-evidence flags).  
- Agent contracts; hard gates on publish/brand/spend actions.  
- Execution traces and operator review UI.  
  
**Exit criteria:** Autonomy under policy; consequential actions require approval; audit complete.  
  
## Milestone summary  
  
| Milestone | Phases | Outcome |  
|-----------|--------|---------|  
| M1 Foundation | 0–3 | Schema, evidence/claim, telemetry |  
| M2 Intelligence core | 4–6 | Graph, hybrid retrieval, Navigator |  
| M3 Signals & engines | 7–8 | GitHub→marketing, gap/decay/opportunity |  
| M4 Operations | 9–11 | Campaigns, Command Center, analytics, twin |  
| M5 Hardening & autonomy | 12–13 | Governance, CI, controlled autonomy |
