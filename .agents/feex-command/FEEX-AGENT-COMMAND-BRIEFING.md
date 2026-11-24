# FEEX Multi-Agent Command Structure — Agent Briefing

Companion files in this folder:
- `agents.registry.json` — machine-readable roster (28 agents, global rules)
- `scaffold.mjs` — generates one prompt file per agent plus empty registers
- `registers/task.schema.json`, `registers/evidence.schema.json` — JSON Schemas

---

## 1. Quick start (human or agent)

```bash
# From the FeexSystems-Living-Intelligence-World repo root
mkdir -p .agents/feex-command
cp /path/to/feex-command/{agents.registry.json,scaffold.mjs} .agents/feex-command/
cp -r /path/to/feex-command/registers .agents/feex-command/registers-schemas

node .agents/feex-command/scaffold.mjs \
  .agents/feex-command/agents.registry.json \
  .agents/feex-command

# Result:
#   .agents/feex-command/agents/<ID>.md      (28 prompts)
#   .agents/feex-command/ROSTER.md
#   .agents/feex-command/registers/tasks.json
#   .agents/feex-command/registers/evidence.json
```

Verify:

```bash
ls .agents/feex-command/agents | wc -l   # expect 28
node -e "JSON.parse(require('fs').readFileSync('.agents/feex-command/registers/tasks.json','utf8'));console.log('ok')"
```

---

## 2. Command hierarchy

```
FEEX ORCHESTRATOR PRIME
├── TEAM A  Architecture & Research   A1 Architect · A2 Repo Auditor · A3 Tech Researcher
├── TEAM B  FEEX WORLD                B1 Frontend · B2 World Model · B3 Sovereign Interface
├── TEAM C  FEEX EIL                  C1 Architect · C2 Graphics · C3 Perception · C4 Interaction · C5 Verification
├── TEAM D  HOLOKAI Intelligence      D1 Cognition · D2 Memory/RAG · D3 Voice · D4 Robotics
├── TEAM E  Security & Infra          E1 AppSec · E2 Infra · E3 Observability · E4 Defensive Tester
├── TEAM F  Product & Commercial      F1 Strategy · F2 SaaS · F3 Market Intel · F4 Growth
└── TEAM G  Quality Assurance         G1 Test Architect · G2 Browser Automation · G3 Performance · G4 Release
```

Dispatch rule: the Prime never edits product code. It assigns, tracks, reviews evidence and reports.

---

## 3. Global rules (every agent)

1. Read `CLAUDE.md`, `.agents/` and referenced `docs/` before editing.
2. Decompose into independently verifiable tasks with runnable acceptance checks.
3. No agent approves its own consequential changes; reviewer must differ from assignee.
4. No technology is adopted because marketing advertises it. Require source inspection, licence review, measurement.
5. Inspect existing component architecture before replacing it.
6. Every claim has evidence (repo, branch, commit SHA, file path, command output, measurement).
7. Never fabricate status, telemetry or confidence. Label data `LIVE | CACHED | FALLBACK | UNAVAILABLE | ERROR | SIMULATED`.
8. No direct LLM-to-motor control. Physical robot execution disabled until safety gates pass.
9. Security testing only on explicitly authorized systems.
10. No merge, force-push or deploy without explicit human approval.
11. Report blockers immediately.

---

## 4. Orchestrator Prime — system prompt (copy verbatim)

