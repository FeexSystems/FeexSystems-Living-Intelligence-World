# FeexSystems AI Core — Mission 003

**Feex World Intelligence — canonical model, provenance & interpretation separation**
**Status:** In progress · **Branch:** `feat/ai-core-mission-002` (Mission 002 applied)
**Baseline:** `f3bff35`

---

## 1. Gate 0 — verified facts (read from the working tree)

### Canonical World Model (single source of truth)

| Concern | Implementation |
|---|---|
| Project/entity | `WorldModelProject` (`repository` unique) |
| Evidence | `WorldModelEvidence` (`evidenceType`, `sourceUrl`, `sourceRef`, `metadata`, `observedAt`) |
| Artifacts | `WorldModelArtifact` (`path`, `sha`, `kind`, `size`) |
| Technology | `WorldModelTechnology` |
| Relationships | `WorldModelRelationship` (`sourceId`, `targetId`, `relation`, unique triple) |
| Events | `WorldModelEvent` (`eventType`, `commitSha`, `changedPaths`, `occurredAt`) |

**These tables are canonical. AI output must never write to them.**

### Existing retrieval / intelligence

- `server/routes/world-model.ts`: `/projects`, `/graph`, `/evidence/*`, `/temporal/*`, `/navigator` (GET+POST), `/providers/status`, admin sync/maintenance.
- `retrieveWorld` / `retrieveWorldHybrid` + `generateGroundedAnswer` + `geminiService.generateInteractiveResponse`.
- `hybrid-retrieval.service.ts`, `omni-command.service.ts`.

**Verdict:** grounded retrieval exists, but interpretations are **returned as prose only** — they are not persisted, carry no per-claim evidence references, and are not validated against the retrieved evidence.

### Registry audit — `PLANETARY_ECOSYSTEMS` (9 entries)

| Registry id | Registry name | Mission-intended reference | Action |
|---|---|---|---|
| `3wm` | 3WM DSP SONIK | 3WM DSP / BushFeexer DSP | **Preserve** (aliased intent) |
| `yurrheeler` | YURRHEELER MED-NET | YURRHEELER MED-NET | ✅ match |
| `farmplug` | FARMPLUG AI | FARMPLUG AI | ✅ match |
| `firehouse` | FIREHOUSE GRILLS | FIREHOUSE GRILLS | ✅ match |
| `feexkeeauth` | FEEXKEEAUTH SECURITY | FEEXVOLT SECURITY | **Name differs — do NOT rename silently; flagged for review** |
| `kappaxchangefin` | KAPPAXCHANGEFIN | KAPPA-X-CHANGE | **Display name differs — flagged** |
| `rentall` | RENTALL SMARTS HOMES | RENTALL SMARTS HOMES | ✅ match |
| `feexsystems` | FEEX WORLD OS | HOLOKAI | **Different entity; HoloKai is a UI surface, not this registry row — flagged** |
| `vyralabs` | VYRA LABS | *(not in intended list)* | **Present but not in mission list — flagged** |

No IDs were renamed, no duplicate entries introduced. Reconciliation requires a product decision, not a silent migration.

---

## 2. Gate A — architecture decision

**Extend, do not duplicate.** The canonical tables and `/navigator` stay as-is.
Mission 003 adds the missing **interpretation layer**:

```
canonical tables (read-only)  ──►  bounded context builder
                                      │
                                      ▼
                         aiGateway.generateObject (schema-validated)
                                      │
                                      ▼
                      citation validation against RETRIEVED evidence ids
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
     WorldModelInterpretation (NEW, separate)   unsupported claims flagged
```

A new `WorldModelInterpretation` table stores generated interpretations
(`projectId`, question, answer, claims, limitations, provider, model,
correlation id) — **never** merged into canonical tables.

### Why a new table and not `metadata` on evidence

Putting model output into `WorldModelEvidence.metadata` would make an
interpretation indistinguishable from a source record — directly violating the
governing principle. A separate table keeps provenance explicit.

---

## 3. Non-goals

- No replacement of `PLANETARY_ECOSYSTEMS` or of `/navigator`.
- No fabricated citations, evidence ids, file paths or commit SHAs.
- No writes to canonical tables from the interpretation path.
- No deployment, merge or infrastructure change.
