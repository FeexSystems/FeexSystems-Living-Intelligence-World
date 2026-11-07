import { z } from "zod";

export const billingSchema = z.object({
  // No input parameters for billing endpoint (billing state managed externally)
});

export type BillingInput = z.infer<typeof billingSchema>;
export type BillingOutput = {
  status: "ok";
  message: string;
};