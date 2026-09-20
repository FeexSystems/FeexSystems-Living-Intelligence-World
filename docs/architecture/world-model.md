# World Model

The World Model is the canonical, structured representation of the FeexSystems engineering ecosystem.

## Entity model

Core entity classes include:

- Project
- Repository
- Artifact
- Technology
- Evidence
- Commit
- Temporal State

## Relationship model

Documented relationship semantics include:

- `HAS_REPOSITORY`
- `CONTAINS`
- `USES`
- `DEPENDS_ON`

## Evidence boundary

A World Model fact should be traceable to a repository, branch, commit SHA, path, artifact URL, or observation timestamp.

## Temporal model

The system is designed to preserve historical state so a project can be inspected as observed at a commit or timestamp rather than only as the latest snapshot.

## Retrieval

World Model retrieval combines structured graph context with vector/semantic retrieval where configured. The resulting context is passed to model-backed reasoning services.

## Canonical rule

The World Model is authoritative. Model output is an interpretation layer, not canonical storage.
