 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../database";

const ORG = process.env.FEEXSYSTEMS_GITHUB_ORG || "FeexSystems";
const API = "https://api.github.com";
const TEXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|php|rb|cs|cpp|c|h|hpp|sql|prisma|json|yaml|yml|md|mdx|html|css|scss|vue|svelte|sh|toml|xml)$/i;
const MAX_FILES = Number(process.env.WORLD_MODEL_MAX_FILES || 300);




async function gh(path) {
  const r = await fetch(`${API}${path}`, { headers: { Accept:"application/vnd.github+json", "X-GitHub-Api-Version":"2022-11-28", ...(process.env.GITHUB_TOKEN ? {Authorization:`Bearer ${process.env.GITHUB_TOKEN}`} : {}) } });
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${await r.text()}`);
  return r.json();
}

async function ensureSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS world_model_projects (id TEXT PRIMARY KEY, repo_id BIGINT UNIQUE NOT NULL, name TEXT NOT NULL, full_name TEXT UNIQUE NOT NULL, description TEXT, url TEXT NOT NULL, default_branch TEXT NOT NULL, language TEXT, topics JSONB NOT NULL DEFAULT '[]', metadata JSONB NOT NULL DEFAULT '{}', first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS world_model_artifacts (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES world_model_projects(id) ON DELETE CASCADE, path TEXT NOT NULL, sha TEXT NOT NULL, kind TEXT NOT NULL, size BIGINT, metadata JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(project_id,path))`,
    `CREATE TABLE IF NOT EXISTS world_model_technologies (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, category TEXT, metadata JSONB NOT NULL DEFAULT '{}')`,
    `CREATE TABLE IF NOT EXISTS world_model_relationships (id TEXT PRIMARY KEY, source_id TEXT NOT NULL, target_id TEXT NOT NULL, relation TEXT NOT NULL, metadata JSONB NOT NULL DEFAULT '{}', UNIQUE(source_id,target_id,relation))`,
    `CREATE TABLE IF NOT EXISTS world_model_evidence (id TEXT PRIMARY KEY, project_id TEXT REFERENCES world_model_projects(id) ON DELETE CASCADE, artifact_id TEXT REFERENCES world_model_artifacts(id) ON DELETE CASCADE, source_type TEXT NOT NULL, source_url TEXT NOT NULL, source_sha TEXT, content_hash TEXT, observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), confidence DOUBLE PRECISION NOT NULL DEFAULT 1, metadata JSONB NOT NULL DEFAULT '{}')`,
    `CREATE TABLE IF NOT EXISTS world_model_events (id TEXT PRIMARY KEY, project_id TEXT REFERENCES world_model_projects(id) ON DELETE CASCADE, event_type TEXT NOT NULL, commit_sha TEXT, changed_paths JSONB NOT NULL DEFAULT '[]', payload JSONB NOT NULL DEFAULT '{}', occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE INDEX IF NOT EXISTS wm_artifacts_project ON world_model_artifacts(project_id)`,
    `CREATE INDEX IF NOT EXISTS wm_evidence_project ON world_model_evidence(project_id)`,
    `CREATE INDEX IF NOT EXISTS wm_events_project_time ON world_model_events(project_id,occurred_at DESC)`,
  ];
  for (const sql of statements) await prisma.$executeRawUnsafe(sql);
}

const key = (prefix, value) => `${prefix}_${createHmac("sha256","feex-wm").update(value).digest("hex").slice(0,24)}`;

async function discoverPinnedRepositories() {
  if (process.env.FEEXSYSTEMS_PINNED_REPOS) return process.env.FEEXSYSTEMS_PINNED_REPOS.split(",").map(x=>x.trim()).filter(Boolean);
  const html = await fetch(`https://github.com/${ORG}`, {headers:{"User-Agent":"FeexSystems-Living-Intelligence/1.0"}}).then(async r=>{if(!r.ok)throw new Error(`GitHub profile ${r.status}`);return r.text();});
  const section = _optionalChain([html, 'access', _ => _.match, 'call', _2 => _2(/pinned-item-list[\s\S]{0,120000}/i), 'optionalAccess', _3 => _3[0]]) || "";
  const names = new Set(); const re = new RegExp(`href=[\\\"']/${ORG}/([^\\\"']+)[\\\"']`,"g"); let m;
  while((m=re.exec(section))) { const n=m[1].split("/")[0]; if(n && !n.includes("?") && n!=="repositories") names.add(n); }
  return [...names].slice(0,12);
}

