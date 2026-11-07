import { onRequest } from "firebase-functions/v2/https";
import { marketingSchema } from "./schema";
import type { Request, Response } from "express";

export const marketingHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Marketing endpoint reached",
    });
  }
);

export const marketingExpress = async (req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Marketing endpoint reached",
  });
};