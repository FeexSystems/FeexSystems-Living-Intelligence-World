// World Model Repository — handles world-model project and artifact operations

import { prisma } from '../database';
import { WorldModelProject, WorldModelArtifact } from '@prisma/client';

export interface WorldModelProjectRepository {
  create(project: {
    repository: string;
    name: string;
    owner: string;
    url: string;
    description?: string;
    visibility?: string;
    is_pinned?: boolean;
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
    is_pinned?: boolean;
    source?: string;
    metadata?: Record<string, any>;
  }): Promise<WorldModelProject> {
    return prisma.world_model_projects.create({
      data: {
        repository: project.repository,
        name: project.name,
        owner: project.owner,
        url: project.url,
        description: project.description,
        visibility: project.visibility,
        is_pinned: project.is_pinned ?? false,
        source: project.source ?? 'github',
        metadata: project.metadata ?? {},
        first_observed_at: new Date(),
        last_observed_at: new Date(),
      }
    });
  }

  async findByRepository(repo: string): Promise<WorldModelProject | null> {
    return prisma.world_model_projects.findFirst({
      where: { repository: repo }
    });
  }

  async findPinned(): Promise<WorldModelProject[]> {
    return prisma.world_model_projects.findMany({
      where: { is_pinned: true }
    });
  }

  async updateIsPinned(id: string, pinned: boolean): Promise<WorldModelProject> {
    return prisma.world_model_projects.update({
      where: { id },
      data: { is_pinned: pinned, last_observed_at: new Date() }
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
    return prisma.world_model_artifacts.create({
      data: {
        project_id: artifact.projectId,
        path: artifact.path,
        sha: artifact.sha,
        kind: artifact.kind,
        size: artifact.size,
      }
    });
  }

  async findByProject(projectId: string): Promise<WorldModelArtifact[]> {
    return prisma.world_model_artifacts.findMany({
      where: { project_id: projectId }
    });
  }

  async findBySha(sha: string): Promise<WorldModelArtifact | null> {
    return prisma.world_model_artifacts.findFirst({
      where: { sha }
    });
  }

  async updateSize(id: string, size: number): Promise<WorldModelArtifact> {
    return prisma.world_model_artifacts.update({
      where: { id },
      data: { size }
    });
  }
}