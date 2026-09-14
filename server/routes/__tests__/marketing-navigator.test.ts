/**
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
    await importOriginal<typeof import("../../lib/marketing/telemetry.service")>();
  return {
    ...actual,
    MarketingTelemetryService: class {
      ingestEvent = vi.fn().mockResolvedValue({ id: "evt_test", eventType: "content.viewed" });
      getEventsByEntity = vi.fn().mockResolvedValue([]);
      getEventStats = vi.fn().mockResolvedValue({});
    },
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
    } as any);
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
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.version).toBe("1.0");
    expect(typeof res.body?.data?.answer).toBe("string");
    expect(Array.isArray(res.body?.data?.claims)).toBe(true);
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
    expect(res.body?.success).toBe(true);
    expect(Array.isArray(res.body?.data)).toBe(true);
    for (const rec of res.body?.data ?? []) {
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