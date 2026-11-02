# FEEX Repository QuickScan — Report Template

Use this structure when producing the final orientation report.

```markdown
# FEEX Repository QuickScan
**Repository:** <name or path>
**Scope:** <branch / commit / visible tree>
**Date:** <ISO date>
**Coverage:** <what was examined>

## 1. Repository Snapshot
| Signal | Observation | Evidence |
|--------|-------------|----------|
| Primary language | … | … |
| Framework | … | … |
| Manifest | … | … |
| Layout pattern | … | … |

## 2. Entry Points
- **App bootstrap:** …
- **Server / API entry:** …
- **Config entry:** …

## 3. Key Structural Observations
- …
- …

## 4. Visible Risks & Gaps
| Item | Severity (Low/Med) | Evidence |
|------|--------------------|----------|
| … | … | … |

## 5. Recommended Next Steps
1. …
2. …
3. …

## 6. Coverage Note
…
```

## Labelling conventions

- **Confirmed** — path or content observed directly
- **Inferred** — deduced from structure; state the basis
- **Not observed** — searched within available context and absent
