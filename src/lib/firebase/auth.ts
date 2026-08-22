import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  type Auth,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import type { NotificationPrefs, Role, UserProfile } from "@/types";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { getDb } from "./firestore";
import { getFirebaseApp } from "./config";

export function getAuthInstance(): Auth {
  return getAuth(getFirebaseApp());
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  partnerActivity: true,
  budgetAlerts: true,
  billReminders: true,
  goalUpdates: true,
};

/** Create the users/{uid} profile doc on first login (idempotent). */
export async function ensureUserProfile(user: User): Promise<void> {
  const ref = doc(getDb(), "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    // keep auth display name / photo in sync if changed
    const data = snap.data() as UserProfile;
    if (data.displayName !== (user.displayName ?? data.displayName)) {
      await updateDoc(ref, {
        displayName: user.displayName ?? data.displayName,
        photoURL: user.photoURL ?? data.photoURL ?? null,
        updatedAt: serverTimestamp(),
      }).catch(() => undefined);
    }
    return;
  }
  const profile: Omit<UserProfile, "createdAt" | "updatedAt"> & { createdAt: ReturnType<typeof serverTimestamp>; updatedAt: ReturnType<typeof serverTimestamp> } = {
    uid: user.uid,
    displayName: user.displayName ?? user.email?.split("@")[0] ?? "Partner",
    email: user.email ?? "",
    photoURL: user.photoURL ?? null,
    householdId: null,
    role: null,
    currency: DEFAULT_CURRENCY,
    country: "",
    phone: "",
    timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
    notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
}

export async function signUpWithEmail(name: string, email: string, password: string): Promise<User> {
  const auth = getAuthInstance();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(getAuthInstance(), email, password);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(getAuthInstance(), provider);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(getAuthInstance());
}

export async function sendResetEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(getAuthInstance(), email);
}

export interface ProfilePatch {
  displayName?: string;
  photoURL?: string | null;
  phone?: string;
  currency?: string;
  country?: string;
  timezone?: string;
  notificationPrefs?: NotificationPrefs;
}

export async function updateUserProfile(uid: string, patch: ProfilePatch): Promise<void> {
  await updateDoc(doc(getDb(), "users", uid), { ...patch, updatedAt: serverTimestamp() });
}

export async function setUserHousehold(uid: string, householdId: string | null, role: Role | null): Promise<void> {
  await updateDoc(doc(getDb(), "users", uid), { householdId, role, updatedAt: serverTimestamp() });
}

/** Friendly auth error messages (PRD §55 — never surface raw Firebase errors). */
export function authErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google popup. Allow popups and retry.";
    case "auth/network-request-failed":
      return "Network problem. Check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
