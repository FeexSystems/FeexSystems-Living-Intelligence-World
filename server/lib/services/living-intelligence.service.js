 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../database";

const ORG = process.env.FEEXSYSTEMS_GITHUB_ORG || "FeexSystems";
const GITHUB_API = "https://api.github.com";
const TEXT_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|php|rb|cs|cpp|c|h|hpp|sql|prisma|json|yaml|yml|md|mdx|html|css|scss|vue|svelte|sh|toml|xml)$/i;
const MAX_FILES = Number(process.env.WORLD_MODEL_MAX_FILES || 300);

















async function github(path, init) {
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(_optionalChain([init, 'optionalAccess', _ => _.headers]) || {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${await response.text()}`);
  return response.json();
}

async function discoverPinnedRepositories() {
  if (process.env.FEEXSYSTEMS_PINNED_REPOS) {
    return process.env.FEEXSYSTEMS_PINNED_REPOS.split(",").map((v) => v.trim()).filter(Boolean);
  }

  // GitHub does not expose profile-pinned repositories through its REST API.
  // The public profile HTML contains the canonical pinned-item-list, so use it
  // only for discovery and then resolve each repository through the GitHub API.
  const html = await fetch(`https://github.com/${ORG}`, { headers: { "User-Agent": "FeexSystems-Living-Intelligence/1.0" } }).then(async (r) => {
    if (!r.ok) throw new Error(`GitHub profile ${r.status}`);
    return r.text();
  });
  const names = new Set();
  const re = new RegExp(`href=[\\\"']/${ORG}/([^\\\"']+)[\\\"']`, "g");
  const pinnedSection = _optionalChain([html, 'access', _2 => _2.match, 'call', _3 => _3(/pinned-item-list[\\s\\S]{0,120000}/i), 'optionalAccess', _4 => _4[0]]) || html;
  let match;
  while ((match = re.exec(pinnedSection))) {
    const repo = match[1].split("/")[0];
    if (repo && !repo.includes("?") && repo !== "repositories") names.add(repo);
  }
  return [...names].slice(0, 12);
}

function technologyCandidates(repo, files, text) {
  const technologies = new Set();
  if (repo.language) technologies.add(repo.language);
  const lower = text.toLowerCase();
  const signatures = {
    React: ["react", "react-dom"],
    TypeScript: ["typescript", "tsconfig.json"],
    Vite: ["vite"],
    "Next.js": ["next"],
    "Node.js": ["node", "express"],
    PostgreSQL: ["postgres", "postgresql", "prisma"],
    Prisma: ["prisma"],
    Redis: ["redis", "ioredis"],
    Docker: ["docker", "dockerfile", "docker-compose"],
    "Three.js": ["three", "@react-three"],
    TailwindCSS: ["tailwind"],
    Supabase: ["supabase"],
    Python: ["python", "pyproject.toml", "requirements.txt"],
    Kubernetes: ["kubernetes", "helm", "k8s"],
    GraphQL: ["graphql"],
    WebSockets: ["socket.io", "websocket"],
  };
  for (const [name, needles] of Object.entries(signatures)) {
    if (needles.some((needle) => lower.includes(needle.toLowerCase()) || files.some((f) => f.path.toLowerCase().includes(needle.toLowerCase())))) technologies.add(name);
  }
  return [...technologies];
}

