import { prisma } from "../database";
import type { MetricDefinition } from "./analytics-config.service";

export interface MetricResult {
  metricId: string;
  metricName: string;
  value: number;
  dimensions: Record<string, string>;
  timestamp: string;
}

export interface DashboardRenderResult {
  dashboardId: string;
  dashboardName: string;
  layout: Record<string, any>;
  metrics: Array<{
    metricId: string;
    metricName: string;
    value: number;
    label: string;
  }>;
  renderedAt: string;
}

class MetricExecutorService {
  async evaluateMetric(metric: MetricDefinition): Promise<MetricResult[]> {
    try {
      const results = await prisma.$queryRaw<{
        dim_value: string;
        count: number;
      }>`
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
        value: (r.count as number) || 0,
        dimensions: { dimension: r.dim_value as string },
        timestamp: new Date().toISOString(),
      }));
    } catch {
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

  async evaluateMultiple(metricIds: string[]): Promise<MetricResult[]> {
    const metrics = await Promise.all(metricIds.map((id) => this.getMetricById(id)));
    const validMetrics = metrics.filter((m): m is MetricDefinition => m !== null);
    const results = await Promise.all(validMetrics.map((m) => this.evaluateMetric(m)));
    return results.flat();
  }

  async renderDashboard(dashboardId: string): Promise<DashboardRenderResult | null> {
    try {
      const dashboard = await prisma.dashboard_templates.findUnique({
        where: { id: dashboardId },
      });
      if (!dashboard) return null;

      const metricResults = await this.evaluateMultiple(
        (dashboard.metrics || []) as string[]
      );

      const metricsGrouped = new Map<string, { value: number; label: string }>();
      for (const result of metricResults) {
        metricsGrouped.set(result.metricId, {
          value: result.value,
          label: result.metricName,
        });
      }

      return {
        dashboardId: dashboard.id,
        dashboardName: dashboard.name,
        layout: dashboard.layout as Record<string, any>,
        metrics: Array.from(metricsGrouped.entries()).map(([metricId, data]) => ({
          metricId,
          metricName: data.label,
          value: data.value,
          label: data.label,
        })),
        renderedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private async getMetricById(id: string): Promise<MetricDefinition | null> {
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
}

export const metricExecutorService = new MetricExecutorService();
