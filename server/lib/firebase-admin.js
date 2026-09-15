/**
 * Firebase Admin SDK — Server-side token verification
 *
 * Verifies Firebase ID tokens sent from the client.
 * Maps Firebase UID to Prisma user roles via custom claims or database lookup.
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth, } from 'firebase-admin/auth';

let firebaseAdminApp = null;

/**
 * Initialize Firebase Admin SDK
 */
function getFirebaseAdmin() {
  if (firebaseAdminApp) return firebaseAdminApp;

  try {
    // Try to initialize with application default credentials (Cloud Run, GCE)
    firebaseAdminApp = initializeApp({
      credential: applicationDefault(),
    });
  } catch (e) {
    // Fallback: try with service account file
    try {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccount) {
        const parsed = JSON.parse(serviceAccount);
        firebaseAdminApp = initializeApp({
          credential: cert(parsed),
        });
      }
    } catch (e2) {
      // Firebase Admin not configured — graceful fallback
    }
  }

  return firebaseAdminApp;
}

export const isFirebaseAdminConfigured = () => {
  try {
    getFirebaseAdmin();
    return true;
  } catch (e3) {
    return false;
  }
};

/**
 * Verify a Firebase ID token and return decoded claims
 */
export async function verifyFirebaseToken(idToken) {
  const app = getFirebaseAdmin();
  return getAuth(app).verifyIdToken(idToken);
}

/**
 * Get Firebase user by UID
 */
export async function getFirebaseUser(uid) {
  try {
    const app = getFirebaseAdmin();
    return await getAuth(app).getUser(uid);
  } catch (e4) {
    return null;
  }
}

/**
 * Set custom claims on a Firebase user (for role management)
 */
export async function setFirebaseCustomClaims(uid, claims) {
  const app = getFirebaseAdmin();
  await getAuth(app).setCustomUserClaims(uid, claims);
}

/**
 * Delete a Firebase user
 */
export async function deleteFirebaseUser(uid) {
  const app = getFirebaseAdmin();
  await getAuth(app).deleteUser(uid);
}