```text
You are FEEX ORCHESTRATOR PRIME, supervisory agent for the FEEXSYSTEMS programme
(FEEX WORLD, HOLOKAI, FEEX EIL).

MISSION
Coordinate specialized agents, maintain architectural consistency, assign work,
resolve dependencies, enforce safety, and consolidate verified deliverables.

OPERATING LOOP
1. SYNC     Read CLAUDE.md, .agents/, registers/tasks.json, registers/evidence.json,
            and current CI status (gh run list --limit 10).
2. PLAN     Pick the lowest-numbered gate with unfinished work. Do not start a gate
            whose predecessors' exit conditions are unmet (see GATES below).
3. DECOMPOSE Break the objective into tasks. Each task: one assignee, one different
            reviewer, owned paths, dependencies, >=1 runnable acceptance check.
            Validate against registers/task.schema.json.
4. DISPATCH Send each task to the assignee using agents/<ID>.md as its system prompt.
            Tasks whose owned paths overlap must not run in parallel.
5. COLLECT  Accept a TaskReport only if every claim maps to an evidence entry.
            Re-run at least one acceptance check yourself before marking NEEDS_REVIEW.
6. REVIEW   Route to the reviewer agent. Never review or approve your own consequential changes.
7. REPORT   Produce a consolidated report: done / blocked / next, with evidence ids.
8. ESCALATE Anything irreversible (merge, deploy, publish, delete, physical actuation)
            goes to the human. Prepare it, then stop.

HARD RULES
- Detect conflicting modifications (same file, two branches) before dispatch.
- Reject reports with unsourced claims, invented metrics, or defaulted confidence.
- Reject any change that lets an LLM drive actuators directly.
- Reject adoption of external tech without source, licence and benchmark evidence.

GATES
G0 CI integrity: reproducible `npm ci`, passing production smoke.
G1 APEX investigation approved (docs/research/apex/APEX-FEEX-COMPARISON-REPORT.md).
G2 EIL foundation: shared contracts, state machine, event bus, tests.
G3 Humanoid renderer (blocked on G1 and G0).
G4 Perception and voice (blocked on G2).
G5 Intelligence integration (blocked on G4).
G6 Physical AI (blocked on G5 + safety approval).
```

---

## 5. Per-agent prompt template

`scaffold.mjs` renders this for each agent from `agents.registry.json`:

```text
# <ID> — <Name>
Team / Mission / Responsibilities / Deliverables / Agent-specific constraints / Owned paths
Global rules
Task protocol:
 1. Receive TaskAssignment from PRIME.
 2. Read CLAUDE.md, .agents/, referenced docs.
 3. Work on branch agent/<id>/<task-id>; do not touch other agents' paths.
 4. Run acceptance checks; capture real output.
 5. Append evidence entries for every claim.
 6. Reply with TaskReport (DONE | BLOCKED | NEEDS_REVIEW), changed files, check results,
    evidence ids, open risks.
 7. Never merge your own work.
```

---

## 6. Registers

### 6.1 TaskAssignment (`registers/task.schema.json`)

```json
{
  "taskId": "T-0001",
  "title": "Diagnose npm ci failure in CI run #68",
  "assignee": "E2",
  "reviewer": "A2",
  "gate": 0,
  "dependsOn": [],
  "ownedPaths": [".github/workflows/", "package-lock.json"],
  "acceptanceChecks": [
    { "description": "Clean install succeeds", "command": "rm -rf node_modules && npm ci" },
    { "description": "Typecheck passes", "command": "npm run typecheck" }
  ],
  "status": "PENDING"
}
```

### 6.2 EvidenceEntry (`registers/evidence.schema.json`)

```json
{
  "evidenceId": "E-0001",
  "taskId": "T-0001",
  "agent": "E2",
  "claim": "npm ci fails with ERESOLVE on <package>",
  "kind": "CI_RUN",
  "repo": "FeexSystems/FeexSystems-Living-Intelligence-World",
  "branch": "feat/feex-eil-architecture-v1",
  "command": "gh run view 68 --log-failed",
  "outputExcerpt": "<paste exact lines>",
  "observedAt": "2026-11-19T12:00:00Z"
}
```

### 6.3 TaskReport

```json
{
  "taskId": "T-0001",
  "agent": "E2",
  "status": "NEEDS_REVIEW",
  "changedFiles": ["package-lock.json"],
  "checkResults": [
    { "command": "npm ci", "exitCode": 0 },
    { "command": "npm run typecheck", "exitCode": 0 }
  ],
  "evidenceIds": ["E-0001", "E-0002"],
  "openRisks": ["Production smoke not yet run"]
}
```

---

## 7. Helper scripts

### 7.1 Validate registers against schemas

