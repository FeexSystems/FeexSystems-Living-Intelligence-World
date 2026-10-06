 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } var _class;/**
 * @vitest-environment node
 * Phase 6 Marketing Navigator route tests.
 *
 * Modeled on marketing-mount-order.test.ts: the auth mock is REALISTIC
 * (401 without a Bearer token) so we prove the navigator lives INSIDE the
 * auth-gated /api/marketing router without disturbing mount order.
 * The navigator service itself is mocked — no live retrieval/LLM/DB.
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

// Mock the navigator service — routes must delegate, not re-implement.
vi.mock("../../lib/marketing/marketing-navigator.service", () => ({
  marketingNavigator: {
    answer: vi.fn().mockResolvedValue({
      version: "1.0",
      query: "vyra",
      answer: "Grounded template answer.",
      grounded: false,
      provider: "template",
      claims: [
        {
          id: "claim_1",
          statement: "Vyra AI is fast",
          confidence: 0.9,
          productId: "prod_1",
          evidenceCount: 2,
        },
      ],
      contentAssets: [],
      campaigns: [],
      recommendations: [
        {
          id: "rec_1",
          kind: "CONTENT_GAP",
          title: "Close the content gap on Vyra AI",
          rationale: "No assets",
          confidence: 0.8,
          graphPath: [{ id: "prod_1", type: "PRODUCT", label: "Vyra AI" }],
          evidence: [],
        },
      ],
      suggestions: [],
    }),
    recommendations: vi.fn().mockResolvedValue([
      {
        id: "rec_1",
        kind: "CONTENT_GAP",
        title: "Close the content gap on Vyra AI",
        rationale: "No assets",
        confidence: 0.8,
        graphPath: [{ id: "prod_1", type: "PRODUCT", label: "Vyra AI" }],
        evidence: [],
      },
    ]),
  },
}));

// Keep mount-order-relevant deps hermetic (same as mount-order tests).
vi.mock("../../lib/marketing/opportunity-engine.service", () => ({
  detectOpportunities: vi.fn().mockResolvedValue([]),
  createRecyclingStub: vi.fn().mockResolvedValue("stub_test_id"),
}));

vi.mock("../../lib/marketing/telemetry.service", async (importOriginal) => {
  const actual =
    await importOriginal();
  return {
    ...actual,
    MarketingTelemetryService: (_class = class {constructor() { _class.prototype.__init.call(this);_class.prototype.__init2.call(this);_class.prototype.__init3.call(this); }
      __init() {this.ingestEvent = vi.fn().mockResolvedValue({ id: "evt_test", eventType: "content.viewed" })}
      __init2() {this.getEventsByEntity = vi.fn().mockResolvedValue([])}
      __init3() {this.getEventStats = vi.fn().mockResolvedValue({})}
    }, _class),
  };
});

import { marketingNavigator } from "../../lib/marketing/marketing-navigator.service";

describe("GET /api/marketing/navigator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply default resolved values after clearAllMocks
    vi.mocked(marketingNavigator.answer).mockResolvedValue({
      version: "1.0",
      query: "vyra",
      answer: "Grounded template answer.",
      grounded: false,
      provider: "template",
      claims: [],
      contentAssets: [],
      campaigns: [],
      recommendations: [],
      suggestions: [],
    } );
    vi.mocked(marketingNavigator.recommendations).mockResolvedValue([]);
  });

  it("rejects anonymous requests (auth-gated inside the marketing router)", async () => {
    const res = await request(app).get("/api/marketing/navigator?q=vyra");
    expect(res.status).toBe(401);
    expect(marketingNavigator.answer).not.toHaveBeenCalled();
  });

  it("returns a versioned grounded answer when authenticated", async () => {
    const res = await request(app)
      .get("/api/marketing/navigator?q=vyra")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(_optionalChain([res, 'access', _ => _.body, 'optionalAccess', _2 => _2.success])).toBe(true);
    expect(_optionalChain([res, 'access', _3 => _3.body, 'optionalAccess', _4 => _4.data, 'optionalAccess', _5 => _5.version])).toBe("1.0");
    expect(typeof _optionalChain([res, 'access', _6 => _6.body, 'optionalAccess', _7 => _7.data, 'optionalAccess', _8 => _8.answer])).toBe("string");
    expect(Array.isArray(_optionalChain([res, 'access', _9 => _9.body, 'optionalAccess', _10 => _10.data, 'optionalAccess', _11 => _11.claims]))).toBe(true);
    expect(marketingNavigator.answer).toHaveBeenCalledWith("vyra", expect.objectContaining({ q: "vyra" }));
  });

  it("returns 400 when q is missing", async () => {
    const res = await request(app)
      .get("/api/marketing/navigator")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(400);
    expect(marketingNavigator.answer).not.toHaveBeenCalled();
  });
});

describe("GET /api/marketing/navigator/recommendations", () => {
  it("rejects anonymous requests", async () => {
    const res = await request(app).get("/api/marketing/navigator/recommendations?q=vyra");
    expect(res.status).toBe(401);
  });

  it("returns explainable recommendations when authenticated", async () => {
    const res = await request(app)
      .get("/api/marketing/navigator/recommendations?q=vyra")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(_optionalChain([res, 'access', _12 => _12.body, 'optionalAccess', _13 => _13.success])).toBe(true);
    expect(Array.isArray(_optionalChain([res, 'access', _14 => _14.body, 'optionalAccess', _15 => _15.data]))).toBe(true);
    for (const rec of _nullishCoalesce(_optionalChain([res, 'access', _16 => _16.body, 'optionalAccess', _17 => _17.data]), () => ( []))) {
      expect(rec.graphPath.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("returns 400 when q is missing", async () => {
    const res = await request(app)
      .get("/api/marketing/navigator/recommendations")
      .set("Authorization", "Bearer test-token");
    expect(res.status).toBe(400);
  });
});