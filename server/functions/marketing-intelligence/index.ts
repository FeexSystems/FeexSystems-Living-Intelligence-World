import { onRequest } from "firebase-functions/v2/https";
import { marketingIntelligenceSchema } from "./schema";
import type { Request, Response } from "express";

export const marketingIntelligenceHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Marketing‑intelligence endpoint reached",
    });
  }
);

export const marketingIntelligenceExpress = async (_req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Marketing‑intelligence endpoint reached",
  });
};