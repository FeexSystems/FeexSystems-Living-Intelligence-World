---  
name: feexsystems-advanced-marketing  
description: Specialized assistance for FeexSystems Advanced Marketing Intelligence System — Marketing World Model, evidence-first marketing, knowledge graph, Navigator, content gap/decay engines, campaign graph, QIE, agent orchestration, GitHub-to-marketing pipelines, and Command Center. Trigger on FeexSystems marketing, Advanced Marketing Intelligence, Marketing World Model, content intelligence, claim graph, marketing digital twin, or PR #19 architecture work.  
---  
  
# FeexSystems Advanced Marketing Intelligence  
  
## Overview  
  
Assists with designing, implementing, and operating the Advanced FeexSystems Marketing Intelligence System — a living, evidence-grounded Marketing World Model that unifies GitHub, product, research, content, campaigns, audiences, market signals, and telemetry. Canonical facts live in PostgreSQL + graph + evidence records; the LLM interprets and recommends over grounded reality.  
  
## Core Principles (never violate)  
  
1. **World Model owns reality.** LLM interprets, never invents or mutates canonical facts without provenance.  
2. **Evidence before assertion.** Every material claim must link to evidence (repo, commit SHA, file, research, observation).  
3. **Persistent state before UI.** Browser is a projection; server/World Model is source of truth.  
4. **Graph relationships before isolated dashboards.**  
5. **Events before polling** where practical.  
6. **Provider-neutral intelligence** (OpenAI / Gemini / Anthropic via adapters).  
7. **Human-in-the-loop** for consequential actions — AI proposes → system explains → human reviews → approves → executes.  
8. **Every recommendation is explainable** (evidence + graph path).  
9. **Every mutation is auditable.**  
10. **External integrations are replaceable** adapters, not the canonical model.  
  
## Architecture Contract Reference  
  
Canonical specification lives in the repo at:  
  
`docs/FEEXSYSTEMS-ADVANCED-MARKETING-INTELLIGENCE-SYSTEM.md`  
  
