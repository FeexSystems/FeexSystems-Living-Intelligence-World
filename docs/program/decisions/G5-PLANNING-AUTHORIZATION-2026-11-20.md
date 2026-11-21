# G5 Planning Authorization Record

**Programme:** FEEX-MIP-2026  
**Repository:** `FeexSystems/FeexSystems-Living-Intelligence-World`  
**Canonical branch at authorization:** `main`  
**Base commit:** `5aade20f5e2cf5d8bfd130217da7e5f6ccc0c7ea`  
**Authorization date:** 2026-11-20  
**Authority:** Human owner / designated orchestrator  
**Decision:** G5 PLANNING AUTHORIZED  
**Implementation status:** NOT AUTHORIZED

## 1. Human authorization

The human owner explicitly authorized G5 planning with the instruction **“PROCEED”**, following presentation of the bounded authorization request.

The authorization is limited to architecture mapping, dependency analysis, integration-contract design, and test-strategy design. It does not authorize implementation or any downstream release activity.

> G5 planning authorized: architecture mapping, dependency analysis, integration contracts, and test-strategy design only. No integration code, no production changes, no deployment, and no physical actuation. Implementation requires separate G5 implementation authorization after plan review.

## 2. Authorized planning assignments

| Agent | Planning responsibility | Required output |
|---|---|---|
| Agent 02 | Architecture boundaries and dependency mapping | Current-state architecture, trust boundaries, dependency inventory, unresolved architecture decisions |
| Agent 03 | FEEX WORLD Phase 5 integration and execution-flow design | Event-flow plan, sequencing, failure handling, state ownership, integration dependencies |
| Agent 05 | EIL adapter and interface contracts | Adapter/interface specifications mapped to the live canonical EIL v0.1.0 contracts |
| Agent 09 | Verification and test strategy | Test matrix, evidence requirements, acceptance criteria, regression and safety checks |
| Agent 00 | Independent synthesis and gate review | Cross-agent consistency review, gaps/risks, recommendation on readiness for a separate implementation gate |

Agents must identify the exact repository SHA and contract versions used in each report. Reports must distinguish observed implementation from proposed design and unverified assumptions.

## 3. Mandatory current-architecture baseline

Planning must not assume that Supabase is already the backend authority.

The programme's current recorded architecture finding is:

- Firebase Hosting serves the frontend.
- Firebase Function `api`, Firestore, and Data Connect are recorded as load-bearing parts of the current application architecture.
- Supabase is a proposed migration target, not the current backend authority.
- The recorded route-parity audit found approximately 37 Supabase Edge Function routes against approximately 292 Express registrations, with zero Supabase callers identified in that audit.
- WebSocket/SSE, Redis, Prisma, and data-migration parity were recorded as unresolved migration requirements.

These are baseline findings from the programme record, not permission to assume they remain unchanged. Agents must revalidate relevant facts against the live repository and deployed configuration where possible, record evidence and timestamps, and flag anything they cannot verify.

The plan must explicitly present the backend-authority decision as an unresolved architecture branch:

1. **Retain current Firebase backend authority for the Phase 5 integration**, with Supabase migration handled separately; or
2. **Approve a separately governed migration path** to Supabase, conditional on demonstrated route, protocol, data, operational, and security parity.

Do not silently select the second path or describe it as already implemented. Any recommendation that changes backend authority must identify the decision owner, migration prerequisites, compatibility risks, and a separate approval point.

## 4. Planning deliverables and review criteria

The consolidated G5 plan must include:

1. Current-state system and trust-boundary map.
2. Dependency and consumer inventory, tied to repository evidence.
3. EIL v0.1.0 event and adapter contracts, with no unapproved schema changes.
4. Proposed event/execution flows, including ordering, deduplication, failure, retry, and observability behavior.
5. Data ownership and evidence/provenance boundaries.
6. Security, privacy, permission, and safety controls.
7. Test strategy with unit, contract, integration, browser, regression, and negative-path coverage.
8. Explicit assumptions, unknowns, blockers, and decisions requiring human approval.
9. Sequenced implementation proposal with acceptance criteria and rollback considerations.
10. A clear statement of what is not implemented or verified.

Agent 00 must review the combined outputs for architectural consistency and report a recommendation. That recommendation is not implementation authorization.

## 5. Prohibited activity under this authorization

The following remain prohibited:

- Writing or merging Phase 5 integration code.
- Modifying production application behavior or production configuration.
- Deploying, promoting, or releasing any build.
- Connecting live event streams or enabling production integrations.
- Changing canonical EIL schemas or World Model authority.
- Physical robotics actuation or issuing actuation commands.
- Treating an agent recommendation, passing test, or completed plan as approval to implement.

## 6. Next gate

After the planning deliverables are complete, they must be reviewed and presented to the human owner. A **separate explicit G5 implementation authorization** is required before implementation begins.

G6 release-candidate work and G7 production authorization remain frozen. Existing G2 security and physical-safety requirements remain in force.

## 7. Evidence and provenance

- G4 disposition: programme ledger §15.4, `main@5aade20f5e2cf5d8bfd130217da7e5f6ccc0c7ea`.
- Authorization event: human owner's explicit “PROCEED” response in the project conversation on 2026-11-20.
- This record documents the authorization; it does not claim that planning assignments have been completed or that any implementation exists.
