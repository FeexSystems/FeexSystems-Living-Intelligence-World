import { z } from "zod";

export const pingSchema = z.object({
  // No input parameters for the ping endpoint
});

// Export the inferred type for use in the handler
export type PingInput = z.infer<typeof pingSchema>;
export type PingOutput = {
  message: string;
};