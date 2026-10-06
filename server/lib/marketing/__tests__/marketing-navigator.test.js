 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Unit tests for the Phase 6 Marketing Navigator service.
 * Mocks retrieval, intelligence engines, and the provider-neutral aiGateway.
 * The navigator must never touch a live DB or a real LLM provider here.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock retrieval -------------------------------------------------------
vi.mock("../marketing-hybrid-retrieval.service", () => {
  class MockRetrieval {constructor() { MockRetrieval.prototype.__init.call(this);MockRetrieval.prototype.__init2.call(this);MockRetrieval.prototype.__init3.call(this); }
    __init() {this.searchClaims = vi.fn().mockResolvedValue([])}
    __init2() {this.searchContent = vi.fn().mockResolvedValue([])}
    __init3() {this.searchCampaigns = vi.fn().mockResolvedValue([])}
  }
  return { MarketingHybridRetrievalService: MockRetrieval };
});

// --- Mock intelligence engines --------------------------------------------
vi.mock("../gap-engine.service", () => ({
  detectContentGaps: vi.fn(),
}));
vi.mock("../decay-engine.service", () => ({
  detectContentDecay: vi.fn(),
}));
vi.mock("../opportunity-engine.service", () => ({
  detectOpportunities: vi.fn(),
}));

// --- Mock aiGateway ---------------------------------------------------------
vi.mock("../../services/ai-gateway.service", () => ({
  aiGateway: {
    generateObject: vi.fn(),
  },
}));

// Avoid a live Prisma connection in unit tests (default import in service).
vi.mock("../../database", () => ({
  prisma: {},
}));

import { MarketingNavigatorService } from "../marketing-navigator.service";

import { detectContentGaps } from "../gap-engine.service";
import { detectContentDecay } from "../decay-engine.service";
import { detectOpportunities } from "../opportunity-engine.service";
import { aiGateway } from "../../services/ai-gateway.service";
import {
  MarketingNavigatorQuerySchema,
  MarketingNavigatorAnswerSchema,
} from "../../../../shared/marketing-contracts";

function retrievalInstance(service) {
  return (service ).retrieval;
}

const baseClaim = {
  id: "claim_1",
  statement: "Vyra AI processes documents 10x faster",
  productId: "prod_1",
  _semanticScore: 0.91,
  product: { id: "prod_1", name: "Vyra AI" },
  evidence: [
    {
      id: "link_1",
      worldModelEvidence: {
        id: "wm_ev_1",
        sourceUrl: "https://github.com/FeexSystems/vyra/commit/abc123",
        sourceRef: "abc123",
        observedAt: new Date("2026-01-15T00:00:00.000Z"),
      },
      marketingEvidence: null,
    },
  ],
  aboutLinks: [],
};

const baseAsset = {
  id: "asset_1",
  title: "Vyra AI Launch Blog",
  type: "BLOG",
  state: "PUBLISHED",
  _semanticScore: 0.88,
};

const baseCampaign = {
  id: "camp_1",
  name: "Vyra Spring Launch",
  description: "Launch campaign",
  _semanticScore: 0.85,
  products: [{ id: "link", product: { id: "prod_1", name: "Vyra AI" } }],
};

