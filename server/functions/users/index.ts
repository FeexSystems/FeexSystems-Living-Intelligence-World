import { onRequest } from "firebase-functions/v2/https";
import { usersSchema } from "./schema";
import type { Request, Response } from "express";

export const usersHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Users endpoint reached",
    });
  }
);

export const usersExpress = async (req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Users endpoint reached",
  });
};