# FEEX Evidence-First Repository Auditor Pro — Report Template

```markdown
# FEEX Evidence-First Repository Audit
**Repository:** <name or path>
**Target:** <branch / commit SHA>
**Audit date:** <ISO date>
**Auditor skill version:** 1.0.0
**Coverage declaration:** <what was examined / excluded>

## Executive Summary
- Overall readiness posture (one short paragraph grounded in the gate table)
- Highest-priority evidence gaps
- Recommended immediate actions (3 max)

## 1. Scope & Coverage
| Item | Status |
|------|--------|
| Tree examined | … |
| Commit / branch | … |
| CI artefacts available | … |
| Out of scope | … |

## 2. Structural & Dependency Map
### Layout
…
### Key relationships (graph style)
- A → B (evidence: …)
- …

### Dependency summary
| Class | Notable packages | Manifest evidence |
|-------|------------------|-------------------|
| … | … | … |

## 3. Surface Area
### Entry points & routes
| Surface | Location | Evidence |
|---------|----------|----------|
| … | … | … |

### Configuration & external boundaries
…

## 4. Evidence-Backed Findings
| ID | Finding | Status | Evidence | Note |
|----|---------|--------|----------|------|
| F01 | … | Confirmed / Inferred / Hypothesis / Not observed | path or artefact | … |

## 5. CI, Build & Test Verification
| Capability | Config present | Execution evidence on target | Status |
|------------|----------------|------------------------------|--------|
| Build | … | … | … |
| Typecheck | … | … | … |
| Unit tests | … | … | … |
| E2E / integration | … | … | … |
| Lint / static analysis | … | … | … |

## 6. Release Gates
| Gate | Status (Pass / Fail / Unknown) | Evidence / Notes |
|------|--------------------------------|------------------|
| … | … | … |

**Gate summary:** X Pass / Y Fail / Z Unknown

## 7. Prioritised Remediation
1. …
2. …
3. …

## 8. Limitations & Confidence
…
```

## Status vocabulary (mandatory)

- **Confirmed** — direct source or artefact observed
- **Inferred** — deduced; basis stated
- **Hypothesis** — possible; unproven
- **Not observed** — searched within available context and absent
- **Pass / Fail / Unknown** — used only for release gates
