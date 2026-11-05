// Extracted from github-pinned.service.ts - Sync layer
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../database";
import { processMarketingSignalFromWebhook } from "../marketing/github-marketing.service";
import { cacheService, CacheService } from "./cache.service";

type PinnedRepository = { name: string; fullName: string; url: string; description: string | null; source: "github-profile-pinned" | "environment" };
type Repo = { id: number; name: string; full_name: string; html_url: string; default_branch: string; description: string | null; language: string | null; stargazers_count: number; topics?: string[]; pushed_at: string; updated_at: string };
type TreeItem = { path: string; type: string; sha: string; size?: number };
const ORG = "FeexSystems";
const PROFILE_URL = `https://github.com/${ORG}`;
const API = "https://api.github.com";
const TEXT = /\\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|php|rb|cs|cpp|c|h|hpp|sql|prisma|json|yaml|yml|md|mdx|html|css|scss|vue|svelte|sh|toml|xml)$/i;
const MAX_FILES = Number(process.env.WORLD_MODEL_MAX_FILES || 300);

async function gh(path: string) {
  const r = await fetch(`${API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
    }
  });
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${await r.text()}`);
  return r.json();
}

function key(p: string, v: string) {
  return `${p}_${createHmac("sha256", "feex-wm").update(v).digest("hex").slice(0, 24)}`;
}

export async function discoverPinnedRepositories(): Promise<PinnedRepository[]> {
  const configured = configuredPinnedRepositories();
  if (configured.length) return configured;
  const response = await fetch(PROFILE_URL, { headers: { Accept: "text/html", "User-Agent": "FEEXSYSTEMS-World-Model/1.0" } });
  if (!response.ok) throw new Error(`GitHub profile request failed: ${response.status}`);
  const html = await response.text();
  const pinned = html.match(/pinned-item-list[^>]*>([\\s\\S]*?)<\\/ol>/i);
  if (!pinned) throw new Error("GitHub pinned repository section was not found; refusing to infer unrelated profile links");
  const repositories = new Map<string, PinnedRepository>();
  const pattern = new RegExp(`href=[\\\"']\\/${ORG}\\/([^\\\"'#?]+)[\\\"'][^>]*>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(pinned[1])) !== null) {
    const name = m[1].replace(/\/$/,"");
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