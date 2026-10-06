/**
 * FeexSystems — Firebase Client SDK
 *
 * Provides Firebase Authentication and Remote Config.
 * All auth state is managed through Firebase Auth (no custom JWT).
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
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
  type User,
} from 'firebase/auth';
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';

// Remote Config interface
export interface RemoteConfigValues {
  enable_live_voice: boolean;
  navigator_reasoning_depth: 'fast' | 'balanced' | 'deep';
  maintenance_mode: boolean;
  world_galaxy_particle_density: number;
}

export const DEFAULT_REMOTE_CONFIG: RemoteConfigValues = {
  enable_live_voice: true,
  navigator_reasoning_depth: 'balanced',
  maintenance_mode: false,
  world_galaxy_particle_density: 1200,
};

// Firebase configuration from environment variables or hardcoded prod fallback
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA5m9Wg5sT_8TARqAcnAG_OYzAu095SJxA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "feexsystems-prod-508304.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://feexsystems-prod-508304-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "feexsystems-prod-508304",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "feexsystems-prod-508304.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1098867692790",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1098867692790:web:d783cef6fb785038aac8d7",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5ZEXMX2835"
};

export const isFirebaseConfigured = true; // Always true now since we have defaults

// Initialize Firebase (singleton)
let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp | null {
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
let authInstance: ReturnType<typeof getAuth> | null = null;
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

export const db = authInstance && app ? getFirestore(app) : null;

// Remote Config
let remoteConfigInitialized = false;
let activeRemoteConfig: RemoteConfigValues = { ...DEFAULT_REMOTE_CONFIG };

export async function initializeRemoteConfig(): Promise<void> {
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
      navigator_reasoning_depth: getValue(rc, 'navigator_reasoning_depth').asString() as RemoteConfigValues['navigator_reasoning_depth'],
      maintenance_mode: getValue(rc, 'maintenance_mode').asBoolean(),
      world_galaxy_particle_density: getValue(rc, 'world_galaxy_particle_density').asNumber(),
    };
    remoteConfigInitialized = true;
  } catch {
    // Silently fall back to defaults
  }
}

export function useRemoteConfig(): RemoteConfigValues {
  return activeRemoteConfig;
}

export type { User };
export { firebaseConfig };