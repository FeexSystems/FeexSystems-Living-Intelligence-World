import { z } from "zod";

export const authSchema = z.object({
  // No input parameters for auth endpoint (auth state is managed by Firebase)
});

export type AuthInput = z.infer<typeof authSchema>;
export type AuthOutput = {
  status: "ok";
  message: string;
};