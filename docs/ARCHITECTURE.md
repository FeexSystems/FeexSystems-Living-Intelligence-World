# FEEXSYSTEMS Architecture

## Purpose

FEEXSYSTEMS is the application hosted at `FeexSystems.codes`. Its purpose is to turn the FeexSystems engineering ecosystem into an evidence-backed, continuously synchronized World Model that people can explore through a SaaS interface, Navigator, Omni-Command Stage, and spatial experiences.

## System boundary

```text
FeexSystems GitHub ecosystem
        ↓
Repository discovery
        ↓
Ingestion / normalization
        ↓
Persistent World Model
        ↓
Evidence Fabric + relationships
        ↓
Graph / vector retrieval
        ↓
Navigator / Omni director / reasoning
        ↓
Project Explorer · Omni Stage · spatial experience
```

The Persona OS project is a project represented inside FEEXSYSTEMS. It is not the parent application.

## Architectural planes

### Experience

Public landing page, project explorer, Navigator, **Omni-Command Stage**, command center and future spatial/voice interfaces.

### Navigation

A common navigation contract for search, project traversal, graph exploration, voice, deep links (`/omni?q=…`) and direct routes.

### Intelligence

Provider-neutral model adapters, grounded retrieval, the Omni **LLM director** (few-shot Orchestration Contract emission), reasoning, summarization and controlled agents.

### World Model

Canonical projects, repositories, artifacts, technologies, capabilities, relationships and temporal events.

### Evidence Fabric

Provenance records connecting World Model facts to GitHub repositories, branches, commits, files, artifacts, URLs and observation timestamps.

### Synchronization

GitHub discovery, repository crawling, webhook handling and incremental reconciliation.

### Testing Architecture

An in-memory simulation plane utilizing **Prismock** for full database-free ORM mocking, paired with a custom **Firebase Admin Auth Interceptor**. This allows the integration test suite to validate complex authenticated routes without relying on external SaaS databases or network connectivity.

### Persistence

PostgreSQL/Prisma for durable state and Redis for caching/session workloads. pgvector is the planned semantic retrieval layer.

## Source-of-truth rule

The persistent World Model is authoritative. Browser state, generated prose and LLM output are not authoritative data sources.

A model may interpret or propose UI directives, but canonical mutations must pass through the World Model mutation path and retain provenance. Omni-Command responses are validated with Zod before the Stage mounts components.

## Runtime flow

1. Discover repositories from the FeexSystems GitHub ecosystem.
2. Persist repository identity and discovery evidence.
3. Crawl the repository tree.
4. Classify relevant artifacts.
5. Extract technology candidates.
6. Create or reconcile graph relationships.
7. Record evidence and World Model events.
8. Process future webhook changes incrementally.
9. Retrieve grounded context for Navigator / Omni requests.
10. Omni director selects a Stage component via Orchestration Contract (or heuristic fallback).
11. Present explanations, graphs, or metrics with paths/evidence where available.

## Omni-Command plane

```text
Query + multi-turn context
    ↓
retrieveWorld / getWorldModelGraph
    ↓
LLM director (Gemini → OpenAI) or heuristic
    ↓
Orchestration Contract (Zod)
    ↓
SSE trace + final payload
    ↓
ComponentRegistry → Stage canvas
```

See `docs/OMNI_COMMAND.md` for the contract and component registry.

## Future production evolution

```text
GitHub webhook
    ↓
Event queue
    ↓
Idempotent ingestion job
    ↓
Artifact reconciliation
    ↓
Entity / relationship mutation
    ↓
Embedding invalidation + regeneration
    ↓
Temporal event
    ↓
Read-model refresh
    ↓
Navigator / Omni-Command
```

The browser should remain a projection of server state rather than the canonical persistence layer.
