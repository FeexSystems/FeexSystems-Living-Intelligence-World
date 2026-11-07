import { onRequest } from "firebase-functions/v2/https";
import { operationsSchema } from "./schema";
import type { Request, Response } from "express";

export const operationsHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Operations endpoint reached",
    });
  }
);

export const operationsExpress = async (req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Operations endpoint reached",
  });
};