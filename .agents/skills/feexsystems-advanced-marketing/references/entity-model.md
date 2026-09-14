# Core Entity Model & Relationship Types  
  
## Core entities  
  
| Entity | Purpose |  
|--------|---------|  
| Company | FeexSystems (and related org context) |  
| Product | Shipable product / surface |  
| Project | Internal or public project |  
| Repository | GitHub (or equivalent) repo |  
| Artifact | Build, demo, doc, binary, design asset |  
| Technology | Language, framework, infra, technique |  
| Feature | Product capability |  
| Claim | Asserted product/tech statement |  
| Evidence | Verifiable anchor (commit, file, paper, observation) |  
| Research Source | Paper, post, dataset, talk |  
| Topic | Thematic node for content and signals |  
| Content Asset | Article, post, video, brief, derivative |  
| Campaign | Coordinated objective + assets + channels |  
| Audience | Segment / interest cohort (privacy-conscious) |  
| Persona | Archetypal audience description |  
| Channel | LinkedIn, X, YouTube, newsletter, site, docs, FEEX WORLD |  
| Experiment | Controlled test of hook/format/CTA/audience/timing |  
| Event | Telemetry or domain event |  
| Lead | Qualified interest / contact signal |  
| Outcome | Conversion, demo, partnership, revenue proxy |  
| Competitor | External product/positioning entity |  
| Market Signal | Emerging demand, tech shift, risk |  
| Opportunity | Ranked next-best action candidate |  
| Risk | Declining claim, competitive threat, decay |  
| Digital Twin State | Snapshot of marketing system state |  
  
## Key relationship types (examples)  
  
```text  
product → uses → technology  
product → evidenced_by → evidence  
repository → contains → artifact  
content → discusses → topic  
content → promotes → product  
content → targets → audience  
campaign → contains → content  
campaign → targets → audience  
content → published_on → channel  
audience → engages_with → content  
content → generates → event  
event → contributes_to → outcome  
evidence → supports → claim  
competitor → positioned_around → topic  
market_signal → affects → product | topic | audience  
claim → depends_on → evidence  
content → derived_from → content   (lineage)  
feature → implements → claim  
repository → signals → market_signal  
```  
  
## Evidence requirements  
  
- Every material claim must reference at least one Evidence record.  
- Evidence fields (minimum): source_type, source_ref (repo/URL/SHA/path), observed_at, confidence, freshness.  
- When evidence changes, dependent claims and content assets are flagged (propagation).  
  
## Content lineage  
  
Preserve parent → child derivatives so recycling and performance attribution remain queryable from original idea to every channel format.  
  
## Temporal rules  
  
- Prefer append-only event history and versioned states over destructive updates.  
- Support velocity windows (1h, 6h, 24h, 72h, 30d) and decay/longevity metrics.
