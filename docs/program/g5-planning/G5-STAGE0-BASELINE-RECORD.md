# G5 Stage 0 — Baseline Freeze and Decision Closure Record

**Status:** Stage 0 deliverable — decision record, not implementation.
**Authorization:** G5 implementation authorized by human owner (client-side, ephemeral EIL first slice only). Does not extend to G6/G7, production release, or physical actuation.
**Pinned baseline:** `main@48bc70aecd7859774877e28c2f3d274230ce0637`
**Planning packet:** `docs/program/g5-planning/` (PRs #67–#77)

---

## 1. Baseline freeze

| Item | Pinned value |
| --- | --- |
| Source SHA | `48bc70aecd7859774877e28c2f3d274230ce0637` |
| Lockfile | `package-lock.json` regenerated at `ecfb58c` (gate-verification clean) |
| EIL regression baseline | **58 existing tests** across `packages/feex-eil/tests/{contracts,agent-state-machine,humanoid-renderer}.test.ts` — must remain green |
| Node engines | `22.x \|\| 24.x` (`package.json`) |
| Test runner | Project Vitest configuration |

## 2. Permitted file-change scope (Stage 1+)

Implementation may touch only:

- `packages/feex-eil/` — contracts consumption, interaction adapters, renderer projection **if** A05-05 selects it
- `client/components/sovereign/` — HoloKai adapter surface (new files only; existing components unchanged unless required)
- `client/lib/` — Navigator normalization helper (new file)
- `packages/feex-eil/tests/` — extension of existing test files

**Prohibited without further authorization:** `server/`, `shared/` contract changes, `prisma/`, workflows, `firebase.json`, any new dependency, any network/persistence/actuation path, any version-string edit (A05-02 open).

## 3. Decision register — Stage 0 dispositions

| ID | Decision | Disposition | Basis |
| --- | --- | --- | --- |
| A05-01 | Client-only ephemeral EIL sufficient for first slice? | **RESOLVED — YES** | Human authorization approves the client-only architecture; no server state or new transport in scope |
| A05-02 | `v0.1.0` headers vs `EIL_SCHEMA_VERSION=1.0.0` | **OPEN — BLOCKER for versioned adapter work** | Agent 02 must disposition semantics; no unilateral version edit. Non-versioned contract consumption may proceed |
| A05-03 | NavigatorResult typed evidence references? | **RESOLVED — NONE EXIST** | Verified `server/routes/world-model.ts:64-82`: `NavigatorResult` exposes `artifacts[]` (path/kind/sha/projectName) + `groundedEvidenceCount` — **no** `evidenceId`/`entityId`/`epistemicStatus`/`source` fields. **No EvidenceBundle may be fabricated from Navigator results.** Adapter treats Navigator evidence as absent; any future evidence mapping requires server contract change (separate authorization) |
| A05-04 | Browser speech lifecycle mapping | **RESOLVED — mapping defined, implementation pending** | Real callbacks only: `SpeechRecognition` `onstart`/`onend`/`onerror`/`onresult` + `isPermissionRevoked` states. Existing surfaces: `client/components/sovereign/HoloKaiVoiceModal.tsx`, `client/hooks/useSpeechNavigation.ts`. No optimistic LISTENING/SPEAKING |
| A05-05 | Renderer wiring scope | **RESOLVED — validation/contracts only for slice 1** | `HumanoidScene` remains unwired; Stage 3 renderer projection is optional and separately gated per sequence proposal §3. Smallest-first-slice principle applies |
| A05-06 | Package import boundary | **RESOLVED — relative source imports** | Existing pattern verified: `HoloKaiVoiceModal.tsx:4-5` imports `../../../packages/feex-eil/...`. Accepted as temporary coupling; package export refactor is out of scope |
| A05-07 | Server-side EIL persistence | **RESOLVED — EXCLUDED** | First slice is ephemeral; no persistence, history, or distributed events. Any future requirement needs separate data-policy authorization |

## 4. Rollback/disable design verification

Per sequence proposal §5: the first slice is client-only and ephemeral — rollback = remove adapter wiring / feature flag; **no persisted state, no server component, no migration to unwind**. The 58-test EIL baseline plus new NEG-* boundary tests provide the regression gate. Verified: no EIL code path currently writes to World Model, network, or storage (per Agent 05 §8.11 scope).

## 5. Blockers carried into implementation

1. **A05-02** — versioned envelope work blocked; unversioned contract consumption permitted.
2. **A05-03** — no EIL `EvidenceBundle`/`EvidenceReference` may be emitted from Navigator data; disclosure requirements apply only to real references.
3. Post-merge CI on `48bc70a` was still running at record time — implementation proceeds against the pinned SHA regardless; CI outcome is recorded, not gating Stage 0.

## 6. Stage 0 exit criteria

- [x] Baseline SHA + lockfile + test baseline pinned
- [x] File-change scope defined and bounded
- [x] Six of seven decisions dispositioned with evidence; A05-02 explicitly OPEN
- [x] Rollback design verified as trivial-by-construction
- [ ] Agent 00 acknowledges this record (review, not approval — implementation already authorized)

**Next:** Stage 1 — pure contract and local adapter validation, per `G5-IMPLEMENTATION-SEQUENCE-AND-ROLLBACK-PROPOSAL.md` §3.

---

*Stage 0 record. G6/G7 frozen; physical actuation prohibited.*
