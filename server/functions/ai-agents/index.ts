import { onRequest } from "firebase-functions/v2/https";
import { aiAgentsSchema } from "./schema";
import type { Request, Response } from "express";

export const aiAgentsHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "AI‑agents endpoint reached",
    });
  }
);

export const aiAgentsExpress = async (req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "AI‑agents endpoint reached",
  });
};