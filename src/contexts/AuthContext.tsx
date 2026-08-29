"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import type { UserProfile } from "@/types";
import { authErrorMessage, ensureUserProfile, getAuthInstance, sendResetEmail, signInWithEmail, signInWithGoogle, signOutUser, signUpWithEmail } from "@/lib/firebase/auth";
import { getDb } from "@/lib/firebase/firestore";

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
    let unsubProfile: (() => void) | undefined;
    const unsub = onAuthStateChanged(getAuthInstance(), async (u) => {
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
    return () => {
      unsubProfile?.();
      unsub();
    };
  }, []);

  const api = useMemo<AuthApi>(
    () => ({
      user,
      profile,
      loading,
      async signUp(name, email, password) {
        try {
          await signUpWithEmail(name, email, password);
        } catch (e) {
          throw new FriendlyAuthError(authErrorMessage((e as { code?: string }).code ?? ""));
        }
      },
      async login(email, password) {
        try {
          await signInWithEmail(email, password);
        } catch (e) {
          throw new FriendlyAuthError(authErrorMessage((e as { code?: string }).code ?? ""));
        }
      },
      async loginWithGoogle() {
        try {
          await signInWithGoogle();
        } catch (e) {
          throw new FriendlyAuthError(authErrorMessage((e as { code?: string }).code ?? ""));
        }
      },
      async logout() {
        await signOutUser();
      },
      async resetPassword(email) {
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
