import { z } from "zod";

export const securitySchema = z.object({
  // No input parameters for security endpoint
});

export type SecurityInput = z.infer<typeof securitySchema>;
export type SecurityOutput = {
  status: "ok";
  message: string;
};