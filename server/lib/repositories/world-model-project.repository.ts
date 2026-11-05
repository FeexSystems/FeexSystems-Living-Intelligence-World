/**
 * World Model Project Repository
 *
 * Encapsulates all Prisma queries for World Model projects.
 */

import { BaseRepository } from './base.repository';
import { prisma } from '../database';

interface WorldModelProject {
  id: string;
  name: string;
  repository: string;
  description?: string | null;
  metadata?: unknown;
  lastObservedAt?: Date;
}

interface CreateProjectInput {
  id: string;
  name: string;
  repository: string;
  description?: string;
  metadata?: unknown;
}

interface UpdateProjectInput {
  name?: string;
  description?: string;
  metadata?: unknown;
  lastObservedAt?: Date;
}

export class WorldModelProjectRepository extends BaseRepository<WorldModelProject, CreateProjectInput, UpdateProjectInput> {
  constructor() {
    super('worldModelProject');
  }

  async findByRepository(repository: string): Promise<WorldModelProject | null> {
    return (prisma as any).worldModelProject.findFirst({ where: { repository } });
  }

  async findRecent(limit = 50): Promise<WorldModelProject[]> {
    return (prisma as any).worldModelProject.findMany({
      orderBy: { lastObservedAt: 'desc' },
      take: limit,
    });
  }

  async searchByName(query: string, limit = 20): Promise<WorldModelProject[]> {
    return (prisma as any).worldModelProject.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      take: limit,
    });
  }
}

export const worldModelProjectRepository = new WorldModelProjectRepository();
export default worldModelProjectRepository;
