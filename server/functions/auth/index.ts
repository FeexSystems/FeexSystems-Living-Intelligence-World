import { onRequest } from "firebase-functions/v2/https";
import { authSchema } from "./schema";
import type { Request, Response } from "express";

export const authHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Auth endpoint reached",
    });
  }
);

export const authExpress = async (req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Auth endpoint reached",
  });
};