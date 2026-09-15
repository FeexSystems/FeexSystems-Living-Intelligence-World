# Implementation Plan

[Overview]
Deliver Phase 6 of the Advanced Marketing Intelligence System: a fully grounded Marketing Navigator that answers natural-language marketing questions with explainable, evidence-backed recommendations.

The Advanced Marketing Intelligence contract (`docs/FEEXSYSTEMS-ADVANCED-MARKETING-INTELLIGENCE-SYSTEM.md`, capabilities 01–53, accepted via PR #19) defines a locked delivery sequence. Phases 1–3 (Marketing Schema, Evidence + Claim Graph, Telemetry), Phase 5 (pgvector + hybrid retrieval), Phase 7 (GitHub → Marketing) and Phases 8–9 (Gap/Decay/Opportunity engines, Campaign + Experimentation) are already implemented and unit-tested under `server/lib/marketing/` and exposed through `/api/marketing*` routes. However, Phase 6 — the Marketing Navigator — is currently a stub: `server/lib/marketing/marketing-navigator.service.ts` returns claims and content assets with an empty campaigns array, has no HTTP surface of its own, produces no explainable recommendations, and does not use the provider-neutral LLM abstraction. It is only reachable indirectly as a data provider inside the Omni-Command service.

This implementation closes Phase 6 in a way that satisfies the contract's Definition of Done: "Navigator can answer grounded marketing questions" and "recommendations expose evidence and graph paths". The approach reuses the existing, tested building blocks rather than introducing new stores: `MarketingHybridRetrievalService` (semantic claim/content search with provenance hydration), `ClaimGraphService` (claim neighborhoods, evidence traversal), the intelligence engines (`detectContentGaps`, `detectContentDecay`, `detectOpportunities`), and the provider-neutral `aiGateway` / `generateGroundedAnswer` path already used by Omni-Command. A new authenticated HTTP surface `GET /api/marketing/navigator` exposes the capability, a typed Zod contract in `shared/marketing-contracts.ts` makes the response schema explicit and versioned, the Omni-Command service is upgraded to consume the richer navigator context (including campaigns and recommendations), and the client Navigator surface gains a grounded marketing view. All principles are respected: the World Model owns reality (the LLM only interprets retrieved records), every answer carries evidence anchors, every search result is hydrated with full provenance, and the LLM path is provider-neutral with a deterministic template fallback when no provider keys are configured.

## Phase 6 status (2026-09-14) — DONE, verified green
- Contracts (`MarketingNavigatorQuerySchema`, `NavigatorRecommendationSchema`, `MarketingNavigatorAnswerSchema`) in `shared/marketing-contracts.ts`.
- `searchCampaigns` on `MarketingHybridRetrievalService` (semantic campaign search + product hydration).
- `MarketingNavigatorService` rewritten (`buildContext`, `answer`, `recommendations`, `formatGroundedContext`, `buildTemplateAnswer`, `buildSuggestions`, deprecated `exploreMarketingGraph` wrapper).
- `GET /api/marketing/navigator` + `GET /api/marketing/navigator/recommendations` (auth-gated, Zod-validated, `{data, success:true}`).
- Omni-Command consumes `buildContext` + `formatGroundedContext` (claims/assets/campaigns/top-3 recs).
- Client `Navigator.tsx` marketing grounded view via `apiClient.get('/marketing/navigator?q=…')` with evidence anchors + graph paths.
- Tests: 12 service + 6 route + mount-order green; `npm run typecheck` clean; full marketing suite 38 passed / 3 skipped (pgvector-gated skips).
- Incidental fix: removed non-schema `metadata` write in `content-os.service.ts` (only tsc failure).

[Types]
Single sentence: extend `shared/marketing-contracts.ts` with a versioned Zod contract for navigator queries and grounded answers/recommendations.

```ts
// --- shared/marketing-contracts.ts (append) ---

/** Query contract — mirrors existing navigator query style (`?q=<query>`). */
export const MarketingNavigatorQuerySchema = z.object({
  q: z.string().min(1).max(500),
  /** Optional product scoping for focused answers. */
  productId: z.string().optional(),
  /** Max retrieved items per category (claims/content/campaigns). Default 5, max 20. */
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export type MarketingNavigatorQuery = z.infer<typeof MarketingNavigatorQuerySchema>;

/** A recommendation produced from grounded signals — never invented by the LLM. */
export const NavigatorRecommendationSchema = z.object({
  id: z.string(),
  kind: z.enum(["CONTENT_GAP", "CONTENT_DECAY", "OPPORTUNITY", "EVIDENCE_REFRESH", "NEXT_ACTION"]),
  title: z.string().max(300),
  rationale: z.string().max(2000),
  confidence: z.number().min(0).max(1),
  /** Ordered entity path explaining WHY (e.g. product → feature → claim → evidence). */
  graphPath: z.array(z.object({
    id: z.string(),
    type: z.string().max(60),
    label: z.string().max(300),
  })).min(1),
  /** Evidence anchors backing the recommendation (repo url, sha, source url). */
  evidence: z.array(z.object({
    id: z.string(),
    sourceUrl: z.string().url().optional(),
    sourceRef: z.string().max(300).optional(),
    observedAt: z.string().datetime().optional(),
  })).default([]),
});
export type NavigatorRecommendation = z.infer<typeof NavigatorRecommendationSchema>;

/** Full grounded answer returned by GET /api/marketing/navigator. */
export const MarketingNavigatorAnswerSchema = z.object({
  version: z.literal("1.0"),
  query: z.string(),
  answer: z.string(),                       // grounded prose (LLM-interpreted, template fallback)
  grounded: z.boolean(),                    // false when template fallback was used
  provider: z.string().max(60).optional(),  // e.g. "gemini", "openai", "template"
  claims: z.array(z.object({
    id: z.string(),
    statement: z.string(),
    confidence: z.number().optional(),
    productId: z.string().nullable().optional(),
    evidenceCount: z.number().int().min(0),
  })),
  contentAssets: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    state: z.string(),
  })),
  campaigns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
  })),
  recommendations: z.array(NavigatorRecommendationSchema).max(10),
  suggestions: z.array(z.string().max(200)).max(6),
});
export type MarketingNavigatorAnswer = z.infer<typeof MarketingNavigatorAnswerSchema>;
```

Validation rules: material answers always expose `claims`/`contentAssets`/`campaigns` hydrated from the database (never raw LLM output passed off as canonical data); `recommendations[].graphPath` must contain at least one node; `evidence` arrays carry source URLs when available. The existing `CreateClaimSchema` evidence-required rule is untouched.

[Files]
Single sentence: one service rewrite, one retrieval extension, one route addition, one shared-contract extension, one client surface addition, and corresponding new tests — no files deleted.

New files:
- `server/routes/__tests__/marketing-navigator.test.ts` — supertest route tests (auth-gated; realistic auth mock following the `marketing-mount-order.test.ts` pattern; mocks navigator service; asserts 401 anonymous / 200 authenticated / 400 invalid query).
- `server/lib/marketing/__tests__/marketing-navigator.test.ts` — unit tests for `MarketingNavigatorService` with mocked Prisma, retrieval, engines, and `aiGateway` (grounded answer, template fallback, recommendation ordering, empty-result behavior).

Modified files:
- `shared/marketing-contracts.ts` — append the query/answer/recommendation schemas above (no changes to existing exports).
- `server/lib/marketing/marketing-hybrid-retrieval.service.ts` — add `searchCampaigns(query: string, limit?: number)` mirroring `searchClaims`/`searchContent` (semantic hits → hydrate `marketingCampaign` with products) so campaign context is no longer an empty array.
- `server/lib/marketing/marketing-navigator.service.ts` — full rewrite (see [Functions]); keeps exporting `marketingNavigator` singleton so `omni-command.service.ts` import stays valid.
- `server/routes/marketing.ts` — add `GET /navigator` and `GET /navigator/recommendations` inside the existing authenticated router (after the `/graph` sub-router mount); validates `MarketingNavigatorQuerySchema`; returns `MarketingNavigatorAnswer`-shaped JSON.
- `server/lib/services/omni-command.service.ts` — replace the `marketingContext = await marketingNavigator.exploreMarketingGraph(retrievalQuery)` call with `await marketingNavigator.buildContext(retrievalQuery)` (the new shared context builder) so campaigns and top recommendations flow into the grounded summary and CommandCenterShell metadata; keep the reasoning-trace step messages intact.
- `client/pages/Navigator.tsx` — add a "Marketing" grounded-result mode that calls `/api/marketing/navigator?q=…` via `client/lib/api-client.ts` and renders claims (with evidence counts), content assets, campaigns, and recommendation cards exposing `graphPath` and evidence anchors; falls back gracefully when the endpoint errors.

Configuration updates: none (no new env vars; provider-neutral gateway already configured).

[Functions]
Single sentence: rewrite the navigator service around three new public methods plus a shared context builder, extend retrieval with campaign search, and add two thin route handlers.

New functions:
- `MarketingNavigatorService.buildContext(query: string, opts?: { limit?: number; productId?: string }): Promise<{ claims: …[]; contentAssets: …[]; campaigns: …[] }>` — `server/lib/marketing/marketing-navigator.service.ts`; parallel retrieval of claims/content/campaigns; used by both `answer()` and Omni-Command.
- `MarketingNavigatorService.answer(query: string, opts?: MarketingNavigatorQuery): Promise<MarketingNavigatorAnswer>` — orchestrates retrieval, gathers top gap/decay/opportunity signals scoped to retrieved products, builds a grounded summary, calls `aiGateway.generateObject` via a navigator-specific system prompt (only interpretation — canonical facts come from retrieved rows), falls back to a deterministic template answer when the gateway returns nothing; maps engine outputs into `NavigatorRecommendation[]` with `graphPath` built from hydrated relations (product → feature → claim → evidence) and confidence taken from engine scoring/semantic scores.
- `MarketingNavigatorService.recommendations(query: string, opts?): Promise<NavigatorRecommendation[]>` — recommendations only (used by `GET /navigator/recommendations`).
- `MarketingHybridRetrievalService.searchCampaigns(query: string, limit?: number)` — `server/lib/marketing/marketing-hybrid-retrieval.service.ts`; same pattern as `searchClaims`.

Modified functions:
- `marketingNavigator.exploreMarketingGraph(query)` — `server/lib/marketing/marketing-navigator.service.ts`; retained as a thin deprecated wrapper delegating to `buildContext` so the Omni-Command import never breaks mid-refactor (it will be replaced by `buildContext` in the same change, then the wrapper may be removed once no callers remain).
- `executeOmniCommand` — `server/lib/services/omni-command.service.ts`; swap `exploreMarketingGraph` for `buildContext`, and include top 3 recommendation titles in the marketing grounded summary lines (trace step text updated accordingly).

Removed functions: none (public API surface only grows).

[Classes]
Single sentence: one service class is rewritten; no new classes; no classes removed.

- `MarketingNavigatorService` (`server/lib/marketing/marketing-navigator.service.ts`) — rewritten: constructor now accepts an optional `PrismaClient` (defaults to the shared `prisma` import, preserving the exported `marketingNavigator` singleton), composes `MarketingHybridRetrievalService`, `ClaimGraphService`, the three intelligence engines, and `aiGateway`; key methods `buildContext`, `answer`, `recommendations` (details above). All LLM interaction stays behind the provider-neutral gateway — no direct provider calls.
- `MarketingHybridRetrievalService` (`server/lib/marketing/marketing-hybrid-retrieval.service.ts`) — gains `searchCampaigns`; existing methods unchanged.

[Dependencies]
Single sentence: no new package dependencies — the feature uses existing `zod`, `@prisma/client`, Express, the `aiGateway` provider-neutral abstraction, and the existing `similaritySearch` embedding pipeline.

Integration requirements: pgvector embeddings for claims/content must already be indexed by the existing `embedding.service` pipeline (the navigator degrades gracefully to empty retrieval when none exist); no Prisma schema or migration changes are required.

[Testing]
Single sentence: extend the Vitest suite with unit tests for the rewritten service and supertest route tests, then validate with `npm run typecheck` and the full test suite.

- New `server/lib/marketing/__tests__/marketing-navigator.test.ts`: mock `../marketing-hybrid-retrieval.service`, `../claim-graph.service`, engine modules, and `../../services/ai-gateway.service`; assert (1) answer returns hydrated claims/assets/campaigns and grounded=false with template prose when gateway returns null, (2) grounded=true with provider name when gateway returns an object, (3) recommendations carry graphPath ≥1 node and map engine outputs to correct `kind`, (4) invalid input rejected by Zod.
- New `server/routes/__tests__/marketing-navigator.test.ts`: mirror `marketing-mount-order.test.ts` (realistic 401 auth mock); assert anonymous `GET /api/marketing/navigator` → 401, authenticated valid query → 200 with `version: "1.0"`, missing `q` → 400.
- Existing suites (`marketing-hybrid-retrieval.test.ts`, `marketing-engines.test.ts`, mount-order tests) must remain green; run `npm run typecheck` and `npm test`.

[Implementation Order]
Single sentence: contracts first, then data access, then service, then HTTP, then orchestration and client, then tests and verification.

1. Append navigator query/answer/recommendation Zod contracts and exported types to `shared/marketing-contracts.ts`.
2. Add `searchCampaigns` to `server/lib/marketing/marketing-hybrid-retrieval.service.ts`.
3. Rewrite `server/lib/marketing/marketing-navigator.service.ts` (`buildContext`, `answer`, `recommendations`, deprecated `exploreMarketingGraph` wrapper, template fallback).
4. Add `GET /navigator` and `GET /navigator/recommendations` handlers to `server/routes/marketing.ts`.
5. Update `server/lib/services/omni-command.service.ts` to use `buildContext` and surface recommendations in the marketing summary.
6. Add the marketing grounded view to `client/pages/Navigator.tsx` (fetch via `client/lib/api-client.ts`; render claims/assets/campaigns/recommendations with evidence anchors).
7. Write the service unit tests and route tests.
8. Run `npm run typecheck`, `npm test`, and a dev-server smoke check of `GET /api/marketing/navigator?q=…` (authenticated) plus an Omni-Command marketing query end-to-end.