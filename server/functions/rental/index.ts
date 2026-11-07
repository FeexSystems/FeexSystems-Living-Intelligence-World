import { onRequest } from "firebase-functions/v2/https";
import { rentalSchema } from "./schema";
import type { Request, Response } from "express";

export const rentalHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Rental endpoint reached",
    });
  }
);

export const rentalExpress = async (req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Rental endpoint reached",
  });
};