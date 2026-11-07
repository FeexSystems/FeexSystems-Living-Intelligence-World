import { z } from "zod";

export const paystackSchema = z.object({
  // No input parameters for paystack endpoint (payment events webhook)
});

export type PaystackInput = z.infer<typeof paystackSchema>;
export type PaystackOutput = {
  status: "ok";
  message: string;
};