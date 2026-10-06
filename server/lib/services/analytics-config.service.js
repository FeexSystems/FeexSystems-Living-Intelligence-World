import { prisma } from "../database";



























class AnalyticsConfigService {
  async createMetric(input







) {
    const metric = {
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
      await prisma.metric_definitions.create({ data: metric  });
    } catch (e) {
      /* DB unavailable */
    }
    return metric;
  }

  async listMetrics(agentId) {
    try {
      const rows = await prisma.metric_definitions.findMany({
        where: agentId ? { agentId } : undefined,
      });
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description || "",
        expression: r.expression,
        dimensions: (r.dimensions || []) ,
        filters: (r.filters || []) ,
        cacheTTL: r.cacheTTL || 3600,
        agentId: r.agentId,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    } catch (e2) {
      return [];
    }
  }

  async getMetric(id) {
    try {
      const row = await prisma.metric_definitions.findUnique({ where: { id } });
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        description: row.description || "",
        expression: row.expression,
        dimensions: (row.dimensions || []) ,
        filters: (row.filters || []) ,
        cacheTTL: row.cacheTTL || 3600,
        agentId: row.agentId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch (e3) {
      return null;
    }
  }

  async createDashboard(input





) {
    const dashboard = {
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
      await prisma.dashboard_templates.create({ data: dashboard  });
    } catch (e4) {
      /* DB unavailable */
    }
    return dashboard;
  }

  async listDashboards(agentId) {
    try {
      const rows = await prisma.dashboard_templates.findMany({
        where: agentId ? { agentId } : undefined,
      });
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        layout: r.layout ,
        metrics: (r.metrics || []) ,
        audience: r.audience ,
        agentId: r.agentId,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    } catch (e5) {
      return [];
    }
  }
}

export const analyticsConfigService = new AnalyticsConfigService();
