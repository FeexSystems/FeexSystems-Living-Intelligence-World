import { onRequest } from "firebase-functions/v2/https";
import { worldModelTelemetryStreamSchema } from "./schema";
import type { Request, Response } from "express";

export const worldModelTelemetryStreamHandler = onRequest(
  {
    region: "us-central1",
  },
  async (_req, res) => {
    res.json({
      status: "ok",
      message: "World‑model‑telemetry‑stream endpoint reached",
    });
  }
);

export const worldModelTelemetryStreamExpress = async (req: Request, res: Response) => {
  // Same logic as the Firebase handler – works locally with `npm run start`
  res.json({
    status: "ok",
    message: "World‑model‑telemetry‑stream endpoint reached",
  });
};