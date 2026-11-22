import { describe, expect, it } from "vitest";
import { normalizeNavigatorResponse } from "../normalizeNavigatorResponse";

describe("normalizeNavigatorResponse", () => {
  it("unwraps the current success envelope", () => {
    const data = { explanation: "Grounded explanation", groundedEvidenceCount: 3 };
    expect(normalizeNavigatorResponse({ success: true, data })).toEqual({ kind: "success", data });
  });
  it("preserves an explicit error envelope as an error", () => {
    expect(normalizeNavigatorResponse({ success: false, error: { message: "Provider unavailable" } }))
      .toEqual({ kind: "error", errorMessage: "Provider unavailable" });
  });
  it("accepts a recognizable legacy direct-result shape", () => {
    const data = { summary: "Legacy result", projects: [] };
    expect(normalizeNavigatorResponse(data)).toEqual({ kind: "success", data });
  });
  it("rejects malformed and arbitrary object payloads", () => {
    expect(normalizeNavigatorResponse(null).kind).toBe("unavailable");
    expect(normalizeNavigatorResponse({ ok: true }).kind).toBe("unavailable");
    expect(normalizeNavigatorResponse({ success: true, data: null }).kind).toBe("unavailable");
  });
  it("does not manufacture typed evidence references from a count", () => {
    const result = normalizeNavigatorResponse({ success: true, data: { groundedEvidenceCount: 12 } });
    expect(result.kind).toBe("success");
    expect(result.data).toEqual({ groundedEvidenceCount: 12 });
    expect(result.data).not.toHaveProperty("evidenceRefs");
    expect(result.data).not.toHaveProperty("evidenceBundle");
  });
});
