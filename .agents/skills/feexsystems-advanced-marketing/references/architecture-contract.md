# FeexSystems Advanced Marketing Intelligence — Architecture Contract (Condensed)  
  
Source of truth: `docs/FEEXSYSTEMS-ADVANCED-MARKETING-INTELLIGENCE-SYSTEM.md` (PR #19).  
  
## Capability map (01–53)  
  
| # | Capability | Intent |  
|---|------------|--------|  
| 01 | The Big Idea | Continuously learning Marketing Intelligence, not a publishing workflow |  
| 02 | Marketing World | Machine-readable marketing ecosystem |  
| 03 | Entity Model | Company, Product, Repo, Claim, Evidence, Content, Campaign, Audience, … |  
| 04 | Graph | Persistent, queryable, explainable, temporal typed relationships |  
| 05 | Marketing Knowledge Graph | product→technology, content→topic, evidence→claim, etc. |  
| 06 | World Model Principle | World Model owns reality; LLM interprets |  
| 07 | Marketing Data Model | Normalized PostgreSQL structures |  
| 08 | Evidence-First Marketing | Claims traceable to evidence with provenance |  
| 09 | Content Intelligence | Content as structured intelligence + lineage |  
| 10 | Marketing Memory | PostgreSQL + pgvector semantic memory |  
| 11 | Temporal Intelligence | Velocity, decay, longevity; preserve history |  
| 12 | Content Lifecycle | IDEA → … → ARCHIVED/REFRESHED |  
| 13 | Event-Driven Marketing | Actions and signals as events |  
| 14 | Reverse Intelligence Flow | Marketing → product signals |  
| 15 | Marketing Navigator | Conversational traversal of World Model |  
| 16 | Natural-Language Queries | Grounded marketing questions |  
| 17 | Content Gap Engine | High interest + high evidence + low coverage |  
| 18 | Content Decay Engine | Stale claims, declining performance |  
| 19 | Content Recycling | Derivatives with preserved lineage |  
| 20 | Campaign Graph | Objectives, content, channels, outcomes as graph |  
| 21 | Experimentation | Hypotheses, variants, results, decisions |  
| 22 | Audience Model | Privacy-conscious interests, intent, segments |  
| 23 | Engagement Quality | Meaningful actions vs low-intent noise |  
| 24 | QIE | Qualified Intelligence Engagement (internal metric) |  
| 25 | Marketing Telemetry | Canonical event catalog |  
| 26 | Automation Engine | Event-driven operational tasks |  
| 27 | AI Agent Layer | Specialized marketing agents |  
| 28 | Agent Orchestration | Navigator + contracts + structured outputs |  
| 29 | Human-in-the-Loop | Propose → explain → review → approve → execute |  
| 30 | Marketing Command Center | WORLD, NAVIGATOR, CAMPAIGNS, CONTENT, … |  
| 31 | Graph Visualization | Semantic, explorable graph |  
| 32 | Marketing Digital Twin | Living representation of marketing state |  
| 33 | Market Signal Engine | Emerging / growing / opportunity / risk |  
| 34 | Competitive Intelligence | Positioning and capability gaps |  
| 35 | Claim Graph | Claims ↔ evidence ↔ content dependencies |  
| 36 | Research → Content | Source → opportunity → brief → content |  
| 37 | GitHub → Marketing | Repo changes as marketing signals |  
| 38 | Product → Marketing | Capability → evidence → story → content |  
| 39 | Marketing → Product | Audience signals → product intelligence |  
| 40 | Closed-Loop | Unify forward and reverse flows |  
| 41 | Attribution & Journey | Privacy-conscious multi-touch views |  
| 42 | Opportunity Detection | Ranked, explainable opportunities |  
| 43 | Predictive Intelligence | Probabilistic, explainable forecasts |  
| 44 | Recommendation Engine | Next-best actions with graph paths |  
| 45 | Evidence Freshness | Dependency propagation on change |  
| 46 | Multi-Channel Distribution | Channel adapters + formats + UTM |  
| 47 | Integration & Event Fabric | Replaceable adapters (GitHub, n8n, analytics, …) |  
| 48 | Security / Privacy / Governance | Least privilege, audit, data minimization |  
| 49 | Observability & Auditability | What happened, when, why, which evidence |  
| 50 | API & Tool Runtime | Typed, versioned, schema-validated tools |  
| 51 | Reliability / Testing / CI/CD | Typecheck, unit, integration, e2e, graph consistency |  
| 52 | Autonomous Operations | Controlled autonomy under governance |  
| 53 | North Star | Living Marketing World Model that continuously updates |  
  
## Locked delivery sequence  
  
1. Marketing Schema    
2. Evidence + Claim Graph    
3. Telemetry    
4. Product / Content / Campaign / Audience Graph    
5. pgvector + Hybrid Retrieval    
6. Marketing Navigator    
7. GitHub → Marketing Intelligence    
8. Gap / Decay / Opportunity Engines    
9. Campaign + Experimentation    
10. Command Center + Graph UI    
11. Analytics + Attribution + Digital Twin    
12. Governance + CI + Security    
13. Controlled Autonomous Operations    
  
## Technology alignment  
  
- Frontend: React, TypeScript, Vite, Tailwind, shadcn/ui, Lucide, Framer Motion, Three.js/WebGL    
- Intelligence: provider-neutral LLM abstraction, Zod contracts, Navigator, agent orchestration    
- Data: PostgreSQL, pgvector, relational knowledge graph, temporal state, evidence/claim graph    
- Infra: existing GCP/Cloud Run, Redis, object storage, secrets, GitHub Actions    
- Integration: GitHub API + webhooks, n8n, REST, SSE, analytics, channel adapters    
  
## Implementation principles (must follow)  
  
Evidence before assertion · World Model before LLM · Persistent state before UI · Graph before dashboards · Events before polling · Provider-neutral · Human approval for consequential actions · Explainable recommendations · Auditable mutations · Replaceable integrations · Telemetry feeds the same World Model · Browser is a projection.