async function ensureSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS world_model_projects (
      id TEXT PRIMARY KEY, repo_id BIGINT UNIQUE NOT NULL, name TEXT NOT NULL, full_name TEXT UNIQUE NOT NULL,
      description TEXT, url TEXT NOT NULL, default_branch TEXT NOT NULL, language TEXT, topics JSONB NOT NULL DEFAULT '[]',
      metadata JSONB NOT NULL DEFAULT '{}', first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS world_model_artifacts (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES world_model_projects(id) ON DELETE CASCADE,
      path TEXT NOT NULL, sha TEXT NOT NULL, kind TEXT NOT NULL, size BIGINT, metadata JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(project_id, path)
    );
    CREATE TABLE IF NOT EXISTS world_model_technologies (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT, metadata JSONB NOT NULL DEFAULT '{}', UNIQUE(name)
    );
    CREATE TABLE IF NOT EXISTS world_model_relationships (
      id TEXT PRIMARY KEY, source_id TEXT NOT NULL, target_id TEXT NOT NULL, relation TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}', UNIQUE(source_id, target_id, relation)
    );
    CREATE TABLE IF NOT EXISTS world_model_evidence (
      id TEXT PRIMARY KEY, project_id TEXT REFERENCES world_model_projects(id) ON DELETE CASCADE,
      artifact_id TEXT REFERENCES world_model_artifacts(id) ON DELETE CASCADE, source_type TEXT NOT NULL,
      source_url TEXT NOT NULL, source_sha TEXT, content_hash TEXT, observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      confidence DOUBLE PRECISION NOT NULL DEFAULT 1, metadata JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS world_model_events (
      id TEXT PRIMARY KEY, project_id TEXT REFERENCES world_model_projects(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL, commit_sha TEXT, changed_paths JSONB NOT NULL DEFAULT '[]',
      payload JSONB NOT NULL DEFAULT '{}', occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS wm_projects_last_sync ON world_model_projects(last_synced_at);
    CREATE INDEX IF NOT EXISTS wm_artifacts_project ON world_model_artifacts(project_id);
    CREATE INDEX IF NOT EXISTS wm_evidence_project ON world_model_evidence(project_id);
    CREATE INDEX IF NOT EXISTS wm_events_project_time ON world_model_events(project_id, occurred_at DESC);
  `);
}

function id(prefix, value) { return `${prefix}_${createHmac("sha256", "feex-wm").update(value).digest("hex").slice(0, 24)}`; }

export async function syncPinnedProjects() {
  await ensureSchema();
  const names = await discoverPinnedRepositories();
  const results = [];
  for (const name of names) {
    const repo = await github(`/repos/${ORG}/${name}`) ;
    results.push(await syncRepository(repo));
  }
  return { organization: ORG, discovered: names, synced: results };
}

export async function syncRepository(repo, changedPaths) {
  await ensureSchema();
  const projectId = id("proj", repo.full_name);
  await prisma.$executeRawUnsafe(
    `INSERT INTO world_model_projects (id,repo_id,name,full_name,description,url,default_branch,language,topics,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb)
     ON CONFLICT (full_name) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,url=EXCLUDED.url,default_branch=EXCLUDED.default_branch,language=EXCLUDED.language,topics=EXCLUDED.topics,metadata=EXCLUDED.metadata,last_synced_at=NOW()`,
    projectId, repo.id, repo.name, repo.full_name, repo.description, repo.html_url, repo.default_branch, repo.language,
    JSON.stringify(repo.topics || []), JSON.stringify({ stars: repo.stargazers_count, pushedAt: repo.pushed_at, updatedAt: repo.updated_at, source: "github" }),
  );

  const tree = await github(`/repos/${repo.full_name}/git/trees/${repo.default_branch}?recursive=1`) ;
  const files = tree.tree.filter((item) => item.type === "blob" && TEXT_EXTENSIONS.test(item.path)).slice(0, MAX_FILES);
  const targetPaths = _optionalChain([changedPaths, 'optionalAccess', _5 => _5.length]) ? new Set(changedPaths) : null;
  const selected = targetPaths ? files.filter((f) => targetPaths.has(f.path)) : files;
  const artifacts = [];
  let aggregate = `${repo.name} ${repo.description || ""} ${repo.language || ""} ${(repo.topics || []).join(" ")}`;

  for (const file of selected) {
    const artifactId = id("artifact", `${repo.full_name}:${file.path}`);
    const kind = file.path.toLowerCase() === "readme.md" ? "documentation" : file.path.endsWith("package.json") || file.path.endsWith("requirements.txt") ? "manifest" : "source";
    await prisma.$executeRawUnsafe(
      `INSERT INTO world_model_artifacts (id,project_id,path,sha,kind,size,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
       ON CONFLICT (project_id,path) DO UPDATE SET sha=EXCLUDED.sha,kind=EXCLUDED.kind,size=EXCLUDED.size,metadata=EXCLUDED.metadata,updated_at=NOW()`,
      artifactId, projectId, file.path, file.sha, kind, file.size || null, JSON.stringify({ source: "github", repository: repo.full_name }),
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO world_model_evidence (id,project_id,artifact_id,source_type,source_url,source_sha,confidence,metadata)
       VALUES ($1,$2,$3,'github_file',$4,$5,1,$6::jsonb)
       ON CONFLICT DO NOTHING`,
      id("evidence", `${repo.full_name}:${file.path}:${file.sha}`), projectId, artifactId,
      `https://github.com/${repo.full_name}/blob/${repo.default_branch}/${file.path}`, file.sha,
      JSON.stringify({ observedFrom: "repository-tree" }),
    );
    artifacts.push(file.path);
    if (file.path === "README.md" || file.path === "package.json") {
      try {
        const raw = await github(`/repos/${repo.full_name}/contents/${encodeURIComponent(file.path)}?ref=${repo.default_branch}`) ;
        if (raw.content) aggregate += Buffer.from(raw.content.replace(/\n/g, ""), "base64").toString("utf8");
      } catch (e) { /* one inaccessible artifact must not abort the repository */ }
    }
  }

  for (const technology of technologyCandidates(repo, files, aggregate)) {
    const technologyId = id("tech", technology.toLowerCase());
    await prisma.$executeRawUnsafe(`INSERT INTO world_model_technologies (id,name,category) VALUES ($1,$2,'technology') ON CONFLICT(name) DO NOTHING`, technologyId, technology);
    await prisma.$executeRawUnsafe(`INSERT INTO world_model_relationships (id,source_id,target_id,relation,metadata) VALUES ($1,$2,$3,'USES',$4::jsonb) ON CONFLICT DO NOTHING`, id("rel", `${projectId}:USES:${technologyId}`), projectId, technologyId, JSON.stringify({ source: "repository-analysis" }));
  }

  await prisma.$executeRawUnsafe(`UPDATE world_model_projects SET last_synced_at=NOW() WHERE id=$1`, projectId);
  await prisma.$executeRawUnsafe(`INSERT INTO world_model_events (id,project_id,event_type,changed_paths,payload) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb)`, id("event", `${repo.full_name}:${Date.now()}`), projectId, _optionalChain([changedPaths, 'optionalAccess', _6 => _6.length]) ? "incremental_sync" : "initial_sync", JSON.stringify(artifacts), JSON.stringify({ repository: repo.full_name, commit: null }));
  return { projectId, repository: repo.full_name, artifacts: artifacts.length, technologies: technologyCandidates(repo, files, aggregate) };
}

export async function retrieveWorld(query, limit = 12) {
  await ensureSchema();
  const q = `%${query.trim().replace(/[%_]/g, "\\$&")}%`;
  const projects = await prisma.$queryRawUnsafe(`SELECT id,name,full_name,description,url,language,last_synced_at FROM world_model_projects WHERE name ILIKE $1 OR full_name ILIKE $1 OR description ILIKE $1 ORDER BY last_synced_at DESC LIMIT $2`, q, limit) ;
  const technologies = await prisma.$queryRawUnsafe(`SELECT t.name, COUNT(*)::int AS project_count FROM world_model_technologies t JOIN world_model_relationships r ON r.target_id=t.id WHERE t.name ILIKE $1 GROUP BY t.name ORDER BY project_count DESC LIMIT $2`, q, limit) ;
  return { query, projects, technologies };
}

export function verifyGitHubSignature(rawBody, signature) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(expected); const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function processWebhook(payload) {
  if (!_optionalChain([payload, 'optionalAccess', _7 => _7.repository, 'optionalAccess', _8 => _8.full_name])) throw new Error("Webhook payload missing repository");
  const repo = (await github(`/repos/${payload.repository.full_name}`)) ;
  const changed = Array.from(
    new Set(
      (payload.commits || []).flatMap((c) => [
        ...(c.added || []),
        ...(c.modified || []),
        ...(c.removed || []),
      ])
    )
  );
  const result = await syncRepository(repo, changed.filter((p) => TEXT_EXTENSIONS.test(p)));
  await prisma.$executeRawUnsafe(`INSERT INTO world_model_events (id,project_id,event_type,commit_sha,changed_paths,payload) VALUES ($1,$2,'github_webhook',$3,$4::jsonb,$5::jsonb)`, id("webhook", `${repo.full_name}:${payload.after || Date.now()}`), result.projectId, payload.after || null, JSON.stringify(changed), JSON.stringify({ action: payload.action, ref: payload.ref }));
  return result;
}
