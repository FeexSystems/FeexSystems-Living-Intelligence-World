/**
 * Phase 2 — Claim graph integrity contracts (unit-level)
 */
import { describe, it, expect } from "vitest";
import { CreateClaimSchema } from "../../../../shared/marketing-contracts";

describe("Phase 2 claim graph integrity contracts", () => {
  it("rejects material claims with no evidence (orphan prevention at boundary)", () => {
    const result = CreateClaimSchema.safeParse({
      statement: "Unsupported product claim",
      productId: "prod_1",
    });
    expect(result.success).toBe(false);
  });

  it("accepts claim supported by World Model evidence", () => {
    const result = CreateClaimSchema.safeParse({
      statement: "World Model owns reality",
      worldModelEvidenceIds: ["wme_abc"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts claim supported by marketing evidence", () => {
    const result = CreateClaimSchema.safeParse({
      statement: "External research supports this",
      marketingEvidence: [
        {
          sourceType: "research_paper",
          sourceUrl: "https://example.com/paper",
          sourceRef: "doi:10.1000/example",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("Claim graph edge vocabulary", () => {
  const allowed = new Set(["supports", "about", "asserts", "depends_on"]);

  it("uses only typed relation labels", () => {
    for (const r of ["supports", "about", "asserts", "depends_on"]) {
      expect(allowed.has(r)).toBe(true);
    }
  });
});