function technologies(repo, files, text) {
  const lower=text.toLowerCase(), out=new Set(); if(repo.language) out.add(repo.language);
  const signatures={React:["react"],TypeScript:["typescript","tsconfig"],Vite:["vite"],"Next.js":["next"],"Node.js":["express","node"],PostgreSQL:["postgres","postgresql","prisma"],Prisma:["prisma"],Redis:["redis","ioredis"],Docker:["docker","dockerfile"],"Three.js":["three","react-three"],TailwindCSS:["tailwind"],Supabase:["supabase"],Python:["python","pyproject","requirements.txt"],Kubernetes:["kubernetes","helm","k8s"],GraphQL:["graphql"],WebSockets:["socket.io","websocket"]};
  for(const [name, needles] of Object.entries(signatures)) if(needles.some(n=>lower.includes(n)||files.some(f=>f.path.toLowerCase().includes(n)))) out.add(name);
  return [...out];
}

export async function syncPinnedProjects() {
  await ensureSchema(); const names=await discoverPinnedRepositories(); const synced=[];
  for(const name of names) synced.push(await syncRepository(await gh(`/repos/${ORG}/${name}`) ));
  return {organization:ORG,discovered:names,synced};
}

export async function syncRepository(repo, changedPaths=[]){
  await ensureSchema(); const projectId=key("proj",repo.full_name);
  await prisma.$executeRawUnsafe(`INSERT INTO world_model_projects(id,repo_id,name,full_name,description,url,default_branch,language,topics,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb) ON CONFLICT(full_name) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,url=EXCLUDED.url,default_branch=EXCLUDED.default_branch,language=EXCLUDED.language,topics=EXCLUDED.topics,metadata=EXCLUDED.metadata,last_synced_at=NOW()`,projectId,repo.id,repo.name,repo.full_name,repo.description,repo.html_url,repo.default_branch,repo.language,JSON.stringify(repo.topics||[]),JSON.stringify({stars:repo.stargazers_count,pushedAt:repo.pushed_at,updatedAt:repo.updated_at,source:"github"}));
  const tree=await gh(`/repos/${repo.full_name}/git/trees/${repo.default_branch}?recursive=1`) ;
  const files=tree.tree.filter(x=>x.type==="blob"&&TEXT.test(x.path)).slice(0,MAX_FILES); const target=changedPaths.length?new Set(changedPaths):null; const selected=target?files.filter(f=>target.has(f.path)):files; let aggregate=`${repo.name} ${repo.description||""} ${repo.language||""} ${(repo.topics||[]).join(" ")}`; const artifactPaths=[];
  for(const file of selected){
    const artifactId=key("artifact",`${repo.full_name}:${file.path}`); const kind=file.path.toLowerCase()==="readme.md"?"documentation":/(package.json|requirements.txt|pyproject.toml|Cargo.toml|go.mod)$/.test(file.path)?"manifest":"source";
    await prisma.$executeRawUnsafe(`INSERT INTO world_model_artifacts(id,project_id,path,sha,kind,size,metadata) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT(project_id,path) DO UPDATE SET sha=EXCLUDED.sha,kind=EXCLUDED.kind,size=EXCLUDED.size,metadata=EXCLUDED.metadata,updated_at=NOW()`,artifactId,projectId,file.path,file.sha,kind,file.size||null,JSON.stringify({source:"github",repository:repo.full_name}));
    await prisma.$executeRawUnsafe(`INSERT INTO world_model_evidence(id,project_id,artifact_id,source_type,source_url,source_sha,confidence,metadata) VALUES($1,$2,$3,'github_file',$4,$5,1,$6::jsonb) ON CONFLICT DO NOTHING`,key("evidence",`${repo.full_name}:${file.path}:${file.sha}`),projectId,artifactId,`https://github.com/${repo.full_name}/blob/${repo.default_branch}/${file.path}`,file.sha,JSON.stringify({observedFrom:"repository-tree"}));
    artifactPaths.push(file.path);
    if(file.path==="README.md"||file.path==="package.json"){try{const raw=await gh(`/repos/${repo.full_name}/contents/${encodeURIComponent(file.path)}?ref=${repo.default_branch}`) ; if(raw.content) aggregate+=Buffer.from(raw.content.replace(/\n/g,""),"base64").toString("utf8");}catch (e){}}
  }
  for(const tech of technologies(repo,files,aggregate)){const techId=key("tech",tech.toLowerCase()); await prisma.$executeRawUnsafe(`INSERT INTO world_model_technologies(id,name,category) VALUES($1,$2,'technology') ON CONFLICT(name) DO NOTHING`,techId,tech); await prisma.$executeRawUnsafe(`INSERT INTO world_model_relationships(id,source_id,target_id,relation,metadata) VALUES($1,$2,$3,'USES',$4::jsonb) ON CONFLICT DO NOTHING`,key("rel",`${projectId}:USES:${techId}`),projectId,techId,JSON.stringify({source:"repository-analysis"}));}
  await prisma.$executeRawUnsafe(`UPDATE world_model_projects SET last_synced_at=NOW() WHERE id=$1`,projectId); await prisma.$executeRawUnsafe(`INSERT INTO world_model_events(id,project_id,event_type,changed_paths,payload) VALUES($1,$2,$3,$4::jsonb,$5::jsonb)`,key("event",`${repo.full_name}:${Date.now()}`),projectId,changedPaths.length?"incremental_sync":"initial_sync",JSON.stringify(artifactPaths),JSON.stringify({repository:repo.full_name}));
  return {projectId,repository:repo.full_name,artifacts:artifactPaths.length,technologies:technologies(repo,files,aggregate)};
}

