import { onRequest } from "firebase-functions/v2/https";
import { usageSchema } from "./schema";
import type { Request, Response } from "express";

export const usageHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Usage endpoint reached",
    });
  }
);

export const usageExpress = async (req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Usage endpoint reached",
  });
};