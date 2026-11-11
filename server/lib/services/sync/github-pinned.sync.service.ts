// Extracted from github-pinned.service.ts - Sync layer
type PinnedRepository = { name: string; fullName: string; url: string; description: string | null; source: "github-profile-pinned" | "environment" };
const ORG = "FeexSystems";
const PROFILE_URL = `https://github.com/${ORG}`;

export async function discoverPinnedRepositories(): Promise<PinnedRepository[]> {
  const configured = configuredPinnedRepositories();
  if (configured.length) return configured;
  const response = await fetch(PROFILE_URL, { headers: { Accept: "text/html", "User-Agent": "FEEXSYSTEMS-World-Model/1.0" } });
  if (!response.ok) throw new Error(`GitHub profile request failed: ${response.status}`);
  const html = await response.text();
  const pinned = html.match(/pinned-item-list[^>]*>([\\s\\S]*?)<\/ol>/i);
  const pinnedBody = pinned?.[1];
  if (!pinnedBody) throw new Error("GitHub pinned repository section was not found; refusing to infer unrelated profile links");
  const repositories = new Map<string, PinnedRepository>();
  const pattern = new RegExp(`href=[\\\"']\\/${ORG}\\/([^\\\"'#?]+)[\\\"'][^>]*>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(pinnedBody)) !== null) {
    const name = m[1]?.replace(/\/$/,"");
    if (!name) continue;
    if (name && !name.startsWith(".") && !repositories.has(name)) repositories.set(name, { name, fullName: `${ORG}/${name}`, url: `https://github.com/${ORG}/${name}`, description: null, source: "github-profile-pinned" });
  }
  return [...repositories.values()].slice(0, 6);
}

function configuredPinnedRepositories(): PinnedRepository[] {
  const raw = process.env.GITHUB_PINNED_REPOSITORIES?.trim();
  if (!raw) return [];
  return raw.split(",").map(v => v.trim()).filter(Boolean).map(repository => ({
    name: repository.split("/").pop() || repository,
    fullName: repository.includes("/") ? repository : `${ORG}/${repository}`,
    url: `https://github.com/${repository.includes("/") ? repository : `${ORG}/${repository}`}`,
    description: null,
    source: "environment" as const
  }));
}