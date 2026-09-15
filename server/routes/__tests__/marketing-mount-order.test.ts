/**
 * @vitest-environment node
 * Router mount-order regression tests.
 *
 * Background: server/routes/marketing.ts applies a blanket `router.use(authMiddleware)`
 * at the /api/marketing prefix. If that router is mounted BEFORE the telemetry
 * sub-router, every `/api/marketing/telemetry/*` request is auth-gated and public
 * ingestion breaks silently.
 *
 * The auth mock is deliberately REALISTIC — it rejects requests without an
 * Authorization header (401), like the real middleware. A mock that always called
 * next() would make these pass regardless of mount order, i.e. miss the bug.
 */
import request from "supertest";
import { createServer } from "../../index";

const app = createServer();

// Realistic auth mock: 401 without a Bearer token, pass through with one.
vi.mock("../../lib/middleware/auth.middleware", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/middleware/auth.middleware")>();
  return {
    ...actual,
    authMiddleware: async (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      req.user = {
        id: "test-user-id",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "USER",
      };
      next();
    },
    requireAdmin: (req: any, res: any, next: any) => next(),
  };
});

// Avoid a live DB dependency in the reachability tests.
vi.mock("../../lib/marketing/opportunity-engine.service", () => ({
  detectOpportunities: vi.fn().mockResolvedValue([]),
  createRecyclingStub: vi.fn().mockResolvedValue("stub_test_id"),
}));

// Avoid touching a real telemetry store in the reachability tests.
vi.mock("../../lib/marketing/telemetry.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/marketing/telemetry.service")>();
  return {
    ...actual,
    MarketingTelemetryService: class {
      ingestEvent = vi.fn().mockResolvedValue({
        id: "evt_test",
        eventType: "content.viewed",
      });
      getEventsByEntity = vi.fn().mockResolvedValue([]);
      getEventStats = vi.fn().mockResolvedValue({});
    },
  };
});

describe("marketing router mount order", () => {
  it("lets anonymous telemetry ingestion through (not shadowed by auth)", async () => {
    const res = await request(app)
      .post("/api/marketing/telemetry/events")
      .send({ eventType: "content.viewed", metadata: {} });

    // 401 = the auth-gated /api/marketing router captured the request before the
    // telemetry sub-router. That is the regression this test guards against.
    expect(res.status).not.toBe(401);
    expect([201, 400]).toContain(res.status);
  });

  it("still rejects anonymous requests to the auth-protected marketing CRUD", async () => {
    const res = await request(app).get("/api/marketing/products");

    // Proves the mock is realistic and the blanket auth is genuinely active.
    expect(res.status).toBe(401);
  });

  it("reaches the intelligence sub-router when authenticated", async () => {
    const res = await request(app)
      .get("/api/marketing/intelligence/opportunities")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(Array.isArray(res.body?.data)).toBe(true);
  });

  it("rejects anonymous requests to the intelligence sub-router", async () => {
    const res = await request(app).get("/api/marketing/intelligence/gaps");
    expect(res.status).toBe(401);
  });
});
