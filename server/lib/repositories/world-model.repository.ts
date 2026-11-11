// World Model Repository â€” handles world-model project and artifact operations

import { prisma } from '../database';
import type { WorldModelProject, WorldModelArtifact } from '@prisma/client';

export interface WorldModelProjectRepository {
  create(project: {
    repository: string;
    name: string;
    owner: string;
    url: string;
    description?: string;
    visibility?: string;
    isPinned?: boolean;
    source?: string;
    metadata?: Record<string, any>;
  }): Promise<WorldModelProject>;

  findByRepository(repo: string): Promise<WorldModelProject | null>;

  findPinned(): Promise<WorldModelProject[]>;

  updateIsPinned(id: string, pinned: boolean): Promise<WorldModelProject>;
}

export interface WorldModelArtifactRepository {
  create(artifact: {
    projectId: string;
    path: string;
    sha: string;
    kind: string;
    size?: number;
  }): Promise<WorldModelArtifact>;

  findByProject(projectId: string): Promise<WorldModelArtifact[]>;

  findBySha(sha: string): Promise<WorldModelArtifact | null>;

  updateSize(id: string, size: number): Promise<WorldModelArtifact>;
}

export class PrismaWorldModelProjectRepository implements WorldModelProjectRepository {
  async create(project: {
    repository: string;
    name: string;
    owner: string;
    url: string;
    description?: string;
    visibility?: string;
    isPinned?: boolean;
    source?: string;
    metadata?: Record<string, any>;
  }): Promise<WorldModelProject> {
    return prisma.worldModelProject.create({
      data: {
        // `id` has no schema default — the repository slug is the stable key.
        id: project.repository,
        repository: project.repository,
        name: project.name,
        owner: project.owner,
        url: project.url,
        description: project.description,
        visibility: project.visibility,
        isPinned: project.isPinned ?? false,
        source: project.source ?? 'github',
        metadata: project.metadata ?? {},
        firstObservedAt: new Date(),
        lastObservedAt: new Date(),
      }
    });
  }

  async findByRepository(repo: string): Promise<WorldModelProject | null> {
    return prisma.worldModelProject.findFirst({
      where: { repository: repo }
    });
  }

  async findPinned(): Promise<WorldModelProject[]> {
    return prisma.worldModelProject.findMany({
      where: { isPinned: true }
    });
  }

  async updateIsPinned(id: string, pinned: boolean): Promise<WorldModelProject> {
    return prisma.worldModelProject.update({
      where: { id },
      data: { isPinned: pinned, lastObservedAt: new Date() }
    });
  }
}

export class PrismaWorldModelArtifactRepository implements WorldModelArtifactRepository {
  async create(artifact: {
    projectId: string;
    path: string;
    sha: string;
    kind: string;
    size?: number;
  }): Promise<WorldModelArtifact> {
    return prisma.worldModelArtifact.create({
      data: {
        // `id` has no schema default — compose it from the natural unique key
        // (projectId + path) so re-ingesting the same artifact upserts cleanly.
        id: `${artifact.projectId}:${artifact.path}`,
        projectId: artifact.projectId,
        path: artifact.path,
        sha: artifact.sha,
        kind: artifact.kind,
        // `metadata` is required by the schema (JSON with a DB-side default);
        // Prisma's create-input still demands the key explicitly.
        metadata: {},
        // Prisma maps `size` to BigInt?; omit the key when unset — `null`
        // conflicts with the create-input union.
        ...(artifact.size === undefined ? {} : { size: BigInt(artifact.size) }),
      }
    });
  }

  async findByProject(projectId: string): Promise<WorldModelArtifact[]> {
    return prisma.worldModelArtifact.findMany({
      where: { projectId: projectId }
    });
  }

  async findBySha(sha: string): Promise<WorldModelArtifact | null> {
    return prisma.worldModelArtifact.findFirst({
      where: { sha }
    });
  }

  async updateSize(id: string, size: number): Promise<WorldModelArtifact> {
    return prisma.worldModelArtifact.update({
      where: { id },
      data: { size }
    });
  }
}