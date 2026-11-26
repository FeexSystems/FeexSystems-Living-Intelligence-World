#!/usr/bin/env node
/**
 * tripo_sorl_generate.mjs — FEEX-SORL Tripo generation runner (Gate 3+).
 *
 * Reads docs/assets/feex-sorl/asset-manifest.json and submits one
 * text-to-model job per asset (skipping `reuse` entries), waits for
 * completion, downloads the GLB into public/models/feex-sorl/<zone>/,
 * and appends a provenance record to docs/assets/feex-sorl/generation-log.jsonl.
 *
 * SAFETY: dry-run by default. Pass --execute to spend credits.
 * Requires TRIPO_API_KEY (env or repo .env) and balance > 0.
 *
 * Usage:
 *   node scripts/authoring/tripo_sorl_generate.mjs            # dry run (geometry phase)
 *   node scripts/authoring/tripo_sorl_generate.mjs --execute --phase geometry
 *   node scripts/authoring/tripo_sorl_generate.mjs --execute --phase texture   # +10cr/job on generated tasks
 *   node scripts/authoring/tripo_sorl_generate.mjs --execute --only sorl-robotic-arm
 *   node scripts/authoring/tripo_sorl_generate.mjs --execute --limit 3
 *
 * Phases (Gate 2 option B):
 *   geometry — text-to-model, texture=false pbr=false → ~10 credits/job
 *   texture  — /models/texture on each asset's stored taskId → ~10 credits/job
 */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { TripoClient } from '@vastai/tripo-sdk';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
config({ path: join(ROOT, '.env') });

const MANIFEST = join(ROOT, 'docs/assets/feex-sorl/asset-manifest.json');
const LOG = join(ROOT, 'docs/assets/feex-sorl/generation-log.jsonl');
const OUT_BASE = join(ROOT, 'public/models/feex-sorl');
const OV_BASE = 'https://openapi.tripo3d.ai/v3'; // international region

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1] : null;
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

const phaseIdx = args.indexOf('--phase');
const PHASE = phaseIdx >= 0 ? args[phaseIdx + 1] : 'geometry';
if (!['geometry', 'texture'].includes(PHASE)) {
  console.error(`[sorl-tripo] unknown phase "${PHASE}" — use geometry|texture`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
let jobs = manifest.assets.filter((a) => !a.reuseOf && (
  PHASE === 'geometry' ? a.status !== 'geometry-done' && a.status !== 'generated'
                       : a.status === 'geometry-done' && a.taskId
));
if (ONLY) jobs = jobs.filter((a) => a.id === ONLY);
jobs = jobs.slice(0, LIMIT);

const CREDITS_PER_JOB = PHASE === 'geometry' ? 10 : 10;
const estCredits = jobs.length * CREDITS_PER_JOB;
console.log(`[sorl-tripo] ${jobs.length} job(s), est ~${estCredits} credits ($${(estCredits / 100).toFixed(2)})`);
if (!EXECUTE) {
  for (const j of jobs) console.log(`  - ${j.id} (${j.zone}) :: ${j.prompt.slice(0, 80)}…`);
  console.log('[sorl-tripo] DRY RUN — pass --execute to submit. No credits spent.');
  process.exit(0);
}

const apiKey = process.env.TRIPO_API_KEY;
if (!apiKey) { console.error('[sorl-tripo] TRIPO_API_KEY missing'); process.exit(1); }
const client = new TripoClient({ apiKey, baseUrl: OV_BASE });

const bal = await client.getBalance();
console.log(`[sorl-tripo] balance=${bal.balance} frozen=${bal.frozen ?? 0}`);
if ((bal.balance ?? 0) < estCredits) {
  console.error(`[sorl-tripo] insufficient balance for full run (need ~${estCredits}). Run partial with --limit or top up.`);
  process.exit(2);
}

let failures = 0;
for (const job of jobs) {
  const dir = join(OUT_BASE, job.zone);
  mkdirSync(dir, { recursive: true });
  const started = new Date().toISOString();
  try {
    let taskId;
    if (PHASE === 'geometry') {
      console.log(`[sorl-tripo] submit ${job.id} (geometry) …`);
      taskId = await client.textToModel({
        prompt: job.prompt,
        model: job.tripo?.model ?? 'v3.1-20260211',
        texture: false,
        pbr: false,
        face_limit: job.tripo?.face_limit ?? 30000,
        auto_size: job.tripo?.auto_size ?? true,
      });
    } else {
      console.log(`[sorl-tripo] texture ${job.id} from task=${job.taskId} …`);
      taskId = await client.textureModel({
        input: job.taskId,
        texture_quality: 'standard',
      });
    }
    console.log(`[sorl-tripo] ${job.id} task=${taskId} — waiting`);
    const task = await client.waitForTask(taskId, { timeoutMs: 15 * 60 * 1000 });
    if (task.status !== 'success') throw new Error(`task status=${task.status}`);
    const dl = await client.downloadModel(task);
    if (!dl) throw new Error('no model output on task');
    const ext = dl.url?.match(/\.(glb|gltf|fbx|obj)(\?|$)/i)?.[1]?.toLowerCase() ?? 'glb';
    const out = join(dir, `${job.id}.${ext}`);
    writeFileSync(out, Buffer.from(dl.data));
    appendFileSync(LOG, JSON.stringify({
      assetId: job.id, zone: job.zone, phase: PHASE, taskId, file: `public/models/feex-sorl/${job.zone}/${job.id}.${ext}`,
      bytes: dl.data.byteLength, contentType: dl.contentType, url: dl.url,
      model: job.tripo?.model, submittedAt: started, finishedAt: new Date().toISOString(),
      license: 'Tripo API generated — see Tripo Terms; verify before redistribution',
    }) + '\n');
    if (PHASE === 'geometry') {
      job.status = 'geometry-done';
    } else {
      job.status = 'generated';
      job.textureTaskId = taskId;
    }
    job.taskId = PHASE === 'geometry' ? taskId : job.taskId;
    console.log(`[sorl-tripo] ${job.id} done → ${out} (${dl.data.byteLength} bytes)`);
  } catch (err) {
    failures++;
    appendFileSync(LOG, JSON.stringify({ assetId: job.id, taskId: job.taskId ?? null, error: String(err?.message ?? err), at: new Date().toISOString() }) + '\n');
    console.error(`[sorl-tripo] ${job.id} FAILED: ${err?.message ?? err}`);
  }
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
console.log(`[sorl-tripo] finished: ${jobs.length - failures}/${jobs.length} ok, ${failures} failed`);
process.exit(failures ? 1 : 0);
