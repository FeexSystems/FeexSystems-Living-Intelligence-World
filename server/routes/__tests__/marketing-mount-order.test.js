 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } var _class;/**
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
    await importOriginal();
  return {
    ...actual,
    authMiddleware: async (req, res, next) => {
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
    requireAdmin: (req, res, next) => next(),
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
    await importOriginal();
  return {
    ...actual,
    MarketingTelemetryService: (_class = class {constructor() { _class.prototype.__init.call(this);_class.prototype.__init2.call(this);_class.prototype.__init3.call(this); }
      __init() {this.ingestEvent = vi.fn().mockResolvedValue({
        id: "evt_test",
        eventType: "content.viewed",
      })}
      __init2() {this.getEventsByEntity = vi.fn().mockResolvedValue([])}
      __init3() {this.getEventStats = vi.fn().mockResolvedValue({})}
    }, _class),
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
    expect(_optionalChain([res, 'access', _ => _.body, 'optionalAccess', _2 => _2.success])).toBe(true);
    expect(Array.isArray(_optionalChain([res, 'access', _3 => _3.body, 'optionalAccess', _4 => _4.data]))).toBe(true);
  });

  it("rejects anonymous requests to the intelligence sub-router", async () => {
    const res = await request(app).get("/api/marketing/intelligence/gaps");
    expect(res.status).toBe(401);
  });
});
