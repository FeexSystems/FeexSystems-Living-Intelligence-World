import { z } from "zod";

export const analyticsSchema = z.object({
  // No input parameters for analytics endpoint
});

export type AnalyticsInput = z.infer<typeof analyticsSchema>;
export type AnalyticsOutput = {
  status: "ok";
  message: string;
};