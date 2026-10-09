import '@prisma/client';
import '../redis';
import 'os';
import 'perf_hooks';

export interface SystemMetrics {
  timestamp: Date;
  uptime: number;
  memory: {
    total: number;
    free: number;
    used: number;
    usedPercentage: number;
    heap: NodeJS.MemoryUsage;
  };
  cpu: {
    usage: NodeJS.CpuUsage;
    loadAverage: number[];
    cores: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
    usedPercentage: number;
  };
  network: {
    interfaces: Record<string, any>;
  };
}

export interface DatabaseMetrics {
  connectionCount: number;
  queryCount: number;
  averageQueryTime: number;
  slowQueries: number;
  tableStats: Array<{
    tableName: string;
    rowCount: number;
    size: string;
  }>;
}

export interface ApplicationMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  activeConnections: number;
  queueSize: number;
  cacheHitRate: number;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  lastTriggered?: Date;
  description: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
} 