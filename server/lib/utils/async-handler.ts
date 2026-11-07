import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wrap an async express handler so rejections are caught and mapped to a
 * JSON error response instead of crashing the process or hanging the client.
 *
 * The default response shape matches the platform convention:
 *   { success: false, error: "<message>" }
 * with a configurable status code (default 500).
 */
export function asyncHandler(
  handler: (req: Request, res: Response) => Promise<unknown>,
  opts: { status?: number; fallbackMessage?: string } = {}
): RequestHandler {
  const { status = 500, fallbackMessage = "Internal server error" } = opts;
  return (req: Request, res: Response, _next: NextFunction) => {
    Promise.resolve(handler(req, res)).catch((error: unknown) => {
      // Response may already be partially sent (e.g. streaming) — never crash.
      if (res.headersSent) {
        try {
          res.end();
        } catch {
          /* ignore */
        }
        return;
      }
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : fallbackMessage,
      });
    });
  };
}
