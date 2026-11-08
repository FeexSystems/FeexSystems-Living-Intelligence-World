import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";

export const knowledgeHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Knowledge endpoint reached",
    });
  }
);

export const knowledgeExpress = async (_req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Knowledge endpoint reached",
  });
};