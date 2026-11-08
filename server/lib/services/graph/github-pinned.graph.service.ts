// Extracted from github-pinned.service.ts - Graph layer
import { prisma } from "../../database";
import { discoverPinnedRepositories } from "../sync/github-pinned.sync.service";
import { PinnedRepository } from "../sync/github-pinned.sync.service";

export async function syncRepositoryToGraph(repo: PinnedRepository) {
  // This function would integrate with the world-model graph
  // to create graph nodes/edges for the repository
  return {
    id: `repo:${repo.fullName}`,
    type: "github_repository",
    name: repo.name,
    fullName: repo.fullName,
    url: repo.url,
    source: repo.source,
    metadata: {
      discoveredAt: new Date().toISOString()
    }
  };
}

export async function getPinnedRepositoriesGraph(): Promise<Array<{ id: string; type: string; name: string; fullName: string; url: string }>> {
  const repos = await discoverPinnedRepositories();
  return repos.map(repo => ({
    id: `repo:${repo.fullName}`,
    type: "github_repository",
    name: repo.name,
    fullName: repo.fullName,
    url: repo.url
  }));
}