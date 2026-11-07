import { z } from "zod";

export const aiAgentsSchema = z.object({
  // No input parameters for ai‑agents endpoint
});

export type AiAgentsInput = z.infer<typeof aiAgentsSchema>;
export type AiAgentsOutput = {
  status: "ok";
  message: string;
};