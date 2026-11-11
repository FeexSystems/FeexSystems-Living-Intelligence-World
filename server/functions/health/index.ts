import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";

export const healthHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }
);

export const healthExpress = async (_req: Request, res: Response) => {
  // Zod validation – schema defined above (no params)
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
};