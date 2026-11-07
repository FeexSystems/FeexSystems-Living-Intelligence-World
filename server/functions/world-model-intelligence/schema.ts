import { z } from "zod";

export const worldModelIntelligenceSchema = z.object({
  // No input parameters for world‑model‑intelligence endpoint
});

export type WorldModelIntelligenceInput = z.infer<typeof worldModelIntelligenceSchema>;
export type WorldModelIntelligenceOutput = {
  status: "ok";
  message: string;
};