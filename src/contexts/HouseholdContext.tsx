"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Account, Category, Household, HouseholdMember, UserProfile } from "@/types";
import { subscribeHousehold, subscribeMembers } from "@/lib/firebase/households";
import { subscribeCategories } from "@/lib/firebase/categories";
import { subscribeAccounts } from "@/lib/firebase/accounts";
import { markSynced } from "@/lib/sync";
import { resolveSetupState, type SetupState } from "@/lib/auth/setupState";
import { useAuth } from "./AuthContext";

interface HouseholdState {
  householdId: string | null;
  household: Household | null;
  members: HouseholdMember[];
  categories: Category[];
  accounts: Account[];
  me: HouseholdMember | null;
  partner: HouseholdMember | null;
  memberUids: string[];
  loading: boolean;
  setupState: SetupState;
  error: Error | null;
  retry: () => void;
}

const HouseholdContext = createContext<HouseholdState | null>(null);

export function useHousehold(): HouseholdState {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useHousehold must be used within HouseholdProvider");
  return ctx;
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const householdId = profile?.householdId ?? null;
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadedHouseholdId, setLoadedHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const retry = () => {
    setError(null);
    setRetryNonce((n) => n + 1);
  };

  useEffect(() => {
    setHousehold(null);
    setMembers([]);
    setCategories([]);
    setAccounts([]);
    setLoadedHouseholdId(null);
    setError(null);

    if (!householdId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let settled = 0;
    let hasFailed = false;

    const done = () => {
      settled++;
      if (settled >= 4 && !hasFailed) {
        setLoadedHouseholdId(householdId);
        setLoading(false);
      }
    };

    const handleError = (err: Error) => {
      console.error("Household listener error:", err);
      hasFailed = true;
      setError(err);
      setLoading(false);
    };

    const unsubs: (() => void)[] = [
      subscribeHousehold(
        householdId,
        (h) => {
          setHousehold(h);
          markSynced();
          done();
        },
        handleError
      ),
      subscribeMembers(
        householdId,
        (m) => {
          setMembers(m);
          markSynced();
          done();
        },
        handleError
      ),
      subscribeCategories(
        householdId,
        (c) => {
          setCategories(c.filter((x) => !x.archived));
          markSynced();
          done();
        },
        handleError
      ),
      subscribeAccounts(
        householdId,
        (a) => {
          setAccounts(a.filter((x) => !x.archived));
          markSynced();
          done();
        },
        handleError
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [householdId, retryNonce]);

  // Synchronously compute whether the current householdId is resolving
  const isHouseholdResolving = Boolean(householdId) && (loading || loadedHouseholdId !== householdId);

  const setupState = useMemo<SetupState>(() => {
    return resolveSetupState({
      authLoading,
      user,
      profile,
      householdLoading: isHouseholdResolving,
      household,
      members,
      error,
    });
  }, [authLoading, user, profile, isHouseholdResolving, household, members, error]);

  const value = useMemo<HouseholdState>(() => {
    const me = members.find((m) => m.uid === profile?.uid) ?? null;
    const partner = members.find((m) => m.uid !== profile?.uid) ?? null;
    return {
      householdId,
      household,
      members,
      categories,
      accounts,
      me,
      partner,
      memberUids: members.map((m) => m.uid),
      loading: isHouseholdResolving,
      setupState,
      error,
      retry,
    };
  }, [householdId, household, members, categories, accounts, isHouseholdResolving, profile?.uid, setupState, error]);

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export type { Household, HouseholdMember, UserProfile };
