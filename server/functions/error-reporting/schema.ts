import { z } from "zod";

export const errorReportingSchema = z.object({
  // No input parameters for error‑reporting endpoint
});

export type ErrorReportingInput = z.infer<typeof errorReportingSchema>;
export type ErrorReportingOutput = {
  status: "ok";
  message: string;
};