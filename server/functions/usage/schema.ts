import { z } from "zod";

export const usageSchema = z.object({
  // No input parameters for usage endpoint
});

export type UsageInput = z.infer<typeof usageSchema>;
export type UsageOutput = {
  status: "ok";
  message: string;
};