---
name: feex-evidence-first-repository-auditor-pro
description: Advanced evidence-first repository audit skill. Use when a developer or technical lead needs a rigorous architectural and release-readiness analysis grounded in actual source evidence, dependency tracing, CI-to-commit verification, and explicit release gates. Triggers on evidence-first audit, repository auditor, CI gatekeeper, release readiness review, provenance audit, or architectural evidence review.
license: Proprietary commercial skill package (FeexSystems). Redistribution of this package is governed by the marketplace licence under which it is distributed.
metadata:
  version: "1.0.0"
  product: FEEX Evidence-First Repository Auditor Pro
  tier: paid
  publisher: FeexSystems
  category: Code Review / DevOps / Testing & QA
  evidence-principle: true
---

# FEEX Evidence-First Repository Auditor Pro

Perform a **rigorous, evidence-grounded audit** of a software repository. The AI interprets evidence; it does not invent architecture, test results, or release readiness.

This skill embodies a single non-negotiable principle:

> **Evidence, not claims.**  
> Every material finding must be traceable to concrete implementation evidence (file path, configuration, script, commit reference, or observable artefact).  
> If evidence is missing, the finding is labelled *Not observed* or *Hypothesis* — never presented as fact.

## Core Rules (never violate)

1. **Evidence before assertion.** Cite path, symbol, config key, or script. Prefer primary sources over secondary documentation.
2. **Never invent.** Do not claim a route, service, test, dependency, or CI job exists unless the corresponding artefact is present in the examined context.
3. **Distinguish status explicitly:**
   - **Confirmed** — direct evidence observed
   - **Inferred** — reasonable deduction; state the exact basis
   - **Hypothesis** — possible but unproven
   - **Not observed** — searched and absent within available context
4. **CI and test claims require execution evidence.** A test file is not proof the test passed. A workflow file is not proof the workflow ran successfully on the target commit. State what is present versus what was executed.
5. **Graph over list.** Prefer relationship statements (“A imports B”, “route X is mounted by Y”, “job Z depends on artefact W”) over flat inventories.
6. **Release gates are explicit.** Never declare “ready to ship” without listing the concrete gates that were evaluated and their pass/fail/unknown status.
7. **Scope honesty.** If the available context is incomplete (missing lockfile, no CI history, truncated tree), state the coverage limit at the top of the report.

## When to use this skill

- Pre-release or pre-merge architectural and readiness review
- Dependency and surface-area mapping before a major change
- Verification that documented architecture matches source evidence
- Producing an auditable report for technical leads or compliance stakeholders
- Distinguishing “the tests exist” from “the tests passed on this commit”

## Required inputs

Request or use:

- Repository root / visible tree
- Target branch or commit SHA (preferred)
- Any existing CI configuration or recent run artefacts the user can supply
- Focus areas if the user wants a narrowed audit (e.g. “auth + payments only”)

If CI run results or coverage reports are not provided, treat them as *Not observed* and design gates accordingly.

## Audit workflow (follow in order)

### Phase 1 — Scope & Coverage Declaration
State exactly what is in scope and what is excluded. Record the examined commit or tree snapshot if known.

### Phase 2 — Structural & Dependency Mapping
- Top-level layout and package boundaries
- Manifest(s), lockfile status, and major dependency classes
- Internal module graph (key import / require relationships)
- Shared contracts or type packages and their consumers

### Phase 3 — Surface Area
- Public routes, APIs, CLI commands, and entry points (with file evidence)
- Configuration surface (env vars, feature flags, external service clients)
- Authentication / authorisation boundaries if present

### Phase 4 — Evidence-Backed Findings
For each material observation:
- Finding statement
- Status (Confirmed / Inferred / Hypothesis / Not observed)
- Evidence pointer(s)
- Risk or opportunity note (if any)

### Phase 5 — CI, Build & Test Verification
- Presence of build, typecheck, lint, unit, and e2e configurations
- Whether any execution evidence for the target commit is available
- Gaps between “configured” and “observed to have run”

### Phase 6 — Release Gates
Produce an explicit gate table. Typical gates (adapt to the repo):

| Gate | Status | Evidence / Notes |
|------|--------|------------------|
| Lockfile present & consistent | … | … |
| Typecheck / build config exists | … | … |
| Unit tests present | … | … |
| E2E or integration tests present | … | … |
| CI workflow defined for main path | … | … |
| Observed successful run on target commit | … | … |
| Critical secrets / credentials not committed | … | … |
| Documentation matches observed structure | … | … |

Status values: **Pass** | **Fail** | **Unknown** (insufficient evidence)

### Phase 7 — Prioritised Remediation
Only items that improve evidence quality or close concrete gaps. Rank by impact on release confidence.

### Phase 8 — Coverage & Limitations
Re-state what was examined, what was unavailable, and how that affects confidence in the overall assessment.

## Output requirements

- Use the report template in `references/auditor-report-template.md` as the skeleton.
- Every major claim carries an evidence pointer or an explicit “Not observed”.
- Keep the executive summary short; put detail in the sections.
- Never use absolute language (“secure”, “production-ready”, “fully tested”) unless every relevant gate is **Pass** with direct evidence.

## Relationship to the free skill

**FEEX Repository QuickScan** is the lightweight orientation layer. Use this Pro skill when the user needs depth, gates, and auditable evidence.

## Example trigger phrases

- “Run an evidence-first audit on this repo”
- “Verify release readiness with evidence”
- “Map dependencies and CI gates”
- “Does the architecture match the source?”
- “Produce a provenance-backed repository review”
