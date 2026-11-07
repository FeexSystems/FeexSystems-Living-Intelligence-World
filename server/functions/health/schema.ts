import { z } from "zod";

export const healthSchema = z.object({
  // No input parameters for health check
});

export type HealthInput = z.infer<typeof healthSchema>;
export type HealthOutput = {
  status: "ok";
  timestamp: string;
};