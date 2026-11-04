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
   __init() {this.tracerProvider = null}
   __init2() {this.isInitialized = false}

  constructor() {;MonitoringService.prototype.__init.call(this);MonitoringService.prototype.__init2.call(this);
    // Pure constructor - zero background handles or timers at module load time (Invariant #3)
  }

   getTracerProvider() {
    if (!this.tracerProvider) {
      this.tracerProvider = new (NodeTracerProvider )({
        resource: (otelResources ).Resource ? new (otelResources ).Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: 'feexsystems-api',
          [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }) : undefined
      });
    }
    return this.tracerProvider;
  }

  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const provider = this.getTracerProvider();

      if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
        const spanProcessor = new (BatchSpanProcessor )(
          new (OTLPTraceExporter )({
            url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
          })
        );
        _optionalChain([provider, 'access', _ => _.addSpanProcessor, 'optionalCall', _2 => _2(spanProcessor)]);
      }

      // Register the TraceProvider
      _optionalChain([provider, 'access', _3 => _3.register, 'optionalCall', _4 => _4()]);

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
      const metric = _optionalChain([this, 'access', _5 => _5.getTracerProvider, 'call', _6 => _6(), 'access', _7 => _7.getMetricProvider, 'optionalCall', _8 => _8()
, 'optionalAccess', _9 => _9.getMeter, 'call', _10 => _10('feexsystems-api')
, 'optionalAccess', _11 => _11.createCounter, 'call', _12 => _12(name)]);

      _optionalChain([metric, 'optionalAccess', _13 => _13.add, 'call', _14 => _14(value, tags)]);
    } catch (error) {
      logger.error(`Failed to track metric ${name}:`, error);
    }
  }

  // Create custom span for performance tracking
  createSpan(name, fn) {
    const tracer = this.getTracerProvider().getTracer('feexsystems-api');
    
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
      const tracer = this.getTracerProvider().getTracer('feexsystems-api');
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
