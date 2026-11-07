import { z } from "zod";

export const marketingSchema = z.object({
  // No input parameters for marketing endpoint
});

export type MarketingInput = z.infer<typeof marketingSchema>;
export type MarketingOutput = {
  status: "ok";
  message: string;
};