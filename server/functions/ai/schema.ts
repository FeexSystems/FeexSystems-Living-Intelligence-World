import { z } from "zod";

export const aiSchema = z.object({
  // No input parameters for generic AI endpoint
});

export type AIInput = z.infer<typeof aiSchema>;
export type AIOutput = {
  status: "ok";
  message: string;
};