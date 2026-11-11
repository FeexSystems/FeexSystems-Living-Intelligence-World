import { onRequest } from "firebase-functions/v2/https";

// Ping takes no inputs, so there is nothing to validate — the schema module is
// intentionally not imported here.

export const pingHandler = onRequest(
  {
    // expose as https://<project>.cloudfunctions.net/api/ping
    region: "us-central1",
  },
  async (_req, res) => {
    // Respond with the standard ping message
    res.json({
      message: "Hello from FeexSystems Living Intelligence Platform!",
    });
  }
);

// Export also an Express-compatible handler for local dev / Express server
export const pingExpress = async (_req: import("express").Request, res: import("express").Response) => {
  // No params required, so just proceed.
  res.json({
    message: "Hello from FeexSystems Living Intelligence Platform!",
  });
};