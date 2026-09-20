# FEEXSYSTEMS Architecture

This directory defines the system architecture behind FEEXSYSTEMS — Living Engineering Intelligence.

## Architecture doctrine

> The LLM interprets the World Model. It does not become the World Model.

Canonical system state is represented by structured entities, relationships, evidence, and temporal observations. Retrieval and model-backed reasoning operate over that state.

## Architecture map

```text
GitHub / Runtime Evidence
          ↓
      Ingestion
          ↓
    Evidence Fabric
          ↓
      World Model
      ↙         ↘
Embeddings     Graph
      ↘         ↙
       Navigator
          ↓
   Model-backed Reasoning
      ↙    ↓     ↘
 Spatial  Omni   Voice
```

## Documents

- [World Model](world-model.md)
- [Evidence Fabric](evidence-fabric.md)
- [Navigator](navigator.md)
- [Omni-Command](omni-command.md)
- [Spatial World](spatial-world.md)

## Architectural boundary

The UI is a projection of canonical state. The LLM is an interpreter of retrieved state. Evidence establishes provenance between system claims and their sources.

## Verification contract

The repository architecture is machine-checked through `docs/architecture/manifest.json`. The manifest defines the public route surface, required architecture documentation, showcase assets, and source-of-truth files. `npm run docs:verify` fails CI when these contracts drift.
