import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";

export const marketingTelemetryHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "Marketingâ€‘telemetry endpoint reached",
    });
  }
);

export const marketingTelemetryExpress = async (_req: Request, res: Response) => {
  // Same logic as the Firebase handler â€“ works locally with `npm run start`
  res.json({
    status: "ok",
    message: "Marketingâ€‘telemetry endpoint reached",
  });
};
