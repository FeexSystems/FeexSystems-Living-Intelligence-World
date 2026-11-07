import { z } from "zod";

export const marketingTelemetrySchema = z.object({
  // No input parameters for marketing‑telemetry endpoint
});

export type MarketingTelemetryInput = z.infer<typeof marketingTelemetrySchema>;
export type MarketingTelemetryOutput = {
  status: "ok";
  message: string;
};