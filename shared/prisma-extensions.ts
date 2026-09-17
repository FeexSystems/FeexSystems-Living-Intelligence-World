export interface PrismaExtensions {
  analytics_agents: {
    create: (data: any) => Promise<any>;
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: { where: { id: string } }) => Promise<any>;
  };
  metric_definitions: {
    create: (data: any) => Promise<any>;
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: { where: { id: string } }) => Promise<any>;
  };
  dashboard_templates: {
    create: (data: any) => Promise<any>;
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: { where: { id: string } }) => Promise<any>;
  };
}
