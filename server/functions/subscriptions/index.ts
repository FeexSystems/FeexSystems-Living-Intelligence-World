import { onRequest } from "firebase-functions/v2/https";
import { subscriptionsSchema } from "./schema";
import type { Request, Response } from "express";

export const subscriptionsHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Subscriptions endpoint reached",
    });
  }
);

export const subscriptionsExpress = async (req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Subscriptions endpoint reached",
  });
};