export async function retrieveWorld(query,limit=12){
  await ensureSchema(); const q=`%${query.trim().replace(/[%_]/g,"\\$&")}%`;
  const projects=await prisma.$queryRawUnsafe(`SELECT id,name,full_name,description,url,language,last_synced_at FROM world_model_projects WHERE $1='' OR name ILIKE $2 OR full_name ILIKE $2 OR description ILIKE $2 ORDER BY last_synced_at DESC LIMIT $3`,query.trim(),q,limit);
  const technologies=await prisma.$queryRawUnsafe(`SELECT t.name,COUNT(*)::int AS project_count FROM world_model_technologies t JOIN world_model_relationships r ON r.target_id=t.id WHERE $1='' OR t.name ILIKE $2 GROUP BY t.name ORDER BY project_count DESC LIMIT $3`,query.trim(),q,limit);
  return {query,projects,technologies};
}

export function verifyGitHubSignature(rawBody,signature){const secret=process.env.GITHUB_WEBHOOK_SECRET;if(!secret||!signature)return false;const expected=`sha256=${createHmac("sha256",secret).update(rawBody).digest("hex")}`;const a=Buffer.from(expected),b=Buffer.from(signature);return a.length===b.length&&timingSafeEqual(a,b);}

export async function processWebhook(payload) {
  if (!_optionalChain([payload, 'optionalAccess', _4 => _4.repository, 'optionalAccess', _5 => _5.full_name])) throw new Error("Webhook payload missing repository");
  const repo = (await gh(`/repos/${payload.repository.full_name}`)) ;
  const changed = Array.from(
    new Set(
      (payload.commits || []).flatMap((c) => [
        ...(c.added || []),
        ...(c.modified || []),
        ...(c.removed || []),
      ])
    )
  );
  const result = await syncRepository(repo, changed.filter((p) => TEXT.test(p)));
  await prisma.$executeRawUnsafe(
    `INSERT INTO world_model_events(id,project_id,event_type,commit_sha,changed_paths,payload) VALUES($1,$2,'github_webhook',$3,$4::jsonb,$5::jsonb)`,
    key("webhook", `${repo.full_name}:${payload.after || Date.now()}`),
    result.projectId,
    payload.after || null,
    JSON.stringify(changed),
    JSON.stringify({ action: payload.action, ref: payload.ref })
  );
  return result;
}

