import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import helmet from "helmet";
import { createServer as createHttpServer } from "http";
import { fileURLToPath } from "url";
import { initializeSentry, setupSentryErrorHandler } from "./lib/logging/sentry";
import { validateEnv } from "./lib/config/validate-env";
import { applyProductionSecurity } from "./lib/middleware/production-security";
import { requestContext, requestLogger } from "./lib/middleware/request-context";
import { errorHandler, notFoundHandler } from "./lib/middleware/error.middleware";
import { logger } from "./lib/logging";
import { handleDemo } from "./routes/demo";
import { handleChat } from "./routes/chat";
import { handleHealthCheck, handleReadinessCheck, handleLivenessCheck, handleMetrics } from "./routes/health";
import subscriptionRoutes from "./routes/subscriptions";
import authRoutes from "./routes/auth";
import mockAuthRoutes from "./routes/mock-auth";
import userRoutes from "./routes/users";
import usageRoutes from "./routes/usage";
import billingRoutes from "./routes/billing";
import paystackRoutes from "./routes/paystack";
import aiRoutes from "./routes/ai";
import devopsRoutes from "./routes/devops";
import securityRoutes from "./routes/security";
import teamRoutes from "./routes/teams";
import adminRoutes from "./routes/admin";
import worldModelRoutes from "./routes/world-model";
import worldModelTelemetryStreamRoutes from "./routes/world-model-telemetry-stream";
import omniCommandRoutes from "./routes/omni-command";
import marketingRoutes from "./routes/marketing";
import marketingTelemetryRoutes from "./routes/marketing-telemetry";
import marketingIntelligenceRoutes from "./routes/marketing-intelligence";
import aiAgentsRoutes from "./routes/ai-agents";
import errorReportingRoutes from "./routes/error-reporting";
import { monitoringService } from "./lib/monitoring/monitoring.service";
import { setupSwagger } from "./lib/docs/swagger";
import { isFirebaseAdminConfigured } from "./lib/firebase-admin";
import { connectDatabase, disconnectDatabase } from "./lib/database";
import { createRedisClient, disconnectRedis } from "./lib/redis";
import { aiService } from "./lib/services/ai.service";
import { securityService } from "./lib/services/security.service";
import { securityCronService } from "./lib/services/security-cron.service";
import { initializeDeploymentWebSocket } from "./lib/services/deployment-websocket.service";
import { syncPinnedProjects } from "./lib/services/github-pinned.service";
import { startWorldModelMaintenanceScheduler } from "./lib/services/world-model-maintenance.service";
import { initializeTelemetryWebSocket } from "./lib/services/telemetry-websocket.service";
import { initializeSecurityWebSocket } from "./lib/services/security-websocket.service";
import { initializeTeamActivityWebSocket } from "./lib/services/team-activity.websocket";
import { initializeAIWebSocket } from "./lib/services/ai-websocket.service";
dotenv.config();

// Enforce environment validation at startup
validateEnv();

