import { z } from "zod";

export const devopsSchema = z.object({
  // No input parameters for devops endpoint
});

export type DevOpsInput = z.infer<typeof devopsSchema>;
export type DevOpsOutput = {
  status: "ok";
  message: string;
};