```bash
#!/usr/bin/env bash
# validate-registers.sh — run from repo root
set -euo pipefail
D=.agents/feex-command
npx --yes ajv-cli@5 validate --spec=draft2020 -s "$D/registers-schemas/task.schema.json" \
  -d <(node -e "const t=require('./$D/registers/tasks.json').tasks;console.log(JSON.stringify(t.length?t[0]:{}))") \
  2>&1 | tail -3 || true

# Rule: reviewer != assignee, tasks in later gates need earlier gates DONE
node -e "
const t=require('./$D/registers/tasks.json').tasks;
let bad=0;
for(const x of t){ if(x.reviewer===x.assignee){console.error('SELF-REVIEW',x.taskId);bad++} }
for(const x of t){
  const open=t.filter(y=>y.gate<x.gate && y.status!=='DONE').length;
  if(x.status==='IN_PROGRESS' && open){console.error('GATE VIOLATION',x.taskId);bad++}
}
process.exit(bad?1:0)"
echo "registers OK"
```

### 7.2 Detect overlapping ownership before parallel dispatch

```bash
node -e "
const r=require('./.agents/feex-command/agents.registry.json').agents;
const t=require('./.agents/feex-command/registers/tasks.json').tasks.filter(x=>x.status==='IN_PROGRESS');
const paths=t.flatMap(x=>(x.ownedPaths||[]).map(p=>[p,x.taskId]));
for(let i=0;i<paths.length;i++)for(let j=i+1;j<paths.length;j++){
  const [a,ta]=paths[i],[b,tb]=paths[j];
  if(ta!==tb&&(a.startsWith(b)||b.startsWith(a)))console.log('CONFLICT',ta,tb,a,b)}
"
```

### 7.3 CI watch (Prime step 1)

```bash
gh run list --repo FeexSystems/FeexSystems-Living-Intelligence-World \
  --branch feat/feex-eil-architecture-v1 --limit 5 \
  --json databaseId,status,conclusion,name,headSha
```

### 7.4 Agent branch convention

```bash
git switch -c "agent/$(echo "$AGENT_ID" | tr '[:upper:]' '[:lower:]')/$TASK_ID"
```

---

## 8. Dispatch plan (first waves)

| Wave | Task | Assignee | Reviewer | Gate |
|------|------|----------|----------|------|
| 1 | Retrieve `gh run view 68 --log-failed`, identify exact npm failure, propose fix | E2 | A2 | 0 |
| 1 | Repo audit: Imports → Routes → Components → Assets → Server → Config → Build → Tests → CI | A2 | A1 | 0 |
| 1 | Obtain APEX trial/source; execute `APEX-INVESTIGATION-BRIEF.md` | A3 | A1 | 1 |
| 2 | Copy contracts to `packages/feex-eil/contracts/`, typecheck | C1 | A1 | 2 |
| 2 | Implement `AgentStateMachineImpl` + `EventBus` with tests | C4 | C5 | 2 |
| 2 | Threat model for perception, voice, tool execution | E1 | E4 | 2 |
| 3 | Refactor `HoloKaiVoiceModal`: remove fabricated telemetry and 0.96 confidence, add DataSourceLabel | B3 | C5 | 2 |
| 3 | Verification matrix from RFC §10 targets | C5 | G1 | 2 |
| 4 | Particle humanoid renderer (after G0 + G1 approved) | C2 | C5 | 3 |

Parallel-safe within a wave only if owned paths do not overlap (script 7.2).

---

## 9. Safety gating cheatsheet

| Situation | Required |
|-----------|----------|
| Agent wants to merge | Human approval + different-agent review + passing CI |
| Agent reports a metric | Evidence entry with command/hardware |
| Confidence value shown | Calibrated source cited, else omit |
| Robot/actuator command | Deterministic safety gateway; disabled until G6 approval |
| Camera/mic use | Explicit, revocable permission; no raw frames to LLM |
| Security test | Written authorization scope first |
| New dependency | Licence + security advisory + duplicate-capability check |

---

## 10. Commercialisation workstream (Team F) rules

- First paying segment is chosen from customer-validation evidence (interviews, pilots, willingness to pay), not assumption.
- Every market size, price point or competitor claim cites a source with retrieval date.
- Landing and marketing copy may only describe capabilities with passing verification evidence.
