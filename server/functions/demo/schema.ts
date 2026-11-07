import { z } from "zod";

export const demoSchema = z.object({
  // No input parameters for demo endpoint
});

export type DemoInput = z.infer<typeof demoSchema>;
export type DemoOutput = {
  status: string;
  message: string;
};