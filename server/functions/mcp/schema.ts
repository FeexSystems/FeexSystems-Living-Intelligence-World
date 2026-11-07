import { z } from "zod";

export const mcpSchema = z.object({
  // No input parameters for mcp endpoint
});

export type McpInput = z.infer<typeof mcpSchema>;
export type McpOutput = {
  status: "ok";
  message: string;
};