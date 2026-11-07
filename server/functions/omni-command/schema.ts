import { z } from "zod";

export const omniCommandSchema = z.object({
  command: z.string(),
  // optional payload
  payload: z.any().optional(),
});

export type OmniCommandInput = z.infer<typeof omniCommandSchema>;
export type OmniCommandOutput = {
  status: "processed";
  result: unknown;
};