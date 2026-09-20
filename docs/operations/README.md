# Operations Documentation

Operations documentation covers deployment, synchronization, observability, maintenance, recovery, and production verification.

## Operational loop

```text
Deploy
 ↓
Verify
 ↓
Observe
 ↓
Reconcile
 ↓
Recover / Roll Forward
```

## Current operational material

- [Enterprise Cloud Deployment & Operations Runbook](../DEPLOYMENT_GUIDE.md)

## Core responsibilities

- Health and readiness verification
- Cloud Run deployment
- Firebase Hosting deployment
- Database migration safety
- Secret provisioning
- Rollback
- Evidence synchronization
- Telemetry and analytics
- Scheduled reconciliation

## Living-system requirement

Operational state should be reflected in the World Model and documentation where applicable.