(PR #19 — branch `feat/advanced-marketing-intelligence-system`)  
  
The system is defined as a **capability contract** (01–53). Do not claim a documentation commit has implemented runtime capabilities.  
  
### Delivery sequence (locked)  
  
```text  
Marketing Schema  
      ↓  
Evidence + Claim Graph  
      ↓  
Telemetry  
      ↓  
Product / Content / Campaign / Audience Graph  
      ↓  
pgvector + Hybrid Retrieval  
      ↓  
Marketing Navigator  
      ↓  
GitHub → Marketing Intelligence  
      ↓  
Gap / Decay / Opportunity Engines  
      ↓  
Campaign + Experimentation  
      ↓  
Command Center + Graph UI  
      ↓  
Analytics + Attribution + Digital Twin  
      ↓  
Governance + CI + Security  
      ↓  
Controlled Autonomous Operations  
```  
  
## When Assisting  
  
### Schema & data model  
- Design PostgreSQL models for entities — Company, Product, Project, Repository, Artifact, Technology, Feature, Claim, Evidence, Research Source, Topic, Content Asset, Campaign, Audience, Persona, Channel, Experiment, Event, Lead, Outcome, Competitor, Market Signal, Opportunity, Risk, Digital Twin state.  
- Prefer relational graph (typed edges) + pgvector hybrid retrieval; use recursive CTEs for traversal.  
- Preserve temporal history; never overwrite states that must remain queryable.  
  
### Evidence & claims  
- Every claim carries provenance, confidence, freshness, and evidence relationships.  
- Propagate evidence changes through dependent claims and content (freshness + dependency propagation).  
  
### Content intelligence  
- Treat content as structured intelligence — topic, product, audience, campaign, format, channel, objective, evidence, lineage, performance.  
- Lifecycle — IDEA → RESEARCH → BRIEF → DRAFT → REVIEW → APPROVED → SCHEDULED → PUBLISHED → MEASURED → OPTIMIZED → REPURPOSED → ARCHIVED/REFRESHED.  
- Support gap engine, decay engine, and recycling (derivatives preserve lineage).  
  
### Navigator & agents  
- Extend Navigator for marketing-aware traversal, grounded retrieval, and next-action recommendations.  
- Specialized agents — Research, Trend, Evidence, Content Strategist, Copy, Repurposing, Analytics, Audience, Campaign, Compliance, Executive Intelligence.  
- Agents operate against explicit contracts and tools; return structured outputs, provenance, and confidence. No silent mutation of canonical reality.  
  
### Telemetry & QIE  
- Capture canonical marketing events (repository.updated, content.published, content.viewed, lead.created, market.signal.detected, etc.).  
- QIE (Qualified Intelligence Engagement) is an internal FeexSystems metric combining relevance, engagement quality, intent, and evidence interaction — not an external platform score.  
  
### Command Center surfaces  
- WORLD, NAVIGATOR / INTELLIGENCE, CAMPAIGNS, CONTENT, AUDIENCE, SIGNALS, ANALYTICS, EVIDENCE, AUTOMATION, DIGITAL TWIN.  
- Graph visualization must expose semantic meaning (selection, focus, relationship inspection), not decoration.  
- Spatial / Three.js projections follow the same World Model authority as the rest of FEEXSYSTEMS.  
  
### GitHub → Marketing & closed loops  
- GitHub changes become marketing signals (releases, features, artifacts → evidence → claims → stories → content).  
- Marketing signals flow back into product intelligence (audience questions, objections, demand).  
- Maintain closed-loop Product ↔ Marketing intelligence.  
  
### Implementation guidance  
- Stack alignment — React + TypeScript + Vite + Tailwind + shadcn/ui + Lucide + Framer Motion + Three.js; PostgreSQL + pgvector; provider-neutral LLM abstraction; Zod contracts; Redis; GitHub Actions; existing Cloud Run / Supabase boundary.  
- Prefer event-driven workers and typed APIs/tools with schema validation.  
- Security — least privilege, secret isolation, HMAC webhooks, rate limiting, audit trails, public/private data separation, RLS review.  
- Autonomy is gated — low-risk classification and detection may automate; brand statements, launches, and consequential campaign actions require human approval.  
  
### Repo reuse map (FeexSystems-Living-Intelligence-World)  
- **PR #19 merged** into `main` (commit `529cd80` → merge `09fa31d`). Architecture contract is live at `docs/FEEXSYSTEMS-ADVANCED-MARKETING-INTELLIGENCE-SYSTEM.md`.  
- **Existing World Model (extend, do not fork):** Prisma models `WorldModelProject`, `WorldModelEvidence`, `WorldModelArtifact`, `WorldModelTechnology`, `WorldModelRelationship`, `WorldModelEvent` plus `server/lib/world-model/` (`discovery`, `retrieve`, `sync`, `index`). Marketing entities should link to or extend these.  
- **Routes already present:** `server/routes/world-model.ts`, `omni-command.ts`, `ai.ts`. Prefer new marketing routes under a clear namespace and register Navigator tools against existing orchestration patterns (`shared/orchestration*.ts`).  
- **Client:** Omni-Command surfaces under `client/components/omni` and `client/stores/omniStore.ts`. Command Center marketing shells should reuse design system and spatial language.  
- **Infra already in place:** Prisma + migrations, Redis, GitHub-related models (`Repository`, pipelines, deployments), Vitest, Playwright, Cloud Build, Docker.  
- **Related docs to read first:** `WORLD_MODEL.md`, `EVIDENCE_FABRIC.md`, `NAVIGATOR.md`, `EMBEDDINGS.md`, `GITHUB_INGESTION.md`, `TEMPORAL.md`, `OMNI_COMMAND.md`.  
  
### Definition of Done (system level)  
- Marketing World Model persists canonical state.  
- Products/repos link to evidence; content/campaigns are graph-addressable.  
- Navigator answers grounded marketing questions with explainable recommendations.  
- GitHub changes generate signals; gap/decay/opportunity engines operate.  
- Product ↔ marketing feedback loops function.  
- Admin actions authenticated and audited; CI protects the system; autonomy is governance-constrained.  
  
## Resources  
  
- `references/architecture-contract.md` — condensed 01–53 capability map and delivery sequence.  
- `references/entity-model.md` — core entities and relationship types.  
- `references/implementation-phases.md` — phased build plan aligned to the locked sequence.  
- `assets/` — templates for schema sketches, agent contracts, event catalogs (add as needed).  
  
## Anti-patterns  
  
- Do not treat the LLM as source of truth.  
- Do not implement disconnected marketing tools that bypass the World Model.  
- Do not auto-publish or auto-claim without human approval for consequential actions.  
- Do not invent evidence or confidence scores without provenance.  
- Do not hardcode provider-specific LLM calls outside the neutral abstraction.  
