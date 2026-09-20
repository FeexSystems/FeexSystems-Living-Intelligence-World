# Navigator

Navigator is the grounded retrieval and explanation layer for the FEEXSYSTEMS World Model.

## Retrieval path

```text
User Query
   ↓
Navigator
   ↓
Semantic Retrieval + Graph Context
   ↓
Evidence / World Model State
   ↓
Model-backed Explanation
```

## Responsibilities

- Retrieve relevant World Model entities.
- Combine semantic context with graph relationships.
- Preserve evidence references.
- Provide explainable context for model-backed answers.
- Support exploration of the ecosystem without treating the LLM as the source of truth.

## Architectural constraint

Navigator may reason over canonical state, but it must not silently redefine canonical entities or relationships.
