# Navigator

## Purpose

Navigator is the human-facing reasoning and exploration interface over the FEEXSYSTEMS World Model.

It is grounded in persistent data and evidence before any model-generated explanation is produced.

## Retrieval contract

```text
User query
   ↓
Intent / entity extraction
   ↓
World Model retrieval (hybrid)
   ├── keyword entity search
   ├── relationship / graph evidence
   └── pgvector semantic search
   ↓
Score fusion (keyword + vector + graph + recency)
   ↓
Evidence attachment
   ↓
Context assembly
   ↓
Model interpretation
   ↓
Answer + evidence/path
```

See `docs/EMBEDDINGS.md` for hybrid ranking weights and reindex API.

## Example queries

- Which projects use PostgreSQL?
- What technologies are used by FEEX World OS?
- What evidence supports this relationship?
- Which repositories changed recently?
- How are two projects connected?

## Grounding rules

Navigator must distinguish observed facts from inference. If evidence is missing, the response should say so rather than inventing a source.

The model provider is replaceable. Navigator depends on a stable World Model retrieval contract rather than a provider-specific database representation.

## Relationship to Omni-Command

Omni-Command (`/omni`) reuses the same grounded retrieval stack but returns an **Orchestration Contract** so the UI can mount a Stage component (graph, markdown, metrics, evidence) instead of a fixed Navigator layout.

| Concern | Navigator | Omni-Command |
|---------|-----------|--------------|
| Primary output | Answer + evidence | Answer + UI directive |
| UI | Dedicated Navigator page | Dynamic Stage |
| Streaming | Optional | SSE reasoning trace |
| Multi-turn | Session-dependent | Explicit context chips + deep links |

See `docs/OMNI_COMMAND.md` for the full Omni pipeline and contract.

## Future capabilities

- [x] pgvector semantic retrieval
- [x] hybrid graph/vector rank fusion
- multi-hop path reasoning
- evidence-aware answers
- temporal queries
- dependency impact analysis
- source-level inspection
- voice navigation
