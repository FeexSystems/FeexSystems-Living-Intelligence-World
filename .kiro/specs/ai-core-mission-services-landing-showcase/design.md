# AI Core Mission Services Landing Showcase — Design

## Overview

The AI Core Mission Services Landing Showcase transforms the static Core Systems Scene into a dynamic, grounded intelligence showcase by fetching live navigator data and rendering interactive recommendations with scene navigation. This design integrates the Marketing Navigator API into the cinematic landing architecture while maintaining component isolation, graceful degradation, and landing page invariants.

**Key Design Decisions:**
- Fresh API fetch on every mount (no caching) ensures current intelligence
- Template fallback with `grounded: false` flag provides offline resilience
- Recommendation clicks invoke `handleSelectScene()` callback for smooth scene transitions
- Graph path analysis (`project` entity detection) drives recommendation-to-scene mapping
- Component remains testable in isolation via optional callback prop

---

## Architecture

### Component Data Flow

```
Landing.tsx (parent)
  ↓ passes handleSelectScene callback
CoreSystemsScene.tsx
  ├─ mount → fetch /api/marketing/navigator?q=ai%20core%20mission%20services
  ├─ success → store MarketingNavigatorAnswer in state
  ├─ failure → use template fallback (grounded: false)
  └─ render: answer prose + claims + assets + campaigns + clickable recommendations
              ↓ user clicks recommendation
              → invoke handleSelectScene(sceneId, targetIndex)
              → Landing.tsx scrolls to target scene
```

### Navigation Mapping Logic

Recommendations contain a `graphPath` array of entity objects with `type` fields:

```typescript
graphPath: [
  { id: "proj-123", type: "project", label: "..." },
  { id: "feat-456", type: "feature", label: "..." },
  { id: "claim-789", type: "claim", label: "..." }
]
```

**Mapping Rule:**
- If `graphPath.some(entity => entity.type === "project")` → map to **World Scene** (index 3, `SCENE_IDS[3] = "worlds"`)
- Otherwise → map to **Hero Scene** (index 0, `SCENE_IDS[0] = "hero"`)

This rule ensures product-focused recommendations navigate to the 3D spatial knowledge explorer, while general intelligence flows guide users back to the opening scene.

---

## Components and Interfaces

### Updated CoreSystemsScene.tsx

**Props:**
```typescript
interface CoreSystemsSceneProps {
  /**
   * Callback invoked when a user clicks a recommendation.
   * Optional — if undefined, recommendations render as static text.
   * Signature: handleSelectScene(sceneId: SceneId, index: number)
   */
  onSelectScene?: (sceneId: string, index: number) => void;
}
```

**Internal State:**
```typescript
interface CoreSystemsState {
  loading: boolean;          // true while fetching, false after response/error
  navigatorData: MarketingNavigatorAnswer | null;  // API response
  error: Error | null;       // fetch error (not including template fallback)
  useTemplate: boolean;      // true if API failed or response is invalid
}
```

**Component Responsibilities:**
1. On mount, fetch `/api/marketing/navigator?q=ai%20core%20mission%20services`
2. Parse response into state; on parse error, set `useTemplate = true`
3. On network error, set `useTemplate = true` (no retry)
4. Render answer prose, claims, assets, campaigns, and recommendations
5. For each recommendation, compute target scene index and wire click handler
6. If `onSelectScene` is undefined, render recommendations as unclickable text

### Landing.tsx Wiring

**Change:** Pass `handleSelectScene` to CoreSystemsScene

```typescript
<CoreSystemsScene onSelectScene={handleSelectScene} />
```

