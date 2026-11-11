import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";

export const demoHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Demo endpoint reached",
    });
  }
);

// Express‑compatible handler for local development
export const demoExpress = async (_req: Request, res: Response) => {
  // Zod validation – schema defined above (no params)
  res.json({
    status: "ok",
    message: "Demo endpoint reached",
  });
};