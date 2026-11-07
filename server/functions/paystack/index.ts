import { onRequest } from "firebase-functions/v2/https";
import { paystackSchema } from "./schema";
import type { Request, Response } from "express";

export const paystackHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Paystack endpoint reached",
    });
  }
);

export const paystackExpress = async (req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Paystack endpoint reached",
  });
};