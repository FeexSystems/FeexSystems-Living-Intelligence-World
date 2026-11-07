import { z } from "zod";

export const rentalSchema = z.object({
  // No input parameters for rental endpoint
});

export type RentalInput = z.infer<typeof rentalSchema>;
export type RentalOutput = {
  status: "ok";
  message: string;
};