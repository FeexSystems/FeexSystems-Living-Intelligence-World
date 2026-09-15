/**
 * FeexSystems — Firebase Client SDK
 *
 * Provides Firebase Authentication and Remote Config.
 * All auth state is managed through Firebase Auth (no custom JWT).
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  onIdTokenChanged,
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
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
);

// Initialize Firebase (singleton)
let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

// Auth instance
export const firebaseAuth = isFirebaseConfigured ? getAuth(getFirebaseApp()) : null;

// Remote Config
let remoteConfigInitialized = false;
let activeRemoteConfig: RemoteConfigValues = { ...DEFAULT_REMOTE_CONFIG };

export async function initializeRemoteConfig(): Promise<void> {
  if (!isFirebaseConfigured || remoteConfigInitialized) return;

  try {
    const rc = getRemoteConfig(getFirebaseApp());
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

export type { User };
export { firebaseConfig };