/**
 * Claim must not be creatable without evidence (contract + service rule).
 */
import { describe, it, expect } from "vitest";
import { CreateClaimSchema } from "../../../../shared/marketing-contracts";

describe("CreateClaimSchema evidence requirement", () => {
  it("rejects claim with no evidence", () => {
    const result = CreateClaimSchema.safeParse({
      statement: "We are the fastest platform",
    });
    expect(result.success).toBe(false);
  });

  it("accepts claim with worldModelEvidenceIds", () => {
    const result = CreateClaimSchema.safeParse({
      statement: "World Model owns reality",
      worldModelEvidenceIds: ["ev_123"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts claim with marketingEvidence", () => {
    const result = CreateClaimSchema.safeParse({
      statement: "Evidence-first marketing is required",
      marketingEvidence: [
        {
          sourceType: "architecture_doc",
          sourceUrl: "https://example.com/doc",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
