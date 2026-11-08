import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";

export const analyticsHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Analytics endpoint reached",
    });
  }
);

export const analyticsExpress = async (_req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Analytics endpoint reached",
  });
};