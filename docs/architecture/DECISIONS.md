# Architecture Decisions

## ADR-001 — World Model over LLM state

**Decision:** Canonical ecosystem reality lives in the structured World Model rather than inside an LLM conversation or model context.

**Reason:** Model outputs are probabilistic interpretations. Canonical engineering state requires durable entities, relationships, provenance, and temporal context.

## ADR-002 — Evidence-backed intelligence

**Decision:** Claims exposed as system intelligence should remain traceable to identifiable evidence where applicable.

**Reason:** Provenance enables inspection, correction, historical reconstruction, and trustworthy model-assisted reasoning.

## ADR-003 — Spatial UI as semantic projection

**Decision:** The 3D World is an interface to graph structure, not an ornamental visualization.

**Reason:** Spatial distance, clustering, and focus can expose relationships that are difficult to communicate through a flat list.

## ADR-004 — Provider-neutral model boundary

**Decision:** AI integrations remain behind application-level abstractions.

**Reason:** The World Model and application contracts should not become coupled to one model provider.