export function createServer() {
  const app = express();
  
  // Lazy infrastructure initialization for Firebase Functions (Invariant #3)
  app.use((req, res, next) => {
    const isFirebaseFunction = process.env.FUNCTIONS_EMULATOR === "true" || !!process.env.FUNCTION_TARGET;
    if (isFirebaseFunction) {
      initializeInfrastructure().catch(console.error);
    }
    next();
  });
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for local development / Vite
    crossOriginEmbedderPolicy: false,
  }));

  // Trust reverse proxy (Cloud Run, Firebase Hosting, Google Cloud Load Balancer)
  app.set("trust proxy", 1);

  if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
    initializeSentry(app);
  }

  if (process.env.NODE_ENV === "production") {
    applyProductionSecurity(app);
  } else {
    app.use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
      })
    );
  }

  app.set("json replacer", (_key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );

  app.use(
    express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        (req ).rawBody = Buffer.from(buf);
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());
  app.use(requestContext);
  app.use(requestLogger);
  app.use("/uploads", express.static("uploads"));

  app.get("/health", handleHealthCheck);
  app.get("/health/ready", handleReadinessCheck);
  app.get("/health/live", handleLivenessCheck);
  app.get("/health/metrics", handleMetrics);

  app.use("/api/demo", handleDemo);
  app.use("/api/chat", handleChat);

  // Mock auth is only selectable when explicitly enabled or when Firebase is
  // not configured in a non-production environment. It must never be reachable
  // in production: the mock router signs tokens the auth middleware accepts.
  const useMockAuth =
    process.env.USE_MOCK_AUTH === "true" ||
    (process.env.USE_MOCK_AUTH !== "false" &&
      process.env.NODE_ENV !== "production" &&
      !isFirebaseAdminConfigured());
  app.use("/api/auth", useMockAuth ? mockAuthRoutes : authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/usage", usageRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/subscriptions", subscriptionRoutes);
  app.use("/api/paystack", paystackRoutes);

  app.use("/api/ai", aiRoutes);
  app.use("/api/devops", devopsRoutes);
  app.use("/api/security", securityRoutes);
  app.use("/api/teams", teamRoutes);
  app.use("/api/admin", adminRoutes);

  app.use("/api/world-model", worldModelRoutes);
  app.use("/api/world-model/omni-command", omniCommandRoutes);
  // Canonical WorldModelEvent SSE telemetry stream for the Feex Sovereign Engine HUD.
  // Mounted as a dedicated sub-router so it is reachable without auth and never
  // blocked by the blanket marketing middleware (same pattern as /omni-command).
  app.use("/api/world-model/telemetry", worldModelTelemetryStreamRoutes);
  // Mount sub-routers BEFORE the /api/marketing router: Express runs middleware
  // in registration order, and marketingRoutes applies a blanket authMiddleware
  // at the /api/marketing prefix. Mounting the sub-paths first keeps them
  // reachable (public ingestion for telemetry, dedicated auth for intelligence)
  // instead of being shadowed by that blanket middleware.
  app.use("/api/marketing/telemetry", marketingTelemetryRoutes);
  app.use("/api/marketing/intelligence", marketingIntelligenceRoutes);
  app.use("/api/marketing", marketingRoutes);
  app.use("/api/ai-agents", aiAgentsRoutes);
  app.use("/api/errors", errorReportingRoutes);

  // API documentation — available in dev always, in prod only if ENABLE_DOCS=true
  // Accessible at GET /api/docs  (Swagger UI)
  //              GET /api/docs/spec.json  (raw OpenAPI JSON)
  setupSwagger(app);

  if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
    setupSentryErrorHandler(app);
  }

  app.get("/api/ping", (_req, res) =>
    res.json({
      message: "Hello from FeexSystems Living Intelligence Platform!",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      ecosystem: "FEEXSYSTEMS",
    })
  );

  if (process.env.NODE_ENV === "production") {
    const spaPath = path.resolve(process.cwd(), "dist", "spa");
    app.use(express.static(spaPath));
    app.use((req, res, next) => {
      if (req.originalUrl.startsWith("/api/")) return next();
      res.sendFile(path.join(spaPath, "index.html"));
    });
  }

  app.use("/api", (_req, res) =>
    res.status(404).json({
      success: false,
      error: {
        type: "NOT_FOUND_ERROR",
        message: "API endpoint not found",
        code: "API_ENDPOINT_NOT_FOUND",
        timestamp: new Date().toISOString(),
      },
    })
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createServer();

export const api = onRequest({ cors: true, region: "us-central1", invoker: "public" }, app);

let isInfrastructureInitialized = false;

export async function initializeInfrastructure() {
  if (isInfrastructureInitialized) return;
  isInfrastructureInitialized = true;
  
  logger.info("Initializing infrastructure...");
  try {
    connectDatabase().catch((err) => {
      logger.warn("Database connection deferred during startup", { reason: err instanceof Error ? err.message : err });
    });

    syncPinnedProjects()
      .then((projects) => logger.info(`World Model synchronized pinned GitHub projects`, { count: projects.length }))
      .catch((error) => logger.warn("GitHub World Model sync skipped", { reason: error instanceof Error ? error.message : error }));

    try {
      createRedisClient();
    } catch (err) {
      logger.warn("Redis initialization deferred", { reason: err instanceof Error ? err.message : err });
    }

    aiService.initialize().catch((err) => logger.warn("AI Service init deferred", { reason: err }));
    securityService.initialize().catch((err) => logger.warn("Security Service init deferred", { reason: err }));
    securityCronService.initialize().catch((err) => logger.warn("Security Cron init deferred", { reason: err }));

    try {
      startWorldModelMaintenanceScheduler();
    } catch (e) {
      logger.warn("World Model maintenance scheduler skipped", { reason: e });
    }

    // Non-blocking APM initialization (invariant #3)
    setImmediate(() => {
      try { monitoringService.initialize(); } catch (e2) { /* graceful degradation */ }
    });

    logger.info("Infrastructure initialized successfully");
  } catch (error) {
    logger.error("Infrastructure initialization failed", { error });
    throw error;
  }
}

export async function startServer() {
  const port = process.env.PORT || 3001;
  await initializeInfrastructure();
  const httpServer = createHttpServer(app);
  try {
    initializeDeploymentWebSocket(httpServer);
    initializeTelemetryWebSocket(httpServer);
    initializeSecurityWebSocket(httpServer);
    initializeTeamActivityWebSocket(httpServer);
    initializeAIWebSocket(httpServer);
  } catch (wsErr) {
    console.warn("⚠️ WebSocket deployment/telemetry init skipped:", wsErr);
  }
  httpServer.listen(port, () => {
    logger.info(`Server running`, { port, env: process.env.NODE_ENV });
    logger.info(`Health check: http://localhost:${port}/health`);
    logger.info(`API ping: http://localhost:${port}/api/ping`);
    logger.info(`World Model API: http://localhost:${port}/api/world-model/projects`);
    logger.info(`Omni-Command: http://localhost:${port}/api/world-model/omni-command`);
  });
  return httpServer;
}

// Detect whether this module was executed directly (e.g. `node dist/server/index.js`)
// rather than imported (e.g. by the Vite dev middleware or a test).
// Comparing import.meta.url to a hand-built `file://` string is unreliable on
// Windows because import.meta.url is URL-encoded (spaces -> %20) and uses three
// slashes, while process.argv[1] is a raw OS path. fileURLToPath + path.resolve
// normalizes both sides into comparable filesystem paths.
function isMainModule() {
  if (
    process.env.FUNCTION_TARGET ||
    process.env.K_SERVICE ||
    process.env.FIREBASE_CONFIG ||
    process.env.FUNCTIONS_EMULATOR ||
    process.env.X_GOOGLE_ENTRY_POINT
  ) {
    return false;
  }
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return path.resolve(fileURLToPath(import.meta.url)) === path.resolve(entry);
  } catch (e3) {
    return false;
  }
}

if (isMainModule()) {
  startServer().catch(console.error);

  const gracefulShutdown = async () => {
    logger.info("SIGTERM/SIGINT received. Shutting down gracefully...");
    await disconnectDatabase();
    await disconnectRedis();
    process.exit(0);
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}
