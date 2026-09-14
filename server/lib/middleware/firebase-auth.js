
import { UserRole } from '@prisma/client';
import { prisma } from '../database';
import { JWTService } from '../auth';
import * as crypto from 'crypto';

/**
 * Lazy-initialized Firebase Admin Auth verifier.
 * Adheres to Non-Blocking Infrastructure Initialization.
 */
let firebaseAdminAuth = null;
let firebaseInitialized = false;

async function getFirebaseAuthInstance() {
  if (firebaseInitialized) return firebaseAdminAuth;
  firebaseInitialized = true;

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      // Dynamic import to avoid hard crash if firebase-admin is not yet installed in dev
      const admin = await import('firebase-admin' ).catch(() => null);
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
 * Supports both Firebase ID Tokens and standard platform JWTs.
 * Auto-provisions / syncs Firebase authenticated users to Cloud SQL PostgreSQL.
 */
export async function unifiedAuthMiddleware(
  req,
  res,
  next
) {
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
        // Sync or retrieve user in Cloud SQL PostgreSQL
        let dbUser = await prisma.user.findUnique({
          where: { email: decoded.email || `${decoded.uid}@firebase.feexsystems.internal` },
        });

        if (!dbUser) {
          const names = (decoded.name || 'Feex User').split(' ');
          dbUser = await prisma.user.create({
            data: {
              id: crypto.randomUUID(),
              email: decoded.email || `${decoded.uid}@firebase.feexsystems.internal`,
              passwordHash: 'FIREBASE_AUTH_MANAGED',
              firstName: names[0] || 'Feex',
              lastName: names.slice(1).join(' ') || 'Explorer',
              role: UserRole.USER,
              emailVerified: Boolean(decoded.email_verified),
            },
          });
        }

        req.user = {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          role: dbUser.role,
          emailVerified: dbUser.emailVerified,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
          lastLoginAt: dbUser.lastLoginAt,
        };

        return next();
      }
    } catch (e) {
      // Fall through to standard JWT verification
    }
  }

  // Attempt 2: Standard platform JWT verification
  try {
    const payload = JWTService.verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User account no longer exists' },
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };

    return next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token',
      },
    });
    return;
  }
}
