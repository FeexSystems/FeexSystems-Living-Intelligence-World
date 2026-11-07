import { z } from "zod";

export const adminSchema = z.object({
  // No input parameters for admin endpoint
});

export type AdminInput = z.infer<typeof adminSchema>;
export type AdminOutput = {
  status: "ok";
  message: string;
};