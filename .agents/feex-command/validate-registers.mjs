#!/usr/bin/env node
// Cross-platform port of briefing scripts 7.1 and 7.2 (no dependencies).
// Usage: node validate-registers.mjs <agent-dir>   (dir containing agents.registry.json and registers/)
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? ".agents/feex-command";
const load = (p) => JSON.parse(readFileSync(join(dir, p), "utf8"));
const agents = new Set(load("agents.registry.json").agents.map((a) => a.id));
const tasks = load("registers/tasks.json").tasks;
const evidence = load("registers/evidence.json").evidence;

// Gate dependencies from the roadmap: G1 and G2 may run alongside G0.
const BLOCKED_BY = { 3: [0, 1], 4: [2], 5: [4], 6: [5] };
const STATUS = ["PENDING", "IN_PROGRESS", "BLOCKED", "NEEDS_REVIEW", "DONE", "REJECTED"];
const errors = [];
const err = (m) => errors.push(m);

const ids = new Set();
for (const t of tasks) {
  if (!/^T-[0-9]{4}$/.test(t.taskId ?? "")) err(`${t.taskId}: bad taskId`);
  if (ids.has(t.taskId)) err(`${t.taskId}: duplicate`);
  ids.add(t.taskId);
  if (!agents.has(t.assignee)) err(`${t.taskId}: unknown assignee ${t.assignee}`);
  if (!agents.has(t.reviewer)) err(`${t.taskId}: unknown reviewer ${t.reviewer}`);
  if (t.assignee === t.reviewer) err(`${t.taskId}: self-review (${t.assignee})`);
  if (!Number.isInteger(t.gate) || t.gate < 0 || t.gate > 6) err(`${t.taskId}: bad gate`);
  if (!STATUS.includes(t.status)) err(`${t.taskId}: bad status`);
  if (!t.acceptanceChecks?.length) err(`${t.taskId}: needs >=1 acceptance check`);
  for (const d of t.dependsOn ?? []) if (!tasks.some((x) => x.taskId === d)) err(`${t.taskId}: unknown dependency ${d}`);
  if (t.status === "IN_PROGRESS") {
    for (const g of BLOCKED_BY[t.gate] ?? []) {
      if (tasks.some((x) => x.gate === g && x.status !== "DONE")) err(`${t.taskId}: gate ${t.gate} started while gate ${g} not DONE`);
    }
  }
  if (t.status === "DONE" && !(t.evidenceIds?.length)) err(`${t.taskId}: DONE without evidence`);
}

const evIds = new Set(evidence.map((e) => e.evidenceId));
for (const e of evidence) {
  if (e.kind === "MEASUREMENT" && !e.hardware) err(`${e.evidenceId}: MEASUREMENT needs hardware`);
}
for (const t of tasks) for (const e of t.evidenceIds ?? []) if (!evIds.has(e)) err(`${t.taskId}: unknown evidence ${e}`);

// Overlapping owned paths among IN_PROGRESS tasks
const active = tasks.filter((t) => t.status === "IN_PROGRESS");
for (let i = 0; i < active.length; i++)
  for (let j = i + 1; j < active.length; j++)
    for (const a of active[i].ownedPaths ?? [])
      for (const b of active[j].ownedPaths ?? [])
        if (a.startsWith(b) || b.startsWith(a)) err(`path conflict: ${active[i].taskId} (${a}) vs ${active[j].taskId} (${b})`);

if (errors.length) {
  console.error(errors.map((e) => `FAIL ${e}`).join("\n"));
  process.exit(1);
}
console.log(`registers OK (${tasks.length} tasks, ${evidence.length} evidence entries)`);
