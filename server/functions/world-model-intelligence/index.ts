import { onRequest } from "firebase-functions/v2/https";
import { worldModelIntelligenceSchema } from "./schema";
import type { Request, Response } from "express";

export const worldModelIntelligenceHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "World‑model‑intelligence endpoint reached",
    });
  }
);

export const worldModelIntelligenceExpress = async (_req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "World‑model‑intelligence endpoint reached",
  });
};