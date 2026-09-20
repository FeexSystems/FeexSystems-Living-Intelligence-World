# Evidence Fabric

The Evidence Fabric is the provenance and verification layer connecting system state to source evidence.

## Evidence chain

```text
Source
  ↓
Verify
  ↓
Persist
  ↓
Trace
  ↓
Reason
```

## Evidence identifiers

The repository documents evidence in terms of:

- GitHub repository
- Branch
- Commit SHA
- Relative file path
- Line range
- Artifact URL
- Observation timestamp

## Ingestion

GitHub webhook events are verified with HMAC-SHA256 before they are allowed to trigger World Model updates.

## Trust boundary

The Evidence Fabric separates source-backed canonical state from model-generated explanation. A generated response should be understood as an interpretation of retrieved evidence, not as the evidence itself.

## Temporal provenance

Evidence can be associated with historical commit state and timestamped observations to support temporal reconstruction.
