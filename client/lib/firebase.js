/**
 * FeexSystems — Firebase Client SDK
 *
 * Provides Firebase Authentication and Remote Config.
 * All auth state is managed through Firebase Auth (no custom JWT).
 */

import { initializeApp, } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  onIdTokenChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';

// Remote Config interface







export const DEFAULT_REMOTE_CONFIG = {
  enable_live_voice: true,
  navigator_reasoning_depth: 'balanced',
  maintenance_mode: false,
  world_galaxy_particle_density: 1200,
};

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey.startsWith('AIza') &&
  !firebaseConfig.apiKey.includes('dummy') &&
  firebaseConfig.authDomain &&
  !firebaseConfig.authDomain.includes('dummy') &&
  firebaseConfig.projectId
);

// Initialize Firebase (singleton)
let app = null;

function getFirebaseApp() {
  if (!isFirebaseConfigured) return null;
  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (err) {
      console.warn('[Firebase] SDK initialization failed gracefully:', err);
      return null;
    }
  }
  return app;
}

// Auth instance with safe lazy initialization
let authInstance = null;
if (isFirebaseConfigured) {
  try {
    const fbApp = getFirebaseApp();
    if (fbApp) {
      authInstance = getAuth(fbApp);
    }
  } catch (err) {
    console.warn('[Firebase Auth] Failed to initialize getAuth:', err);
    authInstance = null;
  }
}
export const firebaseAuth = authInstance;

// Remote Config
let remoteConfigInitialized = false;
let activeRemoteConfig = { ...DEFAULT_REMOTE_CONFIG };

export async function initializeRemoteConfig() {
  if (!isFirebaseConfigured || remoteConfigInitialized) return;

  try {
    const fbApp = getFirebaseApp();
    if (!fbApp) return;
    const rc = getRemoteConfig(fbApp);
    rc.settings = {
      minimumFetchIntervalMillis: 3600000, // 1 hour
      fetchTimeoutMillis: 60000,
    };
    await fetchAndActivate(rc);

    activeRemoteConfig = {
      enable_live_voice: getValue(rc, 'enable_live_voice').asBoolean(),
      navigator_reasoning_depth: getValue(rc, 'navigator_reasoning_depth').asString() ,
      maintenance_mode: getValue(rc, 'maintenance_mode').asBoolean(),
      world_galaxy_particle_density: getValue(rc, 'world_galaxy_particle_density').asNumber(),
    };
    remoteConfigInitialized = true;
  } catch (e) {
    // Silently fall back to defaults
  }
}

export function useRemoteConfig() {
  return activeRemoteConfig;
}

// Re-export Firebase Auth functions for convenience
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  onIdTokenChanged,
};

;
export { firebaseConfig };