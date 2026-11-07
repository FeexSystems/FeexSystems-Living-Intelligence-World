import { z } from "zod";

export const worldModelSchema = z.object({
  // No input parameters for world-model endpoint
});

export type WorldModelInput = z.infer<typeof worldModelSchema>;
export type WorldModelOutput = {
  status: "ok";
  message: string;
};