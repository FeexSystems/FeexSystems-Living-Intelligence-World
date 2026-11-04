# AI Core Mission Services Landing Showcase — Requirements

## Introduction

This specification defines the integration of AI Core Mission Services live intelligence into the Cinematic Landing Page's Core Systems Scene. The feature transforms a static architecture display into an interactive showcase of FeexSystems' five AI-powered capabilities (Semantic Claim Search, Provider-Neutral LLM Abstraction, Graph-Enhanced Recommendations, Grounded Answer Generation, Evidence Fabric Ledger) by fetching real-time data from the Marketing Navigator API and rendering grounded answers with interactive recommendation journeys.

## Glossary

- **Core Systems Scene**: The third cinematic scene in the landing page that currently displays static architecture information via `CoreSystemsScene.tsx`
- **Marketing Navigator API**: The endpoint `/api/marketing/navigator?q=<query>` that returns grounded answers with claims, content assets, campaigns, and recommendations
- **Grounded Answer**: An LLM-interpreted summary with full provenance (claims, evidence links, source references) that validates AI reasoning with traceable implementation evidence
- **Scene Transition**: A smooth scroll-to-view behavior that navigates between cinematic scenes triggered by user interaction
- **Recommendation**: A data-driven suggestion with explicit graph path showing entity relationships (product → feature → claim → evidence)
- **Template Fallback**: A hardcoded response structure provided when the API is unavailable, ensuring consistent UX during failures
- **Hero Scene**: The first cinematic landing scene; journey navigation may return users here
- **World Scene**: The fifth cinematic scene displaying the 3D spatial knowledge galaxy; recommendations may link to this scene

## Requirements

### Requirement 1: Fetch Live AI Mission Intelligence Data

**User Story:** As a marketing user, I want the Core Systems Scene to display live AI mission intelligence from the backend, so that the showcase reflects current capabilities and grounded evidence.

#### Acceptance Criteria

1. WHEN the Core Systems Scene component mounts THEN the Scene SHALL fetch data from `/api/marketing/navigator?q=ai%20core%20mission%20services`
2. WHEN the fetch completes successfully THEN the Scene SHALL store the MarketingNavigatorAnswer response in component state
3. WHEN the API response contains claims, content assets, campaigns, and recommendations THEN all categories SHALL be parsed without validation errors
4. IF the API request fails THEN the Scene SHALL immediately fall back to the template response without retry attempts
5. WHEN the Scene mounts THEN any existing cached data SHALL be discarded and the Scene SHALL always perform a fresh API call

### Requirement 2: Display Grounded Answer with Provenance

**User Story:** As a visitor, I want to read grounded answers about AI capabilities with clear evidence links, so that I understand FeexSystems' AI claims and their supporting evidence.

#### Acceptance Criteria

1. WHEN the Scene renders THEN it SHALL display the `answer` field as the main content prose
2. WHEN the answer text is displayed THEN a trailing "Grounded by:" label SHALL appear above the provenance section
3. WHEN rendering claims THEN each claim SHALL display its statement text and evidence count
4. WHEN rendering content assets THEN each asset SHALL display its title, type, and lifecycle state
5. WHERE the grounded field is false THEN the Scene SHALL append "(template response)" to the provenance label to indicate API fallback

### Requirement 3: Render Interactive Recommendations as Journey Points

**User Story:** As a visitor, I want to click recommendations to navigate to related cinematic scenes, so that I can explore deeper context for each AI capability.

#### Acceptance Criteria

1. WHEN the Scene renders recommendations THEN each recommendation SHALL be displayed as a clickable element
2. WHEN a user clicks a recommendation THEN the Scene SHALL emit a navigation signal to scroll to a related scene
3. WHERE a recommendation's graph path contains a project entity THEN the recommendation SHALL map to the World Scene (scene index 4)
4. WHERE a recommendation's graph path does not contain a project entity THEN the recommendation SHALL map to the Hero Scene (scene index 0)
5. WHEN a user clicks a recommendation THEN the Landing.tsx `handleSelectScene` callback SHALL be invoked with the target scene index

### Requirement 4: Wire Scene Navigation Handler

**User Story:** As a developer, I want the Core Systems Scene to receive scene navigation capability, so that recommendations can trigger smooth transitions to related scenes.

#### Acceptance Criteria

1. WHEN Landing.tsx mounts THEN it SHALL pass the `handleSelectScene` callback to CoreSystemsScene as a prop
2. WHEN CoreSystemsScene receives the handler prop THEN it SHALL store it in state without side effects
3. WHEN a recommendation is clicked THEN CoreSystemsScene SHALL invoke `handleSelectScene(sceneId, targetIndex)` with the appropriate index
4. IF the `handleSelectScene` prop is undefined THEN CoreSystemsScene SHALL render recommendations as static text (no-op click handlers)

### Requirement 5: Implement Template Fallback Response

**User Story:** As a platform operator, I want API failures to degrade gracefully, so that visitors see meaningful content even when the backend is unavailable.

#### Acceptance Criteria

1. IF the API request fails or times out THEN the Scene SHALL use a hardcoded template response matching the MarketingNavigatorAnswer schema
2. WHEN the template response is used THEN the grounded field SHALL be set to false
3. WHEN the template response is used THEN the provider field SHALL be set to "template"
4. WHEN the template fallback is active THEN the Scene SHALL display at least 2 example claims, 3 content assets, 2 campaigns, and 3 recommendations
5. WHEN the template fallback is active THEN the displayed content SHALL mention the five core AI capabilities: Semantic Claim Search, Provider-Neutral LLM Abstraction, Graph-Enhanced Recommendations, Grounded Answer Generation, Evidence Fabric Ledger

### Requirement 6: Maintain Component Isolation and Testability

**User Story:** As a developer, I want CoreSystemsScene to remain testable in isolation, so that I can verify behavior without mocking the entire Landing component.

#### Acceptance Criteria

1. WHEN CoreSystemsScene is rendered without the `onSelectScene` prop THEN it SHALL not throw an error and SHALL render gracefully
2. WHEN the Scene's state is examined THEN it SHALL contain separate fields for: loading state, error state, API response, and template fallback flag
3. WHEN the Scene fetches data THEN network errors SHALL not propagate as unhandled promise rejections
4. WHEN a recommendation click handler is invoked without the callback THEN the click event SHALL be handled without runtime errors

### Requirement 7: Preserve Existing Landing Page Behavior

**User Story:** As a user, I want all other cinematic scenes and landing features to work unchanged, so that the integration does not break existing functionality.

#### Acceptance Criteria

1. WHEN the Landing page loads THEN all seven scenes (Hero, Galaxy, Core Systems, Worlds, Mission, Convergence, UI Loops) SHALL render in the correct order
2. WHEN scroll navigation occurs THEN non-Core-Systems scenes SHALL behave identically to their current implementation
3. WHEN the Core Systems Scene is not visible THEN it SHALL not fetch or process API data
4. WHEN existing tests run THEN CinematicHero (13/13), LutPipelineCanvas (11/11), and Server tests (329+) SHALL all pass

## Notes

- No new npm dependencies are required; all work uses existing utilities (React hooks, fetch, zod for validation)
- The API endpoint requires authentication; the scene should assume the user is already authenticated by the Landing context
- Template fallback content is intentionally generic to ensure it works offline and during development
- Recommendation graph path interpretation is simplified: if "project" is in the path, navigate to World; otherwise, navigate to Hero
- The scene should not retry failed requests; a single attempt with immediate fallback ensures consistent performance
