import { onRequest } from "firebase-functions/v2/https";
import { pingSchema } from "./schema";
import type { Request, Response } from "express";

// Validation middleware using Zod
function validateZod(schema: ReturnType<typeof pingSchema._def._safeParse>) {
  // Since ping has no inputs, we just pass through
  return async (req: Request, res: Response, next: Function) => {
    next();
  };
}

export const pingHandler = onRequest(
  {
    // expose as https://<project>.cloudfunctions.net/api/ping
    region: "us-central1",
  },
  async (_req, res) => {
    // Respond with the standard ping message
    res.json({
      message: "Hello from FeexSystems Living Intelligence Platform!",
    });
  }
);

// Export also an Express-compatible handler for local dev / Express server
export const pingExpress = async (req: import("express").Request, res: import("express").Response) => {
  // Zod validation – no params required, so just proceed
  res.json({
    message: "Hello from FeexSystems Living Intelligence Platform!",
  });
};