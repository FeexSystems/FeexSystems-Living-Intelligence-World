import { z } from "zod";

export const subscriptionsSchema = z.object({
  // No input parameters for subscriptions endpoint
});

export type SubscriptionsInput = z.infer<typeof subscriptionsSchema>;
export type SubscriptionsOutput = {
  status: "ok";
  message: string;
};