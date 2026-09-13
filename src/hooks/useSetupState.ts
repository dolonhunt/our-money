"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import type { SetupState } from "@/lib/auth/setupState";

/**
 * Single source of truth for resolved authentication and household setup state.
 * Shared by login, onboarding guard, protected app layout, and root router.
 */
export function useSetupState() {
  const { user, profile, loading: authLoading, logout } = useAuth();
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
    error,
    retry,
  } = useHousehold();

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
    householdLoading,
    loading: setupState === "loading",
    error,
    retry,
    logout,
  };
}

export type { SetupState };
