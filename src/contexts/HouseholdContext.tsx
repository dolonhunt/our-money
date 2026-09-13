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
  dataLoading?: boolean;
  dataError?: Error | null;
  retry: () => void;
}

const HouseholdContext = createContext<HouseholdState | null>(null);

export function useHousehold(): HouseholdState {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useHousehold must be used within HouseholdProvider");
  return ctx;
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, profile, authLoading, profileLoading, profileStatus, profileError } = useAuth();
  const householdId = profile?.householdId ?? null;
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Setup resolution state (household doc + active membership)
  const [loadedHouseholdId, setLoadedHouseholdId] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<Error | null>(null);

  // Application data state (categories + accounts)
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<Error | null>(null);

  const [retryNonce, setRetryNonce] = useState(0);

  const retry = () => {
    setSetupError(null);
    setDataError(null);
    setLoadedHouseholdId(null);
    setSetupLoading(true);
    setRetryNonce((n) => n + 1);
  };

  useEffect(() => {
    setHousehold(null);
    setMembers([]);
    setCategories([]);
    setAccounts([]);
    setLoadedHouseholdId(null);
    setSetupError(null);
    setDataError(null);

    if (!householdId) {
      setSetupLoading(false);
      setDataLoading(false);
      return;
    }

    setSetupLoading(true);
    setDataLoading(true);

    let householdSettled = false;
    let membersSettled = false;
    let hasSetupFailed = false;

    const checkSetupSettled = () => {
      if (householdSettled && membersSettled && !hasSetupFailed) {
        setLoadedHouseholdId(householdId);
        setSetupLoading(false);
      }
    };

    const handleSetupError = (err: Error) => {
      console.error("Household setup listener error:", err);
      hasSetupFailed = true;
      setSetupError(err);
      setSetupLoading(false);
    };

    // 1. Core setup listeners (required for setup completion)
    const unsubHousehold = subscribeHousehold(
      householdId,
      (h) => {
        setHousehold(h);
        householdSettled = true;
        markSynced();
        checkSetupSettled();
      },
      handleSetupError
    );

    const unsubMembers = subscribeMembers(
      householdId,
      (m) => {
        setMembers(m);
        membersSettled = true;
        markSynced();
        checkSetupSettled();
      },
      handleSetupError
    );

    // 2. Application data listeners (optional; failure MUST NOT block setup completion)
    let categoriesSettled = false;
    let accountsSettled = false;
    const checkDataSettled = () => {
      if (categoriesSettled && accountsSettled) {
        setDataLoading(false);
      }
    };

    const unsubCategories = subscribeCategories(
      householdId,
      (c) => {
        setCategories(c.filter((x) => !x.archived));
        categoriesSettled = true;
        markSynced();
        checkDataSettled();
      },
      (err) => {
        console.warn("Categories listener error (non-blocking):", err);
        categoriesSettled = true;
        setDataError(err);
        checkDataSettled();
      }
    );

    const unsubAccounts = subscribeAccounts(
      householdId,
      (a) => {
        setAccounts(a.filter((x) => !x.archived));
        accountsSettled = true;
        markSynced();
        checkDataSettled();
      },
      (err) => {
        console.warn("Accounts listener error (non-blocking):", err);
        accountsSettled = true;
        setDataError(err);
        checkDataSettled();
      }
    );

    return () => {
      unsubHousehold();
      unsubMembers();
      unsubCategories();
      unsubAccounts();
    };
  }, [householdId, retryNonce]);

  // Synchronously compute whether the current household setup is resolving
  const isHouseholdResolving = Boolean(householdId) && (setupLoading || loadedHouseholdId !== householdId);

  const setupState = useMemo<SetupState>(() => {
    return resolveSetupState({
      authLoading,
      user,
      profileLoading,
      profileStatus,
      profile,
      profileError,
      householdLoading: isHouseholdResolving,
      household,
      members,
      error: setupError,
    });
  }, [
    authLoading,
    user,
    profileLoading,
    profileStatus,
    profile,
    profileError,
    isHouseholdResolving,
    household,
    members,
    setupError,
  ]);

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
      error: setupError,
      dataLoading,
      dataError,
      retry,
    };
  }, [
    householdId,
    household,
    members,
    categories,
    accounts,
    isHouseholdResolving,
    profile?.uid,
    setupState,
    setupError,
    dataLoading,
    dataError,
  ]);

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export type { Household, HouseholdMember, UserProfile };
