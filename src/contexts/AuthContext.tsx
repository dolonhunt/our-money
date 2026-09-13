"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import type { UserProfile } from "@/types";
import { authErrorMessage, ensureUserProfile, getAuthInstance, sendResetEmail, signInWithEmail, signInWithGoogle, signOutUser, signUpWithEmail } from "@/lib/firebase/auth";
import { getDb } from "@/lib/firebase/firestore";
import { isFirebaseConfigured, firebaseSetupHint } from "@/lib/firebase/config";

export type ProfileStatus = "idle" | "loading" | "missing" | "loaded" | "error";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean; // auth + profile resolution in flight
  authLoading: boolean;
  profileLoading: boolean;
  profileStatus: ProfileStatus;
  profileError: Error | null;
}

interface AuthApi extends AuthState {
  signUp: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthApi | null>(null);

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export class FriendlyAuthError extends Error {}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [profileError, setProfileError] = useState<Error | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refreshProfile = () => {
    setRefreshNonce((n) => n + 1);
  };

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      setProfileLoading(false);
      setProfileStatus("missing");
      return;
    }
    let unsubProfile: (() => void) | undefined;
    let unsubAuth: (() => void) | undefined;
    try {
      unsubAuth = onAuthStateChanged(getAuthInstance(), (u) => {
        unsubProfile?.();
        setUser(u);
        setAuthLoading(false);
        if (u) {
          setProfileLoading(true);
          setProfileStatus("loading");
          setProfileError(null);

          ensureUserProfile(u).catch(() => {
            /* profile ensured on next tick; read may still succeed */
          });

          unsubProfile = onSnapshot(
            doc(getDb(), "users", u.uid),
            (snap) => {
              if (snap.exists()) {
                setProfile({ uid: snap.id, ...snap.data() } as UserProfile);
                setProfileStatus("loaded");
              } else {
                setProfile(null);
                setProfileStatus("missing");
              }
              setProfileLoading(false);
              setProfileError(null);
            },
            (err) => {
              console.error("Profile listener error:", err);
              setProfileError(err);
              setProfileStatus("error");
              setProfileLoading(false);
            }
          );
        } else {
          setProfile(null);
          setProfileStatus("idle");
          setProfileLoading(false);
          setProfileError(null);
        }
      });
    } catch {
      setAuthLoading(false);
      setProfileLoading(false);
    }
    return () => {
      unsubProfile?.();
      unsubAuth?.();
    };
  }, [refreshNonce]);

  const api = useMemo<AuthApi>(
    () => ({
      user,
      profile,
      loading: authLoading || profileLoading,
      authLoading,
      profileLoading,
      profileStatus,
      profileError,
      refreshProfile,
      async signUp(name, email, password) {
        if (!isFirebaseConfigured) throw new FriendlyAuthError(firebaseSetupHint());
        try {
          await signUpWithEmail(name, email, password);
        } catch (e) {
          throw new FriendlyAuthError(authErrorMessage((e as { code?: string }).code ?? ""));
        }
      },
      async login(email, password) {
        if (!isFirebaseConfigured) throw new FriendlyAuthError(firebaseSetupHint());
        try {
          await signInWithEmail(email, password);
        } catch (e) {
          throw new FriendlyAuthError(authErrorMessage((e as { code?: string }).code ?? ""));
        }
      },
      async loginWithGoogle() {
        if (!isFirebaseConfigured) throw new FriendlyAuthError(firebaseSetupHint());
        try {
          await signInWithGoogle();
        } catch (e) {
          throw new FriendlyAuthError(authErrorMessage((e as { code?: string }).code ?? ""));
        }
      },
      async logout() {
        if (!isFirebaseConfigured) return;
        await signOutUser();
      },
      async resetPassword(email) {
        if (!isFirebaseConfigured) throw new FriendlyAuthError(firebaseSetupHint());
        try {
          await sendResetEmail(email);
        } catch (e) {
          throw new FriendlyAuthError(authErrorMessage((e as { code?: string }).code ?? ""));
        }
      },
    }),
    [user, profile, authLoading, profileLoading, profileStatus, profileError]
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}