describe("MarketingNavigatorService", () => {
  let service;
  let retrieval;

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-stub default engine/gateway behavior after clearAllMocks
    vi.mocked(detectContentGaps).mockResolvedValue([]);
    vi.mocked(detectContentDecay).mockResolvedValue([]);
    vi.mocked(detectOpportunities).mockResolvedValue([]);
    vi.mocked(aiGateway.generateObject).mockResolvedValue(null);

    service = new MarketingNavigatorService({} );
    retrieval = retrievalInstance(service);
    retrieval.searchClaims.mockResolvedValue([]);
    retrieval.searchContent.mockResolvedValue([]);
    retrieval.searchCampaigns.mockResolvedValue([]);
  });

  describe("buildContext", () => {
    it("retrieves claims, content and campaigns in parallel", async () => {
      retrieval.searchClaims.mockResolvedValue([baseClaim]);
      retrieval.searchContent.mockResolvedValue([baseAsset]);
      retrieval.searchCampaigns.mockResolvedValue([baseCampaign]);

      const ctx = await service.buildContext("vyra");

      expect(ctx.claims).toHaveLength(1);
      expect(ctx.contentAssets).toHaveLength(1);
      expect(ctx.campaigns).toHaveLength(1);
      // campaigns are no longer an empty array (the stub bug this fixes)
      expect(ctx.campaigns[0].name).toBe("Vyra Spring Launch");
    });

    it("scopes claims by productId when provided", async () => {
      retrieval.searchClaims.mockResolvedValue([
        baseClaim,
        { ...baseClaim, id: "claim_2", productId: "prod_2" },
      ]);

      const ctx = await service.buildContext("vyra", { productId: "prod_1" });

      expect(ctx.claims).toHaveLength(1);
      expect(ctx.claims[0].productId).toBe("prod_1");
    });
  });

  describe("answer", () => {
    it("returns template prose with grounded=false when aiGateway returns null", async () => {
      retrieval.searchClaims.mockResolvedValue([baseClaim]);
      retrieval.searchContent.mockResolvedValue([baseAsset]);
      retrieval.searchCampaigns.mockResolvedValue([baseCampaign]);

      const answer = await service.answer("vyra reliability");

      expect(answer.version).toBe("1.0");
      expect(answer.grounded).toBe(false);
      expect(answer.provider).toBe("template");
      expect(answer.answer).toContain("Vyra AI processes documents 10x faster");
      expect(answer.answer).toContain("Vyra Spring Launch");
      // Claims carry evidence counts from hydrated provenance
      expect(answer.claims[0].evidenceCount).toBe(1);
      expect(answer.claims[0].confidence).toBeCloseTo(0.91);
      expect(answer.contentAssets[0].title).toBe("Vyra AI Launch Blog");
      expect(answer.campaigns[0].name).toBe("Vyra Spring Launch");

      const parsed = MarketingNavigatorAnswerSchema.safeParse(answer);
      expect(parsed.success).toBe(true);
    });

    it("returns grounded=true with provider name when gateway returns an object", async () => {
      retrieval.searchClaims.mockResolvedValue([baseClaim]);

      vi.mocked(aiGateway.generateObject).mockResolvedValue({
        object: { answer: "Vyra AI's speed claim is backed by one commit-sha evidence link." },
        provider: "gemini",
        model: "gemini-2.0-flash",
      } );

      const answer = await service.answer("vyra reliability");

      expect(answer.grounded).toBe(true);
      expect(answer.provider).toBe("gemini");
      expect(answer.answer).toContain("commit-sha evidence");
      // LLM prose must not replace canonical retrieved records
      expect(answer.claims).toHaveLength(1);
      expect(answer.campaigns).toHaveLength(0);
    });

    it("ignores empty gateway answers and falls back to the template", async () => {
      vi.mocked(aiGateway.generateObject).mockResolvedValue({
        object: { answer: "   " },
        provider: "openai",
        model: "gpt-4o-mini",
      } );

      const answer = await service.answer("anything");

      expect(answer.grounded).toBe(false);
      expect(answer.provider).toBe("template");
    });

    it("returns a graceful empty-state answer when retrieval finds nothing", async () => {
      const answer = await service.answer("totally unknown topic");

      expect(answer.claims).toHaveLength(0);
      expect(answer.contentAssets).toHaveLength(0);
      expect(answer.campaigns).toHaveLength(0);
      expect(answer.answer).toContain("No grounded marketing records");
    });
  });

  describe("recommendations", () => {
    beforeEach(() => {
      retrieval.searchClaims.mockResolvedValue([baseClaim]);
    });

    it("maps engine outputs to correct kinds with graphPath ≥1 node", async () => {
      // Retrieve an unrelated asset so decay scoping is exercised:
      // asset_1 decay must be filtered out because only asset_9 was retrieved.
      retrieval.searchContent.mockResolvedValue([
        { ...baseAsset, id: "asset_9", title: "Unrelated asset" },
      ]);
      vi.mocked(detectContentGaps).mockResolvedValue([
        {
          productId: "prod_1",
          productName: "Vyra AI",
          projectId: null,
          featuresCount: 4,
          gapScore: 0.8,
        },
      ]);
      vi.mocked(detectContentDecay).mockResolvedValue([
        { assetId: "asset_1", title: "Old Blog", daysSinceLastEvent: 90, decayScore: 1 },
      ]);
      vi.mocked(detectOpportunities).mockResolvedValue([
        {
          projectId: "proj_1",
          eventName: "release",
          reason: "Recent release without marketing assets",
          priorityScore: 0.9,
        },
      ]);

      const recs = await service.recommendations("vyra");

      const kinds = recs.map((r) => r.kind);
      expect(kinds).toContain("CONTENT_GAP");
      expect(kinds).toContain("OPPORTUNITY");

      for (const rec of recs) {
        expect(rec.graphPath.length).toBeGreaterThanOrEqual(1);
        expect(rec.confidence).toBeGreaterThanOrEqual(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
      }

      const gap = recs.find((r) => r.kind === "CONTENT_GAP");
      expect(gap.graphPath[0].type).toBe("PRODUCT");
      expect(gap.graphPath[0].id).toBe("prod_1");
      // Gap rec for prod_1 is hydrated with sibling claim evidence anchors
      expect(gap.evidence.length).toBeGreaterThanOrEqual(1);
      expect(gap.evidence[0].sourceUrl).toContain("github.com");
      expect(gap.evidence[0].observedAt).toBe("2026-01-15T00:00:00.000Z");

      // Decay only fires when the asset was retrieved (assetIds filter) — asset_1
      // was not retrieved here, so no CONTENT_DECAY rec is expected.
      expect(kinds).not.toContain("CONTENT_DECAY");
    });

    it("creates EVIDENCE_REFRESH recs for claims without evidence", async () => {
      retrieval.searchClaims.mockResolvedValue([
        { ...baseClaim, id: "claim_2", evidence: [] },
      ]);

      const recs = await service.recommendations("unbacked claim");

      const refresh = recs.find((r) => r.kind === "EVIDENCE_REFRESH");
      expect(refresh).toBeDefined();
      // graphPath: product → claim (both nodes present)
      expect(refresh.graphPath.map((n) => n.type)).toContain("CLAIM");
      expect(refresh.graphPath.length).toBeGreaterThanOrEqual(1);
    });

    it("is capped at 10 recommendations", async () => {
      const manyGaps = Array.from({ length: 15 }, (_, i) => ({
        productId: `prod_${i}`,
        productName: `Product ${i}`,
        projectId: null,
        featuresCount: 5,
        gapScore: 0.5,
      }));
      vi.mocked(detectContentGaps).mockResolvedValue(manyGaps );

      const recs = await service.recommendations("everything");
      expect(recs.length).toBeLessThanOrEqual(10);
    });
  });

  describe("exploreMarketingGraph (deprecated wrapper)", () => {
    it("delegates to buildContext and includes campaigns", async () => {
      retrieval.searchCampaigns.mockResolvedValue([baseCampaign]);

      const ctx = await (service ).exploreMarketingGraph("vyra");
      expect(ctx.campaigns).toHaveLength(1);
      expect(ctx.claims).toHaveLength(0);
    });
  });

  describe("contract validation", () => {
    it("rejects empty queries via Zod", () => {
      const parsed = MarketingNavigatorQuerySchema.safeParse({ q: "" });
      expect(parsed.success).toBe(false);
    });

    it("coerces limit and enforces bounds", () => {
      const ok = MarketingNavigatorQuerySchema.safeParse({ q: "vyra", limit: "3" });
      expect(ok.success).toBe(true);
      expect(_optionalChain([ok, 'access', _2 => _2.data, 'optionalAccess', _3 => _3.limit])).toBe(3);

      const tooBig = MarketingNavigatorQuerySchema.safeParse({ q: "vyra", limit: "50" });
      expect(tooBig.success).toBe(false);
    });
  });
});