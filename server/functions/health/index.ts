import { onRequest } from "firebase-functions/v2/https";
import { healthSchema } from "./schema";
import type { Request, Response } from "express";

function validateHealth(req: Request, res: Response, next: Function) {
  // no params, proceed
  next();
}

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

export const healthExpress = async (req: Request, res: Response) => {
  // Zod validation – schema defined above (no params)
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
};