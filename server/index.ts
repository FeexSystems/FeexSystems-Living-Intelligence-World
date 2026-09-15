import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { createServer as createHttpServer } from "http";
import { initializeSentry, setupSentryErrorHandler } from "./lib/logging/sentry";
import { validateEnv } from "./lib/config/validate-env";
import { applyProductionSecurity } from "./lib/middleware/production-security";
import { handleDemo } from "./routes/demo";
import { handleChat } from "./routes/chat";
import { handleHealthCheck, handleReadinessCheck, handleLivenessCheck } from "./routes/health";
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
import omniCommandRoutes from "./routes/omni-command";
import marketingRoutes from "./routes/marketing";
import aiAgentsRoutes from "./routes/ai-agents";
import { connectDatabase } from "./lib/database";
import { createRedisClient } from "./lib/redis";
import { aiService } from "./lib/services/ai.service";
import { securityService } from "./lib/services/security.service";
import { securityCronService } from "./lib/services/security-cron.service";
import { initializeDeploymentWebSocket } from "./lib/services/deployment-websocket.service";
import { syncPinnedProjects } from "./lib/services/github-pinned.service";
import { startWorldModelMaintenanceScheduler } from "./lib/services/world-model-maintenance.service";

dotenv.config();

try {
  validateEnv();
} catch (envError) {
  console.warn("⚠️ Environment validation warning:", envError instanceof Error ? envError.message : envError);
}

export function createServer(): express.Application {
  const app = express();

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

  app.set("json replacer", (key: string, value: unknown) =>
    typeof value === "bigint" ? value.toString() : value
  );

  app.use(
    express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use("/uploads", express.static("uploads"));

  app.get("/health", handleHealthCheck);
  app.get("/health/ready", handleReadinessCheck);
  app.get("/health/live", handleLivenessCheck);

  app.use("/api/demo", handleDemo);
  app.use("/api/chat", handleChat);

  const useMockAuth = process.env.USE_MOCK_AUTH === "true";
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
  app.use("/api/marketing", marketingRoutes);
  app.use("/api/ai-agents", aiAgentsRoutes);

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

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", error);
    res.status(500).json({
      success: false,
      error: {
        type: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      },
    });
  });

  return app;
}

export const app = createServer();

export async function initializeInfrastructure() {
  console.log("🚀 Initializing infrastructure...");
  try {
    await connectDatabase().catch((err) => {
      console.warn("⚠️ Database connection non-fatal warning during startup:", err instanceof Error ? err.message : err);
    });

    try {
      const projects = await syncPinnedProjects();
      console.log(`🌐 World Model synchronized ${projects.length} pinned GitHub projects`);
    } catch (error) {
      console.warn("⚠️ GitHub World Model synchronization skipped:", error instanceof Error ? error.message : error);
    }

    try {
      createRedisClient();
    } catch (err) {
      console.warn("⚠️ Redis initialization deferred:", err instanceof Error ? err.message : err);
    }

    await aiService.initialize().catch((err) => console.warn("⚠️ AI Service init deferred:", err));
    await securityService.initialize().catch((err) => console.warn("⚠️ Security Service init deferred:", err));
    await securityCronService.initialize().catch((err) => console.warn("⚠️ Security Cron Service init deferred:", err));

    try {
      startWorldModelMaintenanceScheduler();
    } catch (e) {
      console.warn("⚠️ World Model maintenance scheduler skipped:", e);
    }

    console.log("✅ Infrastructure initialized successfully");
  } catch (error) {
    console.error("❌ Infrastructure initialization failed:", error);
    throw error;
  }
}

export async function startServer() {
  const port = process.env.PORT || 3001;
  await initializeInfrastructure();
  const httpServer = createHttpServer(app);
  try {
    initializeDeploymentWebSocket(httpServer);
  } catch (wsErr) {
    console.warn("⚠️ WebSocket deployment init skipped:", wsErr);
  }
  httpServer.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🔗 API ping: http://localhost:${port}/api/ping`);
    console.log(`🌐 World Model API: http://localhost:${port}/api/world-model/projects`);
    console.log(`🎛️  Omni-Command: http://localhost:${port}/api/world-model/omni-command`);
  });
  return httpServer;
}

const isMainModule = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`;
if (isMainModule) {
  startServer().catch(console.error);
}
