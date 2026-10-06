 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { describe, it, expect } from "vitest";
import {
  validateOmniRequest,
  validateOmniResponse,
  OmniCommandResponseSchema,
} from "../../../shared/orchestration-schema";
import { createEmptyStageResponse } from "../../../shared/orchestration";

describe("OmniCommandRequestSchema", () => {
  it("accepts a valid query", () => {
    const r = validateOmniRequest({ query: "Show architecture" });
    expect(r.success).toBe(true);
    expect(_optionalChain([r, 'access', _ => _.data, 'optionalAccess', _2 => _2.query])).toBe("Show architecture");
  });

  it("rejects empty query", () => {
    const r = validateOmniRequest({ query: "" });
    expect(r.success).toBe(false);
  });

  it("accepts context with focused nodes", () => {
    const r = validateOmniRequest({
      query: "zoom in",
      context: { focusedNodeIds: ["n1"], previousIntent: "VISUALIZE_ARCHITECTURE" },
    });
    expect(r.success).toBe(true);
    expect(_optionalChain([r, 'access', _3 => _3.data, 'optionalAccess', _4 => _4.context, 'optionalAccess', _5 => _5.focusedNodeIds])).toEqual(["n1"]);
  });
});

describe("OmniCommandResponseSchema", () => {
  it("accepts empty stage helper", () => {
    const empty = createEmptyStageResponse("req-1");
    const r = validateOmniResponse(empty);
    expect(r.success).toBe(true);
    expect(_optionalChain([r, 'access', _6 => _6.data, 'optionalAccess', _7 => _7.ui_directive, 'access', _8 => _8.component])).toBe("EmptyStage");
  });

  it("rejects missing version", () => {
    const bad = { ...createEmptyStageResponse("x"), version: "2.0" };
    const r = OmniCommandResponseSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects confidence out of range", () => {
    const bad = { ...createEmptyStageResponse("x"), confidence: 2 };
    const r = OmniCommandResponseSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("accepts GraphVisualizer directive shape", () => {
    const payload = {
      ...createEmptyStageResponse("g1"),
      intent: "VISUALIZE_ARCHITECTURE",
      ui_directive: {
        component: "GraphVisualizer",
        props: {
          layout: "force-directed",
          nodes: [{ id: "n1", label: "API", type: "CAPABILITY" }],
          edges: [{ source: "n1", target: "n2", label: "USES" }],
        },
        layoutHint: "full",
      },
      groundedEvidenceCount: 1,
      evidence_anchors: [
        { type: "project", id: "p1", label: "Persona OS" },
      ],
    };
    const r = validateOmniResponse(payload);
    expect(r.success).toBe(true);
  });
});
