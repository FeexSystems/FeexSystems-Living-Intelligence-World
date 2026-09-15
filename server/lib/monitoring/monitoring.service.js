 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import * as otelResources from '@opentelemetry/resources';
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
  

  constructor() {
    // Create and configure TraceProvider
    this.tracerProvider = new (NodeTracerProvider )({
      resource: (otelResources ).Resource ? new (otelResources ).Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'feexsystems-api',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }) : undefined
    });

    // Configure span processor and exporter
    const spanProcessor = new (BatchSpanProcessor )(
      new (OTLPTraceExporter )({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
      })
    );

    _optionalChain([this, 'access', _ => _.tracerProvider, 'access', _2 => _2.addSpanProcessor, 'optionalCall', _3 => _3(spanProcessor)]);
  }

  initialize() {
    try {
      // Register the TraceProvider
      _optionalChain([this, 'access', _4 => _4.tracerProvider, 'access', _5 => _5.register, 'optionalCall', _6 => _6()]);

      // Register instrumentations
      registerInstrumentations({
        instrumentations: [
          new (ExpressInstrumentation )(),
          new (HttpInstrumentation )(),
          new (PrismaInstrumentation )(),
          new (RedisInstrumentation )()
        ]
      });

      logger.info('Monitoring service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize monitoring service:', error);
      // Non-blocking initialization per invariant #3
    }
  }

  // Track custom metrics
  trackMetric(name, value, tags = {}) {
    try {
      const metric = _optionalChain([this, 'access', _7 => _7.tracerProvider, 'access', _8 => _8.getMetricProvider, 'optionalCall', _9 => _9()
, 'optionalAccess', _10 => _10.getMeter, 'call', _11 => _11('feexsystems-api')
, 'optionalAccess', _12 => _12.createCounter, 'call', _13 => _13(name)]);

      _optionalChain([metric, 'optionalAccess', _14 => _14.add, 'call', _15 => _15(value, tags)]);
    } catch (error) {
      logger.error(`Failed to track metric ${name}:`, error);
    }
  }

  // Create custom span for performance tracking
  createSpan(name, fn) {
    const tracer = this.tracerProvider.getTracer('feexsystems-api');
    
    return tracer.startActiveSpan(name, async (span) => {
      try {
        const result = await fn();
        span.end();
        return result;
      } catch (error) {
        span.recordException(error );
        span.setStatus({ code: 2 }); // Error status
        span.end();
        throw error;
      }
    });
  }

  // Track error with context
  trackError(error, context = {}) {
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
