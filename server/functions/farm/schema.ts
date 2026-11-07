import { z } from "zod";

export const farmSchema = z.object({
  // No input parameters for farm endpoint
});

export type FarmInput = z.infer<typeof farmSchema>;
export type FarmOutput = {
  status: "ok";
  message: string;
};