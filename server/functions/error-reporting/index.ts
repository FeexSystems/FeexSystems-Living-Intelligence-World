import { onRequest } from "firebase-functions/v2/https";
import { errorReportingSchema } from "./schema";
import type { Request, Response } from "express";

export const errorReportingHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Error‑reporting endpoint reached",
    });
  }
);

export const errorReportingExpress = async (req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Error‑reporting endpoint reached",
  });
};