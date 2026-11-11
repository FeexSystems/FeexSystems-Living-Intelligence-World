import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";

export const worldModelIntelligenceHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Worldâ€‘modelâ€‘intelligence endpoint reached",
    });
  }
);

export const worldModelIntelligenceExpress = async (_req: Request, res: Response) => {
  // Same logic as the Firebase handler â€“ works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Worldâ€‘modelâ€‘intelligence endpoint reached",
  });
};
