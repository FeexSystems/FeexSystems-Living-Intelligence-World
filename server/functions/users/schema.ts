import { z } from "zod";

export const usersSchema = z.object({
  // No input parameters for users endpoint
});

export type UsersInput = z.infer<typeof usersSchema>;
export type UsersOutput = {
  status: "ok";
  message: string;
};