The `handleSelectScene` callback already exists in Landing.tsx:
```typescript
const handleSelectScene = useCallback((_id: SceneId, index: number) => {
  const container = scrollContainerRef.current;
  const sceneId = SCENE_IDS[index];
  if (!container || !sceneId) return;
  
  const target = container.querySelector<HTMLElement>(`#${CSS.escape(sceneId)}`);
  target?.scrollIntoView({
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    block: "start",
  });
  setActiveIndex(index);
}, []);
```

No changes needed to this logic — it already handles arbitrary scene indices.

---

## Data Models

### MarketingNavigatorAnswer

From `shared/marketing-contracts.ts` (already defined):

```typescript
export interface MarketingNavigatorAnswer {
  version: "1.0";
  query: string;
  answer: string;                    // main prose content
  grounded: boolean;                 // false when using template fallback
  provider?: string;                 // e.g. "gemini", "openai", "template"
  claims: Array<{
    id: string;
    statement: string;
    confidence?: number;
    productId?: string | null;
    evidenceCount: number;
  }>;
  contentAssets: Array<{
    id: string;
    title: string;
    type: string;
    state: string;                   // e.g. "PUBLISHED", "DRAFT"
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
  recommendations: Array<NavigatorRecommendation>;
  suggestions: string[];
}
```

### NavigatorRecommendation

```typescript
export interface NavigatorRecommendation {
  id: string;
  kind: "CONTENT_GAP" | "CONTENT_DECAY" | "OPPORTUNITY" | "EVIDENCE_REFRESH" | "NEXT_ACTION";
  title: string;
  rationale: string;
  confidence: number;                // 0–1
  graphPath: Array<{
    id: string;
    type: string;                    // e.g. "project", "feature", "claim", "evidence"
    label: string;
  }>;
  evidence: Array<{
    id: string;
    sourceUrl?: string;
    sourceRef?: string;
    observedAt?: string;
  }>;
}
```

### Template Fallback Response

When API fails, CoreSystemsScene returns a hardcoded `MarketingNavigatorAnswer` with:

```typescript
{
  version: "1.0",
  query: "ai core mission services",
  answer: "FeexSystems offers five core AI capabilities: Semantic Claim Search indexes engineering insights across the World Model, enabling precise retrieval by semantic intent. Provider-Neutral LLM Abstraction decouples reasoning logic from model selection, allowing seamless integration with Gemini, OpenAI, Claude, or custom providers. Graph-Enhanced Recommendations leverage relationship topology to surface actionable next steps with full provenance. Grounded Answer Generation interprets AI reasoning against canonical evidence, ensuring every claim traces to implementation artifacts. Evidence Fabric Ledger maintains cryptographic commit SHAs and artifact links, creating an audit trail of reasoning transparency.",
  grounded: false,
  provider: "template",
  claims: [
    // minimum 2 claims covering the five capabilities
    {
      id: "claim-semantic-search",
      statement: "Semantic Claim Search enables precise retrieval of engineering insights by semantic intent across the World Model.",
      confidence: 0.95,
      productId: null,
      evidenceCount: 2
    },
    {
      id: "claim-llm-abstraction",
      statement: "Provider-Neutral LLM Abstraction allows seamless model interchange without breaking World Model contracts.",
      confidence: 0.92,
      productId: null,
      evidenceCount: 3
    }
  ],
  contentAssets: [
    // minimum 3 assets
    { id: "asset-1", title: "AI Capabilities Overview", type: "article", state: "PUBLISHED" },
    { id: "asset-2", title: "Evidence Fabric Architecture", type: "docs", state: "PUBLISHED" },
    { id: "asset-3", title: "Graph-Enhanced Recommendations", type: "tutorial", state: "PUBLISHED" }
  ],
  campaigns: [
    // minimum 2 campaigns
    { id: "campaign-1", name: "AI Missions Q1", description: "First quarter AI capability showcase" },
    { id: "campaign-2", name: "Evidence Transparency", description: "Grounded reasoning and cryptographic audit trails" }
  ],
  recommendations: [
    // minimum 3 recommendations with mixed graphPath types
    {
      id: "rec-1",
      kind: "OPPORTUNITY",
      title: "Explore AI Evidence Framework",
      rationale: "The Evidence Fabric Ledger provides cryptographic verification of reasoning.",
      confidence: 0.88,
      graphPath: [
        { id: "proj-evidence", type: "project", label: "Evidence Fabric" },
        { id: "feat-crypto", type: "feature", label: "Cryptographic Verification" }
      ],
      evidence: []
    },
    {
      id: "rec-2",
      kind: "NEXT_ACTION",
      title: "Discover Provider Abstraction Patterns",
      rationale: "Learn how FeexSystems decouples from LLM providers.",
      confidence: 0.85,
      graphPath: [
        { id: "claim-abstraction", type: "claim", label: "Provider Neutrality" }
      ],
      evidence: []
    },
    {
      id: "rec-3",
      kind: "CONTENT_GAP",
      title: "Review Semantic Search Implementation",
      rationale: "Semantic indexing powers precise capability discovery.",
      confidence: 0.90,
      graphPath: [
        { id: "proj-search", type: "project", label: "Semantic Search" },
        { id: "feat-indexing", type: "feature", label: "Vector Indexing" }
      ],
      evidence: []
    }
  ],
  suggestions: []
}
```

---

## Error Handling

### Network Errors

- **Fetch failure (timeout, network error, non-200 status):**
  - Set `error` state and `useTemplate = true`
  - Log error to console (no user-facing alert)
  - Render template fallback response
  - Do NOT retry

### Parse Errors

- **Invalid response shape (violates MarketingNavigatorAnswer schema):**
  - Set `useTemplate = true` and `error` state
  - Render template fallback response

### Optional Callback

- **onSelectScene undefined:**
  - Render recommendations as static prose (no click handlers)
  - Do not attempt to invoke callback

### Error Recovery

- **No automatic retry:** A single failed fetch immediately falls back to template
- **Re-mounting restarts fetch:** If user navigates away and back to the scene, fetch attempts again
- **Template never fails:** Hardcoded response always renders

---

## Testing Strategy

### Unit Testing (Example-Based Tests)

#### Test Suite: CoreSystemsScene API and Fallback

1. **Successful API fetch renders live data**
   - Mock `fetch` to return a valid MarketingNavigatorAnswer
   - Mount component, await loading state resolution
   - Verify answer prose, claims, assets, and campaigns all render

2. **Failed API fetch renders template**
   - Mock `fetch` to reject with a network error
   - Mount component, verify `useTemplate = true` state
   - Verify template answer text appears in rendered output

3. **Invalid response shape renders template**
   - Mock `fetch` to return invalid JSON
   - Mount component, verify fallback renders

4. **Recommendation click invokes callback**
   - Mock `onSelectScene` callback
   - Render a recommendation with project in graphPath
   - Click recommendation
   - Verify callback invoked with correct scene index (3 for "worlds")

5. **Recommendation without project maps to Hero**
   - Mock recommendation with non-project graphPath
   - Click recommendation
   - Verify callback invoked with index 0 ("hero")

6. **Optional callback does not throw**
   - Render component without `onSelectScene` prop
   - Click recommendation element
   - Verify no runtime errors

7. **Template contains all five AI capabilities**
   - Render with API failure
   - Verify template answer mentions: Semantic Claim Search, Provider-Neutral LLM, Graph-Enhanced Recommendations, Grounded Answer Generation, Evidence Fabric Ledger

8. **Fetch occurs on mount**
   - Mock `fetch`
   - Mount component
   - Verify fetch called with correct URL: `/api/marketing/navigator?q=ai%20core%20mission%20services`

#### Test Suite: Landing Wiring

9. **Landing passes handleSelectScene to CoreSystemsScene**
   - Render Landing
   - Verify CoreSystemsScene receives onSelectScene prop (via mock or spy)

### Integration Testing

10. **Scene scrolls when recommendation clicked**
    - Render full Landing with mock fetch
    - Scroll to CoreSystemsScene
    - Click recommendation with project path
    - Verify WorldsScene element receives `scrollIntoView` call

### Why Property-Based Testing Does NOT Apply

This feature is **not suitable for property-based testing** because:

1. **External service dependency:** The API fetch is I/O-bound; properties cannot verify "correct AWS/backend response" without mocking
2. **Configuration verification:** Template fallback is a hardcoded structure, not a function with universal properties
3. **UI rendering:** Recommendations are rendered UI elements; visual correctness is not a universal property
4. **One-shot behavior:** Scene navigation is a side effect (scroll event); there is no return value to assert universal properties over
5. **Graph path mapping is deterministic:** The `type === "project"` check is a simple enum dispatch, not a function with properties that improve with 100 iterations

**Alternative strategies used:**
- Unit tests verify specific examples (valid API response, network error, missing callback)
- Integration tests verify end-to-end landing behavior
- Template fallback is verified as a static snapshot
- Recommendation mapping is verified with explicit test cases for both project and non-project paths

---

## Implementation Requirements

### Files to Create/Modify

1. **client/landing/scenes/CoreSystemsScene.tsx** (modify)
   - Add `onSelectScene?` prop
   - Implement `useEffect` for API fetch on mount
   - Add state: `loading`, `navigatorData`, `error`, `useTemplate`
   - Implement template fallback response
   - Render answer, claims, assets, campaigns, recommendations
   - Wire recommendation click handlers with graph path analysis

2. **client/landing/Landing.tsx** (modify)
   - Pass `handleSelectScene` callback to CoreSystemsScene
   - No other changes

### Dependencies

- None new; use existing:
  - React hooks: `useState`, `useEffect`, `useCallback`
  - `fetch` API (built-in)
  - `MarketingNavigatorAnswer` from `shared/marketing-contracts.ts`
  - `SCENE_IDS` from `client/landing/registry/landingAssets.ts`
  - Radix UI and TailwindCSS 3 for rendering

### Assumptions

- User is authenticated (API endpoint requires auth; assumption inherited from existing landing architecture)
- `/api/marketing/navigator` is available on the same domain
- Scene IDs are stable: `SCENE_IDS[0] = "hero"`, `SCENE_IDS[3] = "worlds"` (from landingAssets.ts)

---

## Summary

The AI Core Mission Services Landing Showcase integrates live grounded intelligence into the cinematic landing by:

1. Fetching fresh data on each CoreSystemsScene mount
2. Parsing the MarketingNavigatorAnswer and rendering answer prose with provenance metadata
3. Displaying claims, content assets, and campaigns as supporting evidence
4. Rendering recommendations as clickable journey points with intelligent scene mapping
5. Falling back to a hardcoded template response on API failure
6. Maintaining existing landing page behavior and scene navigation

The design prioritizes graceful degradation, component isolation, and landing architecture invariants while keeping implementation scope minimal (two file changes, no new dependencies).
