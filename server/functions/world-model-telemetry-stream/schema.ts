import { z } from "zod";

export const worldModelTelemetryStreamSchema = z.object({
  // No input parameters for world‑model‑telemetry‑stream endpoint
});

export type WorldModelTelemetryStreamInput = z.infer<typeof worldModelTelemetryStreamSchema>;
export type WorldModelTelemetryStreamOutput = {
  status: "ok";
  message: string;
};