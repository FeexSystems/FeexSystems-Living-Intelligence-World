/**
 * OpenAPI 3.0 specification for the FeexSystems Living Intelligence API.
 *
 * Mount in server/index.ts (dev-only or behind an admin guard):
 *   import { setupSwagger } from './lib/docs/swagger';
 *   setupSwagger(app);
 */

import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const spec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'FeexSystems Living Intelligence API',
      version: '1.0.0',
      description: `
**FeexSystems.codes** — The public SaaS API for the FeexSystems Living Intelligence Platform.

All endpoints follow evidence-first principles:
- Every entity references traceable provenance (GitHub repo, commit SHA, file path).
- Model reasoning is provider-neutral (Gemini / OpenAI / Anthropic interchangeable).
- The World Model (PostgreSQL + pgvector) is the authoritative state.
      `,
      contact: {
        name: 'FeexSystems Engineering',
        url: 'https://feexsystems.codes',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server',
      },
      {
        url: 'https://feexsystems.codes',
        description: 'Production server',
      },
    ],
    tags: [
      { name: 'health', description: 'Server liveness and readiness checks' },
      { name: 'auth', description: 'Authentication — register, login, token refresh' },
      { name: 'world-model', description: 'Living World Model — projects, graph, evidence' },
      { name: 'navigator', description: 'AI-grounded natural language Navigator' },
      { name: 'omni-command', description: 'Agent-driven Omni-Command orchestration' },
      { name: 'telemetry', description: 'SSE telemetry stream (Sovereign Engine HUD)' },
      { name: 'billing', description: 'Paystack billing — plans, subscriptions, webhooks' },
      { name: 'ai-services', description: 'Provider-neutral AI model orchestration' },
      { name: 'devops', description: 'Pipelines and deployments' },
      { name: 'security', description: 'Security scans and audit logs' },
      { name: 'admin', description: 'Admin panel — users, metrics, system health' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase ID token or platform JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'NOT_FOUND' },
                code: { type: 'string', example: 'PROJECT_NOT_FOUND' },
                message: { type: 'string', example: 'The requested project was not found.' },
                requestId: { type: 'string', format: 'uuid' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string', example: '1.0.0' },
            environment: { type: 'string', example: 'production' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'FeexSystems Core API' },
            description: { type: 'string' },
            githubUrl: { type: 'string', format: 'uri' },
            status: { type: 'string', enum: ['active', 'archived', 'draft'] },
            technologies: {
              type: 'array',
              items: { type: 'string' },
              example: ['TypeScript', 'PostgreSQL', 'Redis'],
            },
            lastSyncedAt: { type: 'string', format: 'date-time' },
          },
        },
        EvidenceAnchor: {
          type: 'object',
          required: ['id', 'claim', 'source'],
          properties: {
            id: { type: 'string' },
            claim: { type: 'string', description: 'The factual statement being supported' },
            source: {
              type: 'object',
              properties: {
                repository: { type: 'string', example: 'feexsystems/core-api' },
                commitSha: { type: 'string', example: 'a1b2c3d4...' },
                filePath: { type: 'string', example: 'server/lib/services/world-model.ts' },
                observedAt: { type: 'string', format: 'date-time' },
              },
            },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
        NavigatorResponse: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            answer: { type: 'string' },
            confidence: { type: 'number' },
            evidenceAnchors: {
              type: 'array',
              items: { $ref: '#/components/schemas/EvidenceAnchor' },
            },
            latencyMs: { type: 'number' },
          },
        },
        Plan: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'engineer_pro_monthly' },
            name: { type: 'string', example: 'Engineer Pro' },
            price: { type: 'number', example: 29.00 },
            currency: { type: 'string', example: 'USD' },
            interval: { type: 'string', enum: ['monthly', 'yearly'] },
            features: { type: 'array', items: { type: 'string' } },
          },
        },
        MetricsResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded'] },
            timestamp: { type: 'string', format: 'date-time' },
            process: {
              type: 'object',
              properties: {
                uptime_seconds: { type: 'number' },
                memory: {
                  type: 'object',
                  properties: {
                    rss_mb: { type: 'number' },
                    heap_used_mb: { type: 'number' },
                    heap_total_mb: { type: 'number' },
                  },
                },
                event_loop_lag_ms: { type: 'number' },
              },
            },
            services: {
              type: 'object',
              properties: {
                database: { type: 'object' },
                redis: { type: 'object' },
              },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Missing or invalid authentication token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/health': {
        get: {
          tags: ['health'],
          summary: 'Liveness check',
          security: [],
          responses: {
            '200': {
              description: 'Server is alive',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
            },
          },
        },
      },
      '/health/ready': {
        get: {
          tags: ['health'],
          summary: 'Readiness check — DB + Redis',
          security: [],
          responses: {
            '200': { description: 'Server is ready to serve traffic' },
            '503': { description: 'Server is not ready (DB or Redis unavailable)' },
          },
        },
      },
      '/health/metrics': {
        get: {
          tags: ['health'],
          summary: 'Process performance metrics',
          security: [],
          responses: {
            '200': {
              description: 'Process metrics (memory, CPU, event loop lag)',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/MetricsResponse' } } },
            },
          },
        },
      },
      '/api/world-model/projects': {
        get: {
          tags: ['world-model'],
          summary: 'List synchronized World Model projects',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': {
              description: 'Paginated list of projects',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      projects: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
                      total: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/world-model/navigator': {
        get: {
          tags: ['navigator'],
          summary: 'Grounded AI query with evidence provenance',
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              description: 'Natural language query about the FeexSystems ecosystem',
              schema: { type: 'string', example: 'What are the most active repositories?' },
            },
          ],
          responses: {
            '200': {
              description: 'Evidence-grounded answer with anchors',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/NavigatorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/world-model/sync/github-pinned': {
        post: {
          tags: ['world-model'],
          summary: 'Trigger GitHub pinned-repos sync to World Model',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Sync triggered successfully' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/world-model/telemetry/stream': {
        get: {
          tags: ['telemetry'],
          summary: 'SSE telemetry stream for the Sovereign Engine HUD',
          description: 'Server-Sent Events stream. Falls back to a labeled procedural feed if canonical data is unavailable.',
          security: [],
          responses: {
            '200': {
              description: 'Event stream (text/event-stream)',
              content: { 'text/event-stream': { schema: { type: 'string' } } },
            },
          },
        },
      },
      '/api/billing/plans': {
        get: {
          tags: ['billing'],
          summary: 'List available subscription plans',
          security: [],
          responses: {
            '200': {
              description: 'Plan catalog',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      plans: { type: 'array', items: { $ref: '#/components/schemas/Plan' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/admin/system-health': {
        get: {
          tags: ['admin'],
          summary: 'Full system health for admin dashboard',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'System health data',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/MetricsResponse' } } },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/errors': {
        post: {
          tags: ['health'],
          summary: 'Client-side error reporting',
          description: 'Accepts error reports from the browser GlobalErrorHandler. Rate limited to 10/IP/min.',
          security: [],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message', 'type', 'errorId'],
                  properties: {
                    message: { type: 'string' },
                    stack: { type: 'string' },
                    type: { type: 'string', enum: ['javascript', 'promise', 'network', 'auth', 'validation'] },
                    errorId: { type: 'string' },
                    url: { type: 'string' },
                    userId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '202': { description: 'Error report accepted' },
            '429': { description: 'Rate limit exceeded' },
          },
        },
      },
    },
  },
  // Scan route files for inline @openapi JSDoc if added later
  apis: [path.join(__dirname, '../../routes/*.ts')],
});

/**
 * Mount Swagger UI + JSON spec on the Express app.
 * Only mounted in non-production environments unless ENABLE_DOCS=true.
 */
export function setupSwagger(app: Express) {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DOCS !== 'true') {
    return;
  }

  app.get('/api/docs/spec.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(spec);
  });

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec as any, {
      customSiteTitle: 'FeexSystems API Docs',
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; }
        body { background: #0f172a; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
      },
    })
  );
}
