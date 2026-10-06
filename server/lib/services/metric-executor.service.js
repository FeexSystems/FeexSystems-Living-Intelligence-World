import { prisma } from "../database";























class MetricExecutorService {
  async evaluateMetric(metric) {
    try {
      const results = await prisma.$queryRaw


`
        SELECT
          COALESCE(${metric.dimensions[0] || "unknown"}, 'unknown') as dim_value,
          COUNT(*)::int as count
        FROM world_model_projects
        GROUP BY dim_value
        LIMIT 20
      `;

      return (Array.isArray(results) ? results : []).map((r) => ({
        metricId: metric.id,
        metricName: metric.name,
        value: (r.count ) || 0,
        dimensions: { dimension: r.dim_value  },
        timestamp: new Date().toISOString(),
      }));
    } catch (e) {
      return [
        {
          metricId: metric.id,
          metricName: metric.name,
          value: 0,
          dimensions: {},
          timestamp: new Date().toISOString(),
        },
      ];
    }
  }

  async evaluateMultiple(metricIds) {
    const metrics = await Promise.all(metricIds.map((id) => this.getMetricById(id)));
    const validMetrics = metrics.filter((m) => m !== null);
    const results = await Promise.all(validMetrics.map((m) => this.evaluateMetric(m)));
    return results.flat();
  }

  async renderDashboard(dashboardId) {
    try {
      const dashboard = await prisma.dashboard_templates.findUnique({
        where: { id: dashboardId },
      });
      if (!dashboard) return null;

      const metricResults = await this.evaluateMultiple(
        (dashboard.metrics || []) 
      );

      const metricsGrouped = new Map();
      for (const result of metricResults) {
        metricsGrouped.set(result.metricId, {
          value: result.value,
          label: result.metricName,
        });
      }

      return {
        dashboardId: dashboard.id,
        dashboardName: dashboard.name,
        layout: dashboard.layout ,
        metrics: Array.from(metricsGrouped.entries()).map(([metricId, data]) => ({
          metricId,
          metricName: data.label,
          value: data.value,
          label: data.label,
        })),
        renderedAt: new Date().toISOString(),
      };
    } catch (e2) {
      return null;
    }
  }

   async getMetricById(id) {
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
}

export const metricExecutorService = new MetricExecutorService();
