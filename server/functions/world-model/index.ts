import { onRequest } from "firebase-functions/v2/https";
import { worldModelSchema } from "./schema";
import type { Request, Response } from "express";

export const worldModelHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "World‑model endpoint reached",
    });
  }
);

export const worldModelExpress = async (_req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "World‑model endpoint reached",
  });
};