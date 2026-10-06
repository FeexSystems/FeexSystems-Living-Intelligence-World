import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';


export function applyProductionSecurity(app) {
  // Trust reverse proxy (Google Cloud Run / Firebase Hosting / Load Balancers)
  app.set('trust proxy', 1);

  // Use helmet for HTTP headers - configure CSP/COEP so WebGL shaders, Three.js canvases and fonts are allowed
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "blob:", "https://*"],
          connectSrc: ["'self'", "wss:", "ws:", "https://*"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'", "blob:", "https://*"],
          workerSrc: ["'self'", "blob:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS: allow configured origins.
  //
  // SECURITY: this used to default to `origin: true` when CORS_ORIGIN was
  // unset, which reflects whatever Origin the caller sends. Combined with
  // `credentials: true` that lets any website make credentialed cross-origin
  // requests. Fail closed instead: an explicit allow-list is required, and a
  // missing configuration is reported loudly rather than silently opened.
  const defaultOrigins = [
    'https://feexsystems-prod-508304.web.app',
    'https://feexsystems-prod-508304.firebaseapp.com',
    'https://feexsystems.codes',
    'https://www.feexsystems.codes',
    'http://localhost:8080',
    'http://localhost:3000'
  ];
  const configuredOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
    : defaultOrigins;

  if (!process.env.CORS_ORIGIN) {
    console.info(
      'ℹ️ CORS_ORIGIN not explicitly set. Using canonical FeexSystems production origins: ' +
      defaultOrigins.join(', ')
    );
  }

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin / server-to-server requests carry no Origin header.
        if (!origin) return callback(null, true);

        if (configuredOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Reject without throwing: a 500 here would mask the real problem and
        // leak a stack trace to the caller. CORS simply omits the header and
        // the browser blocks the response.
        return callback(null, false);
      },
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

/**
 * Auth Rate Limiter:
 * Protects auth endpoints against brute force and credential stuffing.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    default: false,
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: "Too many authentication requests, please try again later.",
      retryAfter: 900,
    });
  },
});
