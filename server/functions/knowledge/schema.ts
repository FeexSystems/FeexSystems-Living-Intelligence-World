import { z } from "zod";

export const knowledgeSchema = z.object({
  // No input parameters for knowledge endpoint
});

export type KnowledgeInput = z.infer<typeof knowledgeSchema>;
export type KnowledgeOutput = {
  status: "ok";
  message: string;
};