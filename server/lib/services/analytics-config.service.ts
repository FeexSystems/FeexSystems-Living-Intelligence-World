import { prisma } from "../database";
import { analyticsAgentService } from "./analytics-agent.service";
import type { Tier } from "../../../shared/ai-agents";

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  expression: string;
  dimensions: string[];
  filters: Record<string, any>[];
  cacheTTL: number;
  agentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  layout: Record<string, any>;
  metrics: string[];
  audience: Record<string, any> | null;
  agentId: string | null;
  createdAt: string;
  updatedAt: string;
}

class AnalyticsConfigService {
  async createMetric(input: {
    name: string;
    description?: string;
    expression: string;
    dimensions?: string[];
    filters?: Record<string, any>[];
    cacheTTL?: number;
    agentId?: string;
  }): Promise<MetricDefinition> {
    const metric: MetricDefinition = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description || "",
      expression: input.expression,
      dimensions: input.dimensions || [],
      filters: input.filters || [],
      cacheTTL: input.cacheTTL || 3600,
      agentId: input.agentId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await prisma.metric_definitions.create({ data: metric as any });
    } catch {
      /* DB unavailable */
    }
    return metric;
  }

  async listMetrics(agentId?: string): Promise<MetricDefinition[]> {
    try {
      const rows = await prisma.metric_definitions.findMany({
        where: agentId ? { agentId } : undefined,
      });
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description || "",
        expression: r.expression,
        dimensions: (r.dimensions || []) as string[],
        filters: (r.filters || []) as Record<string, any>[],
        cacheTTL: r.cacheTTL || 3600,
        agentId: r.agentId,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    } catch {
      return [];
    }
  }

  async getMetric(id: string): Promise<MetricDefinition | null> {
    try {
      const row = await prisma.metric_definitions.findUnique({ where: { id } });
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        description: row.description || "",
        expression: row.expression,
        dimensions: (row.dimensions || []) as string[],
        filters: (row.filters || []) as Record<string, any>[],
        cacheTTL: row.cacheTTL || 3600,
        agentId: row.agentId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch {
      return null;
    }
  }

  async createDashboard(input: {
    name: string;
    layout: Record<string, any>;
    metrics: string[];
    audience?: Record<string, any>;
    agentId?: string;
  }): Promise<DashboardTemplate> {
    const dashboard: DashboardTemplate = {
      id: crypto.randomUUID(),
      name: input.name,
      layout: input.layout,
      metrics: input.metrics,
      audience: input.audience || null,
      agentId: input.agentId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await prisma.dashboard_templates.create({ data: dashboard as any });
    } catch {
      /* DB unavailable */
    }
    return dashboard;
  }

  async listDashboards(agentId?: string): Promise<DashboardTemplate[]> {
    try {
      const rows = await prisma.dashboard_templates.findMany({
        where: agentId ? { agentId } : undefined,
      });
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        layout: r.layout as Record<string, any>,
        metrics: (r.metrics || []) as string[],
        audience: r.audience as Record<string, any> | null,
        agentId: r.agentId,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    } catch {
      return [];
    }
  }
}

export const analyticsConfigService = new AnalyticsConfigService();
