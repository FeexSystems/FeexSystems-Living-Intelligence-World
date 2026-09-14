import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';


export function applyProductionSecurity(app) {
  // Trust reverse proxy (Google Cloud Run / Firebase Hosting / Load Balancers)
  app.set('trust proxy', 1);

  // Use helmet for HTTP headers - disable CSP/COEP so WebGL shaders, Three.js canvases and fonts are never blocked
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS: allow configured origins
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : true;

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  // Rate limiting with validation check bypassed behind Cloud Run reverse proxy
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      validate: {
        xForwardedForHeader: false,
        default: false,
      },
    })
  );

  // Enforce HTTPS in production safely
  app.use((req, res, next) => {
    if (
      process.env.NODE_ENV === 'production' &&
      req.headers['x-forwarded-proto'] &&
      req.headers['x-forwarded-proto'] !== 'https'
    ) {
      return res.redirect(301, 'https://' + req.headers.host + req.url);
    }
    next();
  });
}

/**
 * Hard Query Rate Limiter:
 * Strictly limits expensive intelligence and evidence retrieval queries
 * (Omni Command, AI Navigator, Evidence Fabric) to 5 queries per 15-minute window.
 */
export const hardQueryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Exactly 5 queries max
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    default: false,
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: "Query rate limit exceeded. You have reached the maximum allowed 5 queries per 15-minute window for Omni Command, AI Navigator, and Evidence Fabric.",
      retryAfter: 900,
    });
  },
});

