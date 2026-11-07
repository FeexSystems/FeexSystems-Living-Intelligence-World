import { onRequest } from "firebase-functions/v2/https";
import { teamsSchema } from "./schema";
import type { Request, Response } from "express";

export const teamsHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Teams endpoint reached",
    });
  }
);

export const teamsExpress = async (req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Teams endpoint reached",
  });
};