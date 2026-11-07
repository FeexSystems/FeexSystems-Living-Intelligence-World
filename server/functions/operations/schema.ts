import { z } from "zod";

export const operationsSchema = z.object({
  // No input parameters for operations endpoint
});

export type OperationsInput = z.infer<typeof operationsSchema>;
export type OperationsOutput = {
  status: "ok";
  message: string;
};