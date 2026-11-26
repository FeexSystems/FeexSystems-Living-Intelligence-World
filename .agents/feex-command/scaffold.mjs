#!/usr/bin/env node
// Usage: node scaffold.mjs <registry.json> <output-dir>
// Generates per-agent prompt files, ROSTER.md, and empty task/evidence registers.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [, , registryPath, outDir] = process.argv;
if (!registryPath || !outDir) {
  console.error("Usage: node scaffold.mjs <registry.json> <output-dir>");
  process.exit(2);
}

const reg = JSON.parse(readFileSync(registryPath, "utf8"));
const required = ["id", "name", "team", "mission", "responsibilities", "deliverables", "constraints", "owns_paths"];
const ids = new Set();
for (const a of reg.agents) {
  for (const k of required) {
    if (!(k in a)) throw new Error(`Agent ${a.id ?? "?"} missing field: ${k}`);
  }
  if (ids.has(a.id)) throw new Error(`Duplicate agent id: ${a.id}`);
  ids.add(a.id);
}

const list = (xs) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- (none)");

function renderAgentPrompt(a) {
  return `# ${a.id} — ${a.name}

  
Team: ${a.team}

## Mission
${a.mission}

## Responsibilities
${list(a.responsibilities)}

## Deliverables
${list(a.deliverables)}

## Agent-specific constraints
${list(a.constraints)}

## Owned paths (write only here unless the orchestrator assigns otherwise)
${list(a.owns_paths)}

## Global rules (apply to every agent)
${list(reg.global_rules)}

## Task protocol
1. Receive a TaskAssignment from FEEX ORCHESTRATOR PRIME (see registers/task.schema.json).
2. Read CLAUDE.md, .agents/ and any docs/ the task references before editing.
3. Work on a branch named agent/${a.id.toLowerCase()}/<task-id>. Do not touch paths owned by other agents.
4. Run the task's acceptance checks and capture the real output.
5. Append evidence entries (registers/evidence.schema.json) for every claim in your report.
6. Reply with a TaskReport: status (DONE | BLOCKED | NEEDS_REVIEW), changed files, check results, evidence ids, open risks.
7. Never merge your own work. Request review by a different agent via the orchestrator.
`;
}

mkdirSync(join(outDir, "agents"), { recursive: true });
mkdirSync(join(outDir, "registers"), { recursive: true });

for (const a of reg.agents) {
  writeFileSync(join(outDir, "agents", `${a.id}.md`), renderAgentPrompt(a));
}

const roster = [
  "# Agent roster",
  "",
  "| ID | Name | Team | Owns |",
  "|----|------|------|------|",
  ...reg.agents.map((a) => `| ${a.id} | ${a.name} | ${a.team} | ${a.owns_paths.join(", ")} |`),
  "",
].join("\n");
writeFileSync(join(outDir, "ROSTER.md"), roster);

writeFileSync(join(outDir, "registers", "tasks.json"), JSON.stringify({ tasks: [] }, null, 2) + "\n");
writeFileSync(join(outDir, "registers", "evidence.json"), JSON.stringify({ evidence: [] }, null, 2) + "\n");

console.log(`Generated ${reg.agents.length} agent prompts in ${outDir}`);
