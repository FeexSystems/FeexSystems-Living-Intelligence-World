# Implementation Plan: AI Core Mission Services Landing Showcase

## Overview

This implementation plan transforms the static Core Systems Scene into a dynamic, grounded intelligence showcase by integrating the Marketing Navigator API. The work involves two key modifications: updating CoreSystemsScene.tsx to fetch and display live data with a fallback strategy, and wiring the Landing.tsx component to pass the scene navigation callback. The implementation prioritizes graceful API failure handling, component isolation, and comprehensive testing to ensure landing page stability.

---

## Tasks

### Phase 1: Core Systems Scene Integration

- [x] 1. Set up CoreSystemsScene component state and API fetch logic
  - Add `onSelectScene` optional prop to CoreSystemsSceneProps interface
  - Define CoreSystemsState interface with: `loading`, `navigatorData`, `error`, `useTemplate` fields
  - Implement `useEffect` hook to fetch from `/api/marketing/navigator?q=ai%20core%20mission%20services` on component mount
  - Handle successful response by parsing and storing in state (`navigatorData`)
  - Handle network errors by setting `error` state and `useTemplate = true` (no retry logic)
  - Ensure fresh API call on every mount (no caching)
  - _Requirements: 1.1, 1.5, 6.1, 6.2, 6.3_

- [x] 2. Implement template fallback response structure
  - Create a hardcoded `getTemplateResponse()` function returning MarketingNavigatorAnswer with `grounded: false` and `provider: "template"`
  - Verify template contains exactly 2+ claims mentioning Semantic Claim Search and Provider-Neutral LLM Abstraction
  - Include minimum 3 content assets with `type` and `state` fields
  - Include minimum 2 campaigns with `name` and `description`
  - Include minimum 3 recommendations with mixed graphPath types (some with "project" entities, some without)
  - Verify template answer text mentions all five AI capabilities: Semantic Claim Search, Provider-Neutral LLM Abstraction, Graph-Enhanced Recommendations, Grounded Answer Generation, Evidence Fabric Ledger
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 3. Render grounded answer prose and provenance metadata
  - Display the `answer` field as main content prose in CoreSystemsScene
  - Render a "Grounded by:" label above the provenance section
  - If `grounded === false` (template fallback), append "(template response)" to the provenance label
  - Render each claim's `statement` text and `evidenceCount`
  - Render each content asset's `title`, `type`, and `state`
  - Render each campaign's `name` and `description`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 4. Implement recommendation click handlers and scene navigation mapping
  - Create `analyzeGraphPath()` function to detect if graphPath contains a "project" entity
  - If project found in graphPath, return scene index 3 ("worlds"); otherwise return scene index 0 ("hero")
  - Render each recommendation as a clickable element with a `onClick` handler
  - In click handler, compute target scene index using `analyzeGraphPath()` and invoke `onSelectScene(sceneId, targetIndex)` if callback is provided
  - If `onSelectScene` is undefined, render recommendations as static text without click handlers
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.4_

- [ ]* 4.1 Write unit test: successful API fetch renders live data
  - Mock `fetch` to return a valid MarketingNavigatorAnswer
  - Mount CoreSystemsScene, verify loading state resolves
  - Assert answer prose, claims, assets, and campaigns all render in the DOM
  - _Requirements: 6.1_

- [ ]* 4.2 Write unit test: API fetch failure renders template fallback
  - Mock `fetch` to reject with a network error
  - Mount CoreSystemsScene, verify `error` state is captured
  - Assert template answer text appears in rendered output
  - Assert "(template response)" label is present
  - _Requirements: 5.1, 5.2_

- [ ]* 4.3 Write unit test: recommendation click invokes callback with correct scene index
  - Mock `onSelectScene` callback
  - Mock fetch to return recommendations with project in graphPath
  - Render CoreSystemsScene, click a recommendation with project
  - Assert `onSelectScene` invoked with correct scene index (3 for "worlds")
  - _Requirements: 3.3, 3.5, 4.3_

- [ ]* 4.4 Write unit test: recommendation without project maps to Hero scene
  - Mock `onSelectScene` callback
  - Mock fetch to return recommendation without project in graphPath
  - Click the recommendation
  - Assert `onSelectScene` invoked with index 0 ("hero")
  - _Requirements: 3.4, 4.3_

- [ ]* 4.5 Write unit test: component renders without optional callback prop
  - Render CoreSystemsScene without `onSelectScene` prop
  - Click recommendation element
  - Assert no runtime errors and no callback invocations
  - _Requirements: 6.1, 4.4_

- [ ] 5. Checkpoint — Verify CoreSystemsScene implementation
  - Ensure all unit tests (4.1–4.5) pass
  - Run `npm run typecheck` and verify no TypeScript errors in CoreSystemsScene
  - Verify component mounts without runtime errors when rendered in isolation
  - Ask the user if questions arise.

### Phase 2: Landing Component Wiring

- [ ] 6. Wire handleSelectScene callback to CoreSystemsScene in Landing.tsx
  - Locate `handleSelectScene` callback in Landing.tsx (already defined)
  - Pass `handleSelectScene` as the `onSelectScene` prop to CoreSystemsScene component
  - Verify CoreSystemsScene receives the callback prop correctly
  - Do not modify any other scenes or landing page logic
  - _Requirements: 4.1, 4.2_

