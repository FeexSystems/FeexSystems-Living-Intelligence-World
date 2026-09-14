import * as otelResources from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { logger } from '../logging';

class MonitoringService {
  private tracerProvider: any;

  constructor() {
    // Create and configure TraceProvider
    this.tracerProvider = new (NodeTracerProvider as any)({
      resource: (otelResources as any).Resource ? new (otelResources as any).Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'feexsystems-api',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }) : undefined
    });

    // Configure span processor and exporter
    const spanProcessor = new (BatchSpanProcessor as any)(
      new (OTLPTraceExporter as any)({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
      })
    );

    this.tracerProvider.addSpanProcessor?.(spanProcessor);
  }

  initialize() {
    try {
      // Register the TraceProvider
      this.tracerProvider.register?.();

      // Register instrumentations
      registerInstrumentations({
        instrumentations: [
          new (ExpressInstrumentation as any)(),
          new (HttpInstrumentation as any)(),
          new (PrismaInstrumentation as any)(),
          new (RedisInstrumentation as any)()
        ]
      });

      logger.info('Monitoring service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize monitoring service:', error);
      // Non-blocking initialization per invariant #3
    }
  }

  // Track custom metrics
  trackMetric(name: string, value: number, tags: Record<string, string> = {}) {
    try {
      const metric = this.tracerProvider.getMetricProvider?.()
        ?.getMeter('feexsystems-api')
        ?.createCounter(name);

      metric?.add(value, tags);
    } catch (error) {
      logger.error(`Failed to track metric ${name}:`, error);
    }
  }

  // Create custom span for performance tracking
  createSpan(name: string, fn: () => Promise<any>) {
    const tracer = this.tracerProvider.getTracer('feexsystems-api');
    
    return tracer.startActiveSpan(name, async (span: any) => {
      try {
        const result = await fn();
        span.end();
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2 }); // Error status
        span.end();
        throw error;
      }
    });
  }

  // Track error with context
  trackError(error: Error, context: Record<string, any> = {}) {
    try {
      const tracer = this.tracerProvider.getTracer('feexsystems-api');
      const span = tracer.startSpan('error');
      
      span.recordException(error);
      span.setAttributes({
        'error.type': error.name,
        'error.message': error.message,
        'error.stack': error.stack,
        ...context
      });
      
      span.end();
    } catch (trackingError) {
      logger.error('Failed to track error:', trackingError);
    }
  }
}

export const monitoringService = new MonitoringService();
