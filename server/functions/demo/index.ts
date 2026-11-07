import { onRequest } from "firebase-functions/v2/https";
import { demoSchema } from "./schema";
import type { Request, Response } from "express";

// Zod validation middleware – no inputs required for demo
function validateDemo(req: Request, res: Response, next: Function) {
  // schema has no fields, just proceed
  next();
}

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
export const demoExpress = async (req: Request, res: Response) => {
  // Zod validation – schema defined above (no params)
  res.json({
    status: "ok",
    message: "Demo endpoint reached",
  });
};