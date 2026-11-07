import { z } from "zod";

export const chatSchema = z.object({
  // No input parameters for chat endpoint
});

export type ChatInput = z.infer<typeof chatSchema>;
export type ChatOutput = {
  status: "ok";
  message: string;
};