- [ ]* 6.1 Write integration test: recommendation click scrolls to target scene
  - Render full Landing component with mocked fetch
  - Verify CoreSystemsScene receives `onSelectScene` callback
  - Mock a recommendation click with project in graphPath
  - Assert `handleSelectScene` is invoked with correct scene index
  - _Requirements: 4.3, 7.1_

- [ ] 7. Checkpoint — Verify Landing integration
  - Ensure integration test (6.1) passes
  - Run `npm run build:client` and verify successful client build
  - Verify landing page loads without errors in browser console
  - Ask the user if questions arise.

### Phase 3: Validation and Testing

- [ ] 8. Run full test suite and verify landing invariants
  - Run `npm test` to execute all tests
  - Verify CinematicHero tests: 13/13 pass
  - Verify LutPipelineCanvas tests: 11/11 pass
  - Verify all other existing tests pass (no regression)
  - _Requirements: 7.4_

- [ ] 9. Verify TypeScript compilation and builds
  - Run `npm run typecheck` and verify exit code 0
  - Run `npm run build` and verify exit code 0 with no errors
  - Verify dist/spa and dist/server artifacts created successfully
  - _Requirements: 6.2_

- [ ] 10. Manual verification of landing page behavior
  - Load the landing page in browser
  - Scroll to Core Systems Scene and verify scene renders
  - Verify "Grounded by:" label and provenance metadata display correctly
  - Click a recommendation and verify smooth scroll to target scene (if API returns data)
  - Verify template fallback displays if API is unavailable
  - Verify "(template response)" label appears when using fallback
  - Check browser console for no runtime errors or unhandled rejections
  - _Requirements: 1.2, 2.1, 3.1, 3.2, 5.1, 7.1_

- [ ] 11. Final checkpoint — Ensure landing page stability
  - Verify all seven scenes render in correct order (Hero, Galaxy, Core Systems, Worlds, Mission, Convergence, UI Loops)
  - Verify non-Core-Systems scenes behave identically to their current implementation
  - Verify Core Systems Scene does not fetch data when not visible (if implemented with Intersection Observer)
  - Run `npm test` one final time and verify all tests pass with no regression
  - Ask the user if questions arise.

---

## Notes

- **No new npm dependencies:** All work uses existing utilities (React hooks, fetch, built-in browser APIs)
- **Optional callback prop:** CoreSystemsScene remains testable in isolation by making `onSelectScene` optional; if undefined, recommendations render as static text without errors
- **Fresh API fetch on every mount:** No caching logic; each time CoreSystemsScene mounts, it performs a fresh API call (supports page reload and re-navigation scenarios)
- **Single attempt fallback:** On network error or parse failure, immediately fall back to template; do not retry or exponentially back off
- **Template is hardcoded:** Template fallback ensures consistent UX during development and when backend is unavailable
- **Graph path simplification:** Recommendation mapping uses simple entity type detection (`type === "project"`) rather than complex path analysis; recommendations without project entities default to Hero scene
- **Component isolation:** CoreSystemsScene can be tested independently by mocking `fetch` and optionally providing `onSelectScene` callback
- **Tasks marked with `*` are optional:** Test-related sub-tasks (4.1–4.5, 6.1) can be skipped for faster MVP, but are recommended for comprehensive coverage
- **Top-level tasks must be completed:** All tasks without `*` postfix must be completed for core implementation

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1", "2"],
      "description": "Setup: Component state, API fetch logic, and template fallback structure"
    },
    {
      "id": 1,
      "tasks": ["3", "4"],
      "description": "Rendering and interaction: Display content and wire recommendation handlers"
    },
    {
      "id": 2,
      "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5"],
      "description": "Unit testing: Test API success, failure, callback, and edge cases"
    },
    {
      "id": 3,
      "tasks": ["5"],
      "description": "Checkpoint: Verify CoreSystemsScene implementation complete"
    },
    {
      "id": 4,
      "tasks": ["6"],
      "description": "Landing wiring: Pass callback from Landing to CoreSystemsScene"
    },
    {
      "id": 5,
      "tasks": ["6.1"],
      "description": "Integration testing: Verify scene navigation end-to-end"
    },
    {
      "id": 6,
      "tasks": ["7"],
      "description": "Checkpoint: Verify Landing integration and build success"
    },
    {
      "id": 7,
      "tasks": ["8", "9", "10"],
      "description": "Validation: Test suite, build verification, and manual testing (can run in parallel)"
    },
    {
      "id": 8,
      "tasks": ["11"],
      "description": "Final checkpoint: Ensure no regression and all landing page scenes function"
    }
  ]
}
```

---

## Workflow Summary

This implementation plan transforms the landing page's Core Systems Scene from static to dynamic by:

1. **Fetching fresh Marketing Navigator data** on component mount with immediate template fallback on error
2. **Rendering grounded answer content** with claims, assets, campaigns, and interactive recommendations
3. **Wiring scene navigation callbacks** so recommendation clicks trigger smooth scroll transitions
4. **Maintaining landing invariants** by preserving all seven scenes and non-regression test coverage
5. **Ensuring component isolation** through optional callback prop and comprehensive unit testing

The work is scoped to two files (CoreSystemsScene.tsx and Landing.tsx), requires no new dependencies, and prioritizes graceful degradation and testability throughout.
