import { describe, it, expect } from "vitest";
import {
  createEmptyStageResponse,


} from "../../../shared/orchestration";
import { validateOmniResponse, validateOmniRequest } from "../../../shared/orchestration-schema";

const COMPONENTS = [
  "GraphVisualizer",
  "MarkdownViewer",
  "MetricsDashboard",
  "CodeViewer",
  "EvidencePanel",
  "EmptyStage",
  "ErrorStage",
];

describe("Omni Orchestration Contract eval", () => {
  it("validates empty stage response", () => {
    const r = createEmptyStageResponse("test-1");
    const v = validateOmniResponse(r);
    expect(v.success).toBe(true);
  });

  it("accepts each component name in ui_directive", () => {
    for (const component of COMPONENTS) {
      const response = {
        version: "1.0",
        requestId: `eval-${component}`,
        intent: "TEST",
        status: "success",
        confidence: 0.8,
        groundedEvidenceCount: 0,
        reasoning_trace: [],
        ui_directive: {
          component,
          props:
            component === "GraphVisualizer"
              ? { nodes: [], edges: [] }
              : component === "CodeViewer"
                ? { path: "a.ts", content: "export {}" }
                : component === "MetricsDashboard"
                  ? { widget_type: "health", status: "LIVE", data_points: [] }
                  : component === "MarkdownViewer" || component === "EvidencePanel"
                    ? { title: "t", content: "c" }
                    : component === "ErrorStage"
                      ? { message: "err" }
                      : {},
        },
        context: {},
        suggestions: [],
        evidence_anchors: [],
      };
      const v = validateOmniResponse(response);
      expect(v.success, component).toBe(true);
    }
  });

  it("rejects empty query requests", () => {
    const v = validateOmniRequest({ query: "" });
    expect(v.success).toBe(false);
  });

  it("accepts multi-turn context on request", () => {
    const v = validateOmniRequest({
      query: "Zoom into that node",
      context: {
        sessionId: "s1",
        focusedNodeIds: ["github:FeexSystems/x"],
        previousIntent: "VISUALIZE_ARCHITECTURE",
        lastQuery: "Show architecture",
      },
    });
    expect(v.success).toBe(true);
  });
});
