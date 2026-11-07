import { onRequest } from "firebase-functions/v2/https";
import { omniCommandSchema } from "./schema";
import type { Request, Response } from "express";

function validateOmniCommand(req: Request, res: Response, next: Function) {
  // Basic Zod validation – schema defined above
  partial(next);
}

export const omniCommandHandler = onRequest(
  {
    region: "us-central1",
  },
  async (req, res) => {
    // Validate using Zod (simple check)
    const result = omniCommandSchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: "Invalid command", details: result.error.format });
      return;
    }
    const { command, payload } = result.data;
    // Placeholder processing
    res.json({
      status: "processed",
      result: { command, payload },
    });
  }
);

export const omniCommandExpress = async (req: Request, res: Response) => {
  // Zod validation
  const result = omniCommandSchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: "Invalid command", details: result.error.format });
    return;
  }
  const { command, payload } = result.data;
  res.json({
    status: "processed",
    result: { command, payload },
  });
};