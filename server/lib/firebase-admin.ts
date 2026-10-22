/**
 * Firebase Admin SDK — Server-side token verification
 *
 * Verifies Firebase ID tokens sent from the client.
 * Maps Firebase UID to Prisma user roles via custom claims or database lookup.
 */

import { App, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth, DecodedIdToken, UserRecord } from 'firebase-admin/auth';

let firebaseAdminApp: App | null = null;

/**
 * Initialize Firebase Admin SDK
 */
function getFirebaseAdmin(): App {
  if (firebaseAdminApp) return firebaseAdminApp;

  const appConfig = {
    databaseURL: "https://feexsystems-prod-508304-default-rtdb.firebaseio.com",
    projectId: "feexsystems-prod-508304"
  };

  try {
    // Try to initialize with application default credentials (Cloud Run, GCE)
    firebaseAdminApp = initializeApp({
      credential: applicationDefault(),
      ...appConfig
    });
  } catch {
    // Fallback: try with service account file
    try {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccount) {
        const parsed = JSON.parse(serviceAccount);
        firebaseAdminApp = initializeApp({
          credential: cert(parsed),
          ...appConfig
        });
      }
    } catch {
      // Firebase Admin not configured — graceful fallback
    }
  }

  return firebaseAdminApp!;
}

export const isFirebaseAdminConfigured = (): boolean => {
  try {
    getFirebaseAdmin();
    return true;
  } catch {
    return false;
  }
};

/**
 * Verify a Firebase ID token and return decoded claims
 */
export async function verifyFirebaseToken(idToken: string): Promise<DecodedIdToken> {
  const app = getFirebaseAdmin();
  return getAuth(app).verifyIdToken(idToken);
}

/**
 * Get Firebase user by UID
 */
export async function getFirebaseUser(uid: string): Promise<UserRecord | null> {
  try {
    const app = getFirebaseAdmin();
    return await getAuth(app).getUser(uid);
  } catch {
    return null;
  }
}

/**
 * Change a user's email address in Firebase Auth.
 *
 * Firebase owns identity, so the email on the local `users` row is only ever a
 * projection of the value stored here. Updating the database row alone would
 * leave the two out of sync — the next token refresh would restore the old
 * email — and would let a caller claim an email that Firebase has not
 * verified.
 */
export async function updateFirebaseUserEmail(uid: string, email: string): Promise<void> {
  const app = getFirebaseAdmin();
  await getAuth(app).updateUser(uid, { email });
}

/**
 * Set custom claims on a Firebase user (for role management)
 */
export async function setFirebaseCustomClaims(uid: string, claims: Record<string, unknown>): Promise<void> {
  const app = getFirebaseAdmin();
  await getAuth(app).setCustomUserClaims(uid, claims);
}

/**
 * Delete a Firebase user
 */
export async function deleteFirebaseUser(uid: string): Promise<void> {
  const app = getFirebaseAdmin();
  await getAuth(app).deleteUser(uid);
}
