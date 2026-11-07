import { z } from "zod";

export const teamsSchema = z.object({
  // No input parameters for teams endpoint
});

export type TeamsInput = z.infer<typeof teamsSchema>;
export type TeamsOutput = {
  status: "ok";
  message: string;
};