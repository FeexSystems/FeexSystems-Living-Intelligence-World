#!/usr/bin/env node
// PRIME orchestration loop (one tick). Dependency-free, cross-platform.
//
//   node prime-loop.mjs <agent-dir>                 report only (dry run)
//   node prime-loop.mjs <agent-dir> --dispatch      write dispatch packets, mark tasks IN_PROGRESS
//   node prime-loop.mjs <agent-dir> --ci            also show recent CI runs (needs gh)
//
// It never launches agents, merges, pushes, or deploys. A human (or runner) hands each
// dispatch packet to the named agent. Re-run after reports come back.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--")) ?? ".agents/feex-command";
const DISPATCH = args.includes("--dispatch");
const CI = args.includes("--ci");
const here = dirname(fileURLToPath(import.meta.url));

// 1. SYNC: refuse to run on invalid registers
const v = spawnSync(process.execPath, [join(here, "validate-registers.mjs"), dir], { encoding: "utf8" });
if (v.status !== 0) {
  console.error("Registers invalid; fix before dispatching:\n" + (v.stderr || v.stdout));
  process.exit(1);
}

const load = (p) => JSON.parse(readFileSync(join(dir, p), "utf8"));
const registry = load("agents.registry.json");
const agentById = Object.fromEntries(registry.agents.map((a) => [a.id, a]));
const tasksFile = load("registers/tasks.json");
const tasks = tasksFile.tasks;

const BLOCKED_BY = { 3: [0, 1], 4: [2], 5: [4], 6: [5] };
const done = (id) => tasks.find((t) => t.taskId === id)?.status === "DONE";
const gateDone = (g) => tasks.filter((t) => t.gate === g).every((t) => t.status === "DONE");
const overlaps = (a = [], b = []) => a.some((x) => b.some((y) => x.startsWith(y) || y.startsWith(x)));

// 2. PLAN: classify tasks
const eligible = [];
const blocked = [];
const claimed = tasks.filter((t) => t.status === "IN_PROGRESS");

for (const t of tasks.filter((x) => x.status === "PENDING")) {
  const why = [];
  for (const d of t.dependsOn ?? []) if (!done(d)) why.push(`waiting on ${d}`);
  for (const g of BLOCKED_BY[t.gate] ?? []) if (!gateDone(g)) why.push(`gate ${g} not complete`);
  const clash = [...claimed, ...eligible].find((o) => overlaps(t.ownedPaths, o.ownedPaths));
  if (clash) why.push(`path overlap with ${clash.taskId}`);
  if (why.length) blocked.push({ t, why });
  else eligible.push(t);
}
const review = tasks.filter((t) => t.status === "NEEDS_REVIEW");
const stuck = tasks.filter((t) => t.status === "BLOCKED" || t.status === "REJECTED");

// 3. DISPATCH packets
const branch = (t) => `agent/${t.assignee.toLowerCase()}/${t.taskId.toLowerCase()}`;
const readAgent = (id) => {
  const p = join(dir, "agents", `${id}.md`);
  return existsSync(p) ? readFileSync(p, "utf8") : `(missing ${p}; run scaffold.mjs)`;
};

function assignmentPacket(t) {
  return `# DISPATCH ${t.taskId}: ${t.title}

Assignee: ${t.assignee}   Reviewer: ${t.reviewer}   Gate: ${t.gate}
Branch: ${branch(t)}
Owned paths: ${(t.ownedPaths ?? []).join(", ") || "(none)"}

## Acceptance checks (run them and capture real output)
${t.acceptanceChecks.map((c, i) => `${i + 1}. ${c.description}\n   \`${c.command}\``).join("\n")}

## Reply format (TaskReport JSON)
{"taskId":"${t.taskId}","agent":"${t.assignee}","status":"NEEDS_REVIEW|BLOCKED|DONE",
 "changedFiles":[],"checkResults":[{"command":"","exitCode":0}],"evidenceIds":[],"openRisks":[]}
Every claim needs an evidence entry (registers/evidence.schema.json). Do not merge.

---
## Your system prompt
${readAgent(t.assignee)}`;
}

function reviewPacket(t) {
  return `# REVIEW ${t.taskId}: ${t.title}

Reviewer: ${t.reviewer} (must not be ${t.assignee})
Evidence to inspect: ${(t.evidenceIds ?? []).join(", ") || "NONE (reject: no evidence)"}
Re-run these checks yourself:
${t.acceptanceChecks.map((c) => `- \`${c.command}\``).join("\n")}

Respond APPROVE or REJECT with reasons tied to evidence ids. Approval does not authorize merge; merge needs a human.

---
${readAgent(t.reviewer)}`;
}

// 4. REPORT
const lines = [];
lines.push(`# PRIME tick ${new Date().toISOString()}`);
if (CI) {
  const r = spawnSync("gh", ["run", "list", "--limit", "5", "--json", "databaseId,status,conclusion,name,headBranch"], { encoding: "utf8" });
  lines.push("\n## CI (latest runs)", r.status === 0 ? r.stdout.trim() : `gh unavailable: ${r.stderr.trim() || "not installed"}`);
}
const section = (title, rows) => lines.push(`\n## ${title} (${rows.length})`, ...(rows.length ? rows : ["- none"]));
section("In progress", claimed.map((t) => `- ${t.taskId} ${t.assignee} on ${branch(t)}: ${t.title}`));
section("Ready to dispatch", eligible.map((t) => `- ${t.taskId} -> ${t.assignee} (review ${t.reviewer}): ${t.title}`));
section("Awaiting review", review.map((t) => `- ${t.taskId} -> reviewer ${t.reviewer}: ${t.title}`));
section("Blocked by rules", blocked.map(({ t, why }) => `- ${t.taskId}: ${why.join("; ")}`));
section("Needs human attention", stuck.map((t) => `- ${t.taskId} ${t.status}: ${t.title}`));
console.log(lines.join("\n"));

if (!DISPATCH) {
  if (eligible.length || review.length) console.log("\n(dry run) add --dispatch to write packets and mark tasks IN_PROGRESS.");
  process.exit(0);
}

const outDir = join(dir, "dispatch");
mkdirSync(outDir, { recursive: true });
for (const t of eligible) {
  writeFileSync(join(outDir, `${t.taskId}.md`), assignmentPacket(t));
  t.status = "IN_PROGRESS";
}
for (const t of review) writeFileSync(join(outDir, `${t.taskId}.review.md`), reviewPacket(t));
if (eligible.length) writeFileSync(join(dir, "registers/tasks.json"), JSON.stringify(tasksFile, null, 2) + "\n");
console.log(`\nWrote ${eligible.length} assignment and ${review.length} review packet(s) to ${outDir}`);
