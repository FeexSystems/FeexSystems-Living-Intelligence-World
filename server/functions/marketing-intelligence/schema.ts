import { z } from "zod";

export const marketingIntelligenceSchema = z.object({
  // No input parameters for marketing‑intelligence endpoint
});

export type MarketingIntelligenceInput = z.infer<typeof marketingIntelligenceSchema>;
export type MarketingIntelligenceOutput = {
  status: "ok";
  message: string;
};