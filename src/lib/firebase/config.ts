import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";

/**
 * Firebase bootstrap (PRD §71 — lib/firebase/config.ts).
 *
 * 1. Copy .env.local.example → .env.local
 * 2. Paste your Firebase web app config (see FIREBASE_SETUP.md)
 * 3. Restart `npm run dev`
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function firebaseSetupHint(): string {
  return (
    "Firebase is not configured yet. Copy .env.local.example to .env.local, paste your " +
    "Firebase web app config (Firebase Console → Project Settings → General → Your apps), " +
    "then restart the dev server. Full walkthrough: FIREBASE_SETUP.md"
  );
}
