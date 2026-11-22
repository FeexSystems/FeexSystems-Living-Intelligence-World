import { describe, expect, it } from "vitest";
import { extractNavigatorEvidenceRefs } from "../navigatorEvidenceRefs";

describe("extractNavigatorEvidenceRefs", () => {
  it("extracts repository slugs and artifact SHAs from a real response", () => {
    const refs = extractNavigatorEvidenceRefs({
      explanation: "answer",
      projects: [
        { name: "RepoA", repository: "FeexSystems/RepoA" },
        { name: "RepoB", repository: "FeexSystems/RepoB" },
        { name: "NoRepo" },
      ],
      artifacts: [{ path: "a.ts", sha: "0123456789abcdef" }],
      groundedEvidenceCount: 99,
    });
    expect(refs).toEqual([
      "FeexSystems/RepoA",
      "FeexSystems/RepoB",
      "0123456789abcdef",
    ]);
    // The aggregate count is never treated as an evidence ID.
    expect(refs).not.toContain("99");
  });

  it("dedupes and trims identifiers", () => {
    const refs = extractNavigatorEvidenceRefs({
      projects: [
        { repository: "  FeexSystems/RepoA  " },
        { repository: "FeexSystems/RepoA" },
      ],
      artifacts: [{ sha: "abc123" }, { sha: "abc123" }],
    });
    expect(refs).toEqual(["FeexSystems/RepoA", "abc123"]);
  });

  it("caps the number of refs", () => {
    const projects = Array.from({ length: 20 }, (_, i) => ({
      repository: `org/repo-${i}`,
    }));
    const refs = extractNavigatorEvidenceRefs({ projects });
    expect(refs).toHaveLength(8);
  });

  it("returns empty for missing or malformed payloads", () => {
    for (const input of [null, undefined, "str", 42, [], {}, { projects: "x" }]) {
      expect(extractNavigatorEvidenceRefs(input)).toEqual([]);
    }
  });
});
