"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import type { UserProfile } from "@/types";
import { authErrorMessage, ensureUserProfile, getAuthInstance, sendResetEmail, signInWithEmail, signInWithGoogle, signOutUser, signUpWithEmail } from "@/lib/firebase/auth";
import { getDb } from "@/lib/firebase/firestore";
import { isFirebaseConfigured, firebaseSetupHint } from "@/lib/firebase/config";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean; // auth + profile resolution in flight
}

interface AuthApi extends AuthState {
  signUp: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    let unsubProfile: (() => void) | undefined;
    let unsubAuth: (() => void) | undefined;
    try {
      unsubAuth = onAuthStateChanged(getAuthInstance(), async (u) => {
        unsubProfile?.();
        setUser(u);
        if (u) {
          try {
            await ensureUserProfile(u);
          } catch {
            /* profile ensured on next tick; read may still succeed */
          }
          unsubProfile = onSnapshot(
            doc(getDb(), "users", u.uid),
            (snap) => {
              setProfile(snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null);
              setLoading(false);
            },
            () => setLoading(false)
          );
        } else {
          setProfile(null);
          setLoading(false);
        }
      });
    } catch {
      setLoading(false);
    }
    return () => {
      unsubProfile?.();
      unsubAuth?.();
    };
  }, []);

  const api = useMemo<AuthApi>(
    () => ({
      user,
      profile,
      loading,
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
    [user, profile, loading]
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}
