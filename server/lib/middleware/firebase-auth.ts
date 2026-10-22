import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database';
import { UserService } from '../services/user.service';

const userService = new UserService(prisma);

/**
 * Lazy-initialized Firebase Admin Auth verifier.
 * Adheres to Non-Blocking Infrastructure Initialization.
 */
let firebaseAdminAuth: any = null;
let firebaseInitialized = false;

async function getFirebaseAuthInstance() {
  if (firebaseInitialized) return firebaseAdminAuth;
  firebaseInitialized = true;

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      // Dynamic import to avoid hard crash if firebase-admin is not yet installed in dev
      const admin = await import('firebase-admin' as any).catch(() => null);
      if (admin && !admin.default.apps.length) {
        const credentials = JSON.parse(serviceAccountKey);
        admin.default.initializeApp({
          credential: admin.default.credential.cert(credentials),
        });
        firebaseAdminAuth = admin.default.auth();
      }
    }
  } catch (error) {
    console.warn('[FirebaseAuth] Warning: Firebase Admin failed to initialize lazily:', error);
    firebaseAdminAuth = null;
  }

  return firebaseAdminAuth;
}

/**
 * Unified Authentication Middleware
 * Firebase ID tokens are the ONLY accepted credential — Firebase Auth is the
 * single source of truth for identity.
 * Auto-provisions / syncs Firebase authenticated users to Cloud SQL PostgreSQL.
 */
export async function unifiedAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_AUTHORIZATION_HEADER',
        message: 'Bearer token is required for authentication',
      },
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1].trim();
  const authInstance = await getFirebaseAuthInstance();

  // Attempt 1: Verify as Firebase ID Token if Firebase Admin is configured
  if (authInstance) {
    try {
      const decoded = await authInstance.verifyIdToken(token);
      if (decoded && decoded.uid) {
        // Sync or retrieve user in Cloud SQL PostgreSQL.
        // The Firebase UID is the authoritative primary key, and a first-time
        // signer-in is provisioned on demand with safe defaults (role=USER).
        const names = (decoded.name || 'Feex User').split(' ');
        const dbUser = await userService.findOrCreateFirebaseUser({
          firebaseUid: decoded.uid,
          email: decoded.email,
          firstName: names[0] || null,
          lastName: names.slice(1).join(' ') || null,
          profileImageUrl: decoded.picture ?? null,
          emailVerified: Boolean(decoded.email_verified),
        });

        req.user = {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          role: dbUser.role,
          emailVerified: dbUser.emailVerified,
          profileImageUrl: dbUser.profileImageUrl,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
          lastLoginAt: dbUser.lastLoginAt,
        };

        return next();
      }
    } catch {
      // Fall through to standard JWT verification
    }
  }

  // Firebase Auth is the single source of truth for identity. The legacy
  // platform-JWT fallback was removed — only Firebase ID tokens are accepted.
  res.status(401).json({
    success: false,
    error: {
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired Firebase ID token',
    },
  });
  return;
}
