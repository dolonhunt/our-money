"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import type { SetupState } from "@/lib/auth/setupState";

/**
 * Single source of truth for resolved authentication and household setup state.
 * Shared by login, onboarding guard, protected app layout, and root router.
 */
export function useSetupState() {
  const {
    user,
    profile,
    authLoading,
    profileLoading,
    profileStatus,
    profileError,
    refreshProfile,
    logout,
  } = useAuth();
  const {
    householdId,
    household,
    members,
    categories,
    accounts,
    me,
    partner,
    loading: householdLoading,
    setupState,
    error: householdError,
    dataLoading,
    dataError,
    retry: retryHousehold,
  } = useHousehold();

  const retry = () => {
    refreshProfile();
    retryHousehold();
  };

  return {
    setupState,
    user,
    profile,
    householdId,
    household,
    members,
    categories,
    accounts,
    me,
    partner,
    authLoading,
    profileLoading,
    profileStatus,
    profileError,
    householdLoading,
    dataLoading,
    dataError,
    loading: setupState === "loading",
    error: householdError || profileError,
    retry,
    logout,
  };
}

export type { SetupState };
