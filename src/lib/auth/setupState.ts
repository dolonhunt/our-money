export type SetupState =
  | "loading"
  | "unauthorized"
  | "needs_profile"
  | "needs_household"
  | "complete"
  | "error";

export type ProfileStatus = "idle" | "loading" | "missing" | "loaded" | "error";

export interface ResolveSetupStateParams {
  authLoading: boolean;
  user: { uid: string } | null;
  profileLoading?: boolean;
  profileStatus?: ProfileStatus;
  profile: { uid: string; householdId?: string | null } | null;
  householdLoading: boolean;
  household: { id: string; ownerUid: string } | null;
  members: Array<{ uid: string; role?: string }>;
  error?: Error | string | null;
  profileError?: Error | string | null;
}

/**
 * Pure, deterministic resolver for application setup and membership state.
 * Prevents race conditions from partially loaded Firebase listeners or stale local state.
 *
 * Rules:
 * - error: network/permission/listener failure; safe error state. Do not redirect. Do not mutate Firestore.
 * - loading: auth/profile/household/membership unresolved; render skeleton only.
 * - unauthorized: redirect /login.
 * - needs_profile: verified authenticated user without profile (lookup completed and confirmed missing); redirect /onboarding.
 * - needs_household: verified profile loaded and no active household membership; redirect /onboarding.
 * - complete: profile + household + active membership + valid role verified.
 */
export function resolveSetupState(params: ResolveSetupStateParams): SetupState {
  const {
    authLoading,
    user,
    profileLoading,
    profileStatus,
    profile,
    householdLoading,
    household,
    members,
    error,
    profileError,
  } = params;

  // 1. Network / permission / listener failure
  if (error || profileError || profileStatus === "error") {
    return "error";
  }

  // 2. Firebase auth is still resolving
  if (authLoading) {
    return "loading";
  }

  // 3. Unauthenticated
  if (!user) {
    return "unauthorized";
  }

  // 4. Profile is still resolving / loading / unresolved
  if (profileLoading === true || profileStatus === "loading" || profileStatus === "idle") {
    return "loading";
  }

  // 5. Authenticated user without profile document
  if (!profile) {
    // Only return "needs_profile" if profile lookup has completed and confirmed missing
    if (profileStatus === "missing" || (profileStatus === undefined && profileLoading === false)) {
      return "needs_profile";
    }
    // Profile is still unresolved
    return "loading";
  }

  // 6. User profile has no household linked
  if (!profile.householdId) {
    return "needs_household";
  }

  // 7. User has a householdId on their profile, but household document/members are still resolving
  if (householdLoading) {
    return "loading";
  }

  // 8. Subscriptions settled: verify household document actually exists
  if (!household) {
    return "needs_household";
  }

  // 9. Verify active membership record exists
  const userMember = members.find((m) => m.uid === user.uid);
  if (!userMember) {
    return "needs_household";
  }

  // 9. Verify valid role ("owner" or "member")
  const role = userMember.role;
  if (role !== "owner" && role !== "member") {
    return "needs_household";
  }

  // 10. If role is owner, verify user is household ownerUid
  if (role === "owner" && household.ownerUid !== user.uid) {
    return "needs_household";
  }

  // 11. Fully resolved and authorized
  return "complete";
}

/**
 * Determines the target route for a given setup state.
 * Returns null if the user is in the correct place, still loading, or in safe error state.
 */
export function getRouteForSetupState(
  state: SetupState,
  currentPath: string
): string | null {
  if (state === "loading" || state === "error") {
    return null;
  }

  if (state === "unauthorized") {
    const isPublicAuthRoute =
      currentPath === "/login" ||
      currentPath === "/signup" ||
      currentPath === "/forgot-password";
    return isPublicAuthRoute ? null : "/login";
  }

  if (state === "needs_profile" || state === "needs_household") {
    if (currentPath === "/onboarding" || currentPath === "/join") {
      return null;
    }
    return "/onboarding";
  }

  if (state === "complete") {
    const isOnboardingOrAuth =
      currentPath === "/login" ||
      currentPath === "/signup" ||
      currentPath === "/forgot-password" ||
      currentPath === "/" ||
      currentPath === "/onboarding";
    return isOnboardingOrAuth ? "/dashboard" : null;
  }

  return null;
}
