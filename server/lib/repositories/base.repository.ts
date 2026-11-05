/**
 * Base Repository
 *
 * Abstract base class for domain repositories.
 * Provides common CRUD operations and tenant scoping.
 */

import { prisma } from '../database';

export interface RepositoryOptions {
  tenantKey?: string;
}

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected readonly model: string;

  constructor(model: string) {
    this.model = model;
  }

  protected get client() {
    return prisma;
  }

  async findById(id: string): Promise<T | null> {
    return (this.client as any)[this.model].findUnique({ where: { id } });
  }

  async findMany(where: Record<string, unknown> = {}, options: { skip?: number; take?: number; orderBy?: Record<string, unknown> } = {}): Promise<T[]> {
    return (this.client as any)[this.model].findMany({
      where,
      skip: options.skip,
      take: options.take,
      orderBy: options.orderBy,
    });
  }

  async create(data: CreateInput): Promise<T> {
    return (this.client as any)[this.model].create({ data });
  }

  async update(id: string, data: UpdateInput): Promise<T> {
    return (this.client as any)[this.model].update({ where: { id }, data });
  }

  async delete(id: string): Promise<T> {
    return (this.client as any)[this.model].delete({ where: { id } });
  }

  async count(where: Record<string, unknown> = {}): Promise<number> {
    return (this.client as any)[this.model].count({ where });
  